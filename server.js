const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');
const { createPool, initLeadSchema, insertLead } = require('./db');

loadEnvFile(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const BASE_DIR = __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.jsonl');
const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();

const MIME_TYPES = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp'
};

const rateLimitStore = new Map();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 8;

const dbState = {
    configured: Boolean(DATABASE_URL),
    clientAvailable: false,
    ready: false,
    initError: null
};
let pgPool = null;
let dbInitPromise = Promise.resolve();

ensureDataDir();
configureDatabase();

const server = http.createServer(async (req, res) => {
    try {
        setSecurityHeaders(res);
        setCorsHeaders(req, res);

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

        if (req.method === 'GET' && parsedUrl.pathname === '/health') {
            return sendJson(res, 200, { ok: true, service: 'secureanno-web', timestamp: new Date().toISOString() });
        }

        if (req.method === 'POST' && parsedUrl.pathname === '/api/contact') {
            return handleContact(req, res);
        }

        if (req.method === 'GET' || req.method === 'HEAD') {
            return serveStatic(req, res, parsedUrl.pathname);
        }

        return sendJson(res, 405, { ok: false, message: 'Method not allowed.' });
    } catch (error) {
        console.error('Unhandled server error:', error);
        return sendJson(res, 500, { ok: false, message: 'Internal server error.' });
    }
});

server.listen(PORT, HOST, () => {
    const displayHost = HOST === '0.0.0.0' ? 'localhost' : HOST;
    console.log(`SecureAnno server running at http://${displayHost}:${PORT}`);
    if (dbState.configured) {
        console.log('DATABASE_URL detected. Lead inserts will be attempted for PostgreSQL.');
    } else {
        console.log('DATABASE_URL not set. Leads will be stored in data/leads.jsonl only.');
    }
});

async function handleContact(req, res) {
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
        return sendJson(res, 429, {
            ok: false,
            message: 'Too many submissions from this network. Please try again in a few minutes.'
        });
    }

    const body = await readJsonBody(req);
    if (!body) {
        return sendJson(res, 400, { ok: false, message: 'Invalid JSON payload.' });
    }

    if (String(body.website || '').trim() !== '') {
        return sendJson(res, 200, { ok: true, message: 'Thanks. We will be in touch soon.' });
    }

    const lead = normalizeLead(body, clientIp);
    const validationError = validateLead(lead);
    if (validationError) {
        return sendJson(res, 400, { ok: false, message: validationError });
    }

    const storage = await persistLead(lead);
    return sendJson(res, 200, {
        ok: true,
        message: storage.dbConfigured && !storage.dbSaved
            ? 'Inquiry received successfully. Local backup saved while database sync is unavailable.'
            : 'Inquiry received successfully.',
        storage
    });
}

function normalizeLead(body, clientIp) {
    return {
        id: crypto.randomUUID(),
        receivedAt: new Date().toISOString(),
        ip: clientIp,
        fullName: cleanText(body.fullName),
        email: cleanText(body.email).toLowerCase(),
        phone: cleanText(body.phone),
        company: cleanText(body.company),
        jobTitle: cleanText(body.jobTitle),
        country: cleanText(body.country),
        companySize: cleanText(body.companySize),
        serviceInterest: cleanText(body.serviceInterest),
        dataVolume: cleanText(body.dataVolume),
        projectDetails: cleanText(body.projectDetails),
        website: cleanText(body.website)
    };
}

function validateLead(lead) {
    if (!lead.fullName || lead.fullName.length < 2) return 'Please enter a valid full name.';
    if (!lead.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return 'Please enter a valid work email.';
    if (!lead.company || lead.company.length < 2) return 'Please enter a valid company name.';
    if (!lead.country || lead.country.length < 2) return 'Please enter a valid country.';
    if (!lead.serviceInterest) return 'Please select a service interest.';
    if (lead.projectDetails.length > 4000) return 'Project details are too long.';
    return null;
}

function cleanText(value) {
    return String(value || '').replace(/\r/g, '').trim();
}

async function persistLead(lead) {
    await appendLeadToFile(lead);
    const dbSaved = await appendLeadToDatabase(lead);
    return {
        fileSaved: true,
        dbConfigured: dbState.configured,
        dbSaved
    };
}

async function appendLeadToFile(lead) {
    const line = `${JSON.stringify(lead)}\n`;
    await fs.promises.appendFile(LEADS_FILE, line, 'utf8');
}

function configureDatabase() {
    if (!dbState.configured) {
        return;
    }

    dbState.clientAvailable = true;
    pgPool = createPool(DATABASE_URL);
    dbInitPromise = initLeadSchema(pgPool).then(() => {
        dbState.ready = true;
        console.log('PostgreSQL lead storage is ready.');
    }).catch(error => {
        dbState.initError = error;
        dbState.ready = false;
        console.error('PostgreSQL initialization failed:', error);
    });
}

async function appendLeadToDatabase(lead) {
    if (!dbState.configured || !dbState.clientAvailable || !pgPool) {
        return false;
    }

    await dbInitPromise;
    if (!dbState.ready) {
        return false;
    }

    try {
        await insertLead(pgPool, lead);
        return true;
    } catch (error) {
        console.error('Failed to save lead to PostgreSQL:', error);
        return false;
    }
}

async function serveStatic(req, res, pathname) {
    let requestedPath = pathname === '/' ? '/index.html' : pathname;
    requestedPath = decodeURIComponent(requestedPath);

    const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(BASE_DIR, safePath);
    const relativePath = path.relative(BASE_DIR, filePath);

    if (!filePath.startsWith(BASE_DIR) || isBlockedStaticPath(relativePath)) {
        return sendJson(res, 403, { ok: false, message: 'Forbidden.' });
    }

    try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
            return sendJson(res, 403, { ok: false, message: 'Forbidden.' });
        }

        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
        });

        if (req.method === 'HEAD') {
            return res.end();
        }

        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            return sendJson(res, 404, { ok: false, message: 'Not found.' });
        }
        throw error;
    }
}

function isBlockedStaticPath(relativePath) {
    if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        return true;
    }

    return relativePath
        .split(path.sep)
        .some(part => part.startsWith('.') || part === 'node_modules' || part === 'data' || part === 'logs');
}

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body)
    });
    res.end(body);
}

function setSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data:",
        "script-src 'self' 'unsafe-inline'",
        "connect-src 'self'",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'"
    ].join('; '));
}

function setCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (!origin) {
        return;
    }

    const configuredOrigins = String(process.env.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

    const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin);
    const isFileOrigin = origin === 'null';
    const isConfiguredOrigin = configuredOrigins.includes(origin);

    if (!isLocalhostOrigin && !isFileOrigin && !isConfiguredOrigin) {
        return;
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }

    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitStore.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS };

    if (now > entry.resetAt) {
        entry.count = 0;
        entry.resetAt = now + RATE_WINDOW_MS;
    }

    entry.count += 1;
    rateLimitStore.set(ip, entry);

    return entry.count <= RATE_LIMIT;
}

function ensureDataDir() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(LEADS_FILE)) {
        fs.writeFileSync(LEADS_FILE, '', 'utf8');
    }
}

function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) continue;

        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

        if (key && process.env[key] === undefined) {
            process.env[key] = value;
        }
    }
}
