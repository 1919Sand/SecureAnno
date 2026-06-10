const { Pool } = require('pg');
const { URL } = require('url');

function normalizeDbConnectionString(connectionString) {
    try {
        const parsed = new URL(connectionString);
        const channelBinding = parsed.searchParams.get('channel_binding');
        const enableChannelBinding = channelBinding === 'require' || channelBinding === 'prefer';
        if (channelBinding) {
            parsed.searchParams.delete('channel_binding');
        }

        return {
            connectionString: parsed.toString(),
            enableChannelBinding
        };
    } catch {
        return {
            connectionString,
            enableChannelBinding: false
        };
    }
}

function buildPgPoolConfig(connectionString) {
    const normalized = normalizeDbConnectionString(connectionString);
    const config = {
        connectionString: normalized.connectionString,
        max: Number(process.env.PG_POOL_MAX || 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    };

    if (/neon\.tech/i.test(normalized.connectionString) || /sslmode=require/i.test(normalized.connectionString)) {
        config.ssl = { rejectUnauthorized: false };
    }

    if (normalized.enableChannelBinding) {
        config.enableChannelBinding = true;
    }

    return config;
}

function createPool(connectionString) {
    return new Pool(buildPgPoolConfig(connectionString));
}

async function initLeadSchema(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS secureanno_leads (
            id UUID PRIMARY KEY,
            received_at TIMESTAMPTZ NOT NULL,
            ip TEXT,
            full_name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            company TEXT NOT NULL,
            job_title TEXT,
            country TEXT,
            company_size TEXT,
            service_interest TEXT NOT NULL,
            data_volume TEXT,
            project_details TEXT,
            website TEXT,
            raw_payload JSONB NOT NULL
        )
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_secureanno_leads_received_at
        ON secureanno_leads(received_at DESC)
    `);
}

async function insertLead(pool, lead) {
    await pool.query(
        `
        INSERT INTO secureanno_leads (
            id, received_at, ip, full_name, email, phone, company, job_title,
            country, company_size, service_interest, data_volume, project_details, website, raw_payload
        ) VALUES (
            $1, $2::timestamptz, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15::jsonb
        )
        `,
        [
            lead.id,
            lead.receivedAt,
            lead.ip,
            lead.fullName,
            lead.email,
            lead.phone,
            lead.company,
            lead.jobTitle,
            lead.country,
            lead.companySize,
            lead.serviceInterest,
            lead.dataVolume,
            lead.projectDetails,
            lead.website,
            JSON.stringify(lead)
        ]
    );
}

module.exports = {
    buildPgPoolConfig,
    createPool,
    initLeadSchema,
    insertLead,
    normalizeDbConnectionString
};
