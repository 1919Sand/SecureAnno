const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createPool, initLeadSchema, insertLead } = require('../db');

loadEnvFile(path.join(__dirname, '..', '.env'));

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();

async function main() {
    if (!DATABASE_URL) {
        throw new Error('DATABASE_URL is required in .env before running db seed.');
    }

    const pool = createPool(DATABASE_URL);
    try {
        await initLeadSchema(pool);

        const lead = {
            id: crypto.randomUUID(),
            receivedAt: new Date().toISOString(),
            ip: 'seed-script',
            fullName: 'Sample Contact Lead',
            email: 'sample.lead@secureanno.local',
            phone: '+91 90000 00000',
            company: 'SecureAnno Demo',
            jobTitle: 'Operations Lead',
            country: 'India',
            companySize: '11-50',
            serviceInterest: 'ops',
            dataVolume: 'ops-team-1-3',
            projectDetails: 'Sample seeded lead for verifying the contact pipeline.',
            website: ''
        };

        await insertLead(pool, lead);
        console.log(`Seed lead inserted with id ${lead.id}`);
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
    console.error('DB seed failed:', error);
    process.exitCode = 1;
});
