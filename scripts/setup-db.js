const fs = require('fs');
const path = require('path');
const { createPool, initLeadSchema } = require('../db');

loadEnvFile(path.join(__dirname, '..', '.env'));

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();

async function main() {
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL is required in .env before running db setup.');
    }

    const pool = createPool(DATABASE_URL);
    try {
        await initLeadSchema(pool);
        console.log('Database schema is ready: secureanno_leads');
    } finally {
        await pool.end();
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

main().catch(error => {
    console.error('DB setup failed:', error);
    process.exitCode = 1;
});
