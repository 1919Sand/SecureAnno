# SecureAnno Website

This project is now a self-hosted website with a built-in contact form backend.

## What It Does

- Serves the landing page from `server.js`
- Accepts form submissions at `POST /api/contact`
- Saves each lead to PostgreSQL (`secureanno_leads`) when `DATABASE_URL` is configured
- Keeps a local backup in `data/leads.jsonl`
- Includes basic rate limiting and security headers

## Local Run

1. Install Node.js 18 or newer.
2. Copy `.env.example` to `.env`.
3. Set your real `DATABASE_URL` in `.env`.
4. Start the app:

```powershell
.\run.ps1
```

Or use the existing Node start command:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

If PostgreSQL is configured but not reachable, the API still saves the lead to `data/leads.jsonl` and returns success with storage details showing database sync was skipped.
If you preview from another local port (including `localhost`, `127.0.0.1`, or `0.0.0.0`), keep `node server.js` running. The frontend retries local API endpoints on port `3000` automatically.

## Database Setup

Create the schema in PostgreSQL:

```bash
npm run db:setup
```

Insert one sample lead for verification:

```bash
npm run db:seed
```

## Environment Variables

Required for PostgreSQL lead storage:

- `DATABASE_URL`

Optional:

- `PG_POOL_MAX`
- `CORS_ALLOWED_ORIGINS`
- `PORT`
- `HOST`

## Lead Storage

Every form submission is saved in:

```text
data/leads.jsonl
```

That gives you a backup even if PostgreSQL is temporarily unavailable or not configured yet.

## VM Deployment

Recommended stack:

1. Ubuntu VM
2. Node.js 18+
3. Nginx as reverse proxy
4. PM2 for 24x7 process management
5. SSL with Let's Encrypt

Production files are included in:

- `ecosystem.config.cjs`
- `start-production.sh`
- `setup-vps.sh`
- `deploy/nginx.secureanno.conf.example`

## Suggested Production Steps

Follow the full VPS guide in `DEPLOYMENT.md`.

Short version after cloning the GitHub repo on VPS:

```bash
git clone https://github.com/1919Sand/SecureAnno.git /var/www/secureanno
cd /var/www/secureanno
bash setup-vps.sh /var/www/secureanno
```

For future updates:

```bash
git pull origin main
bash start-production.sh
```

## API Contract

### `POST /api/contact`

Request body:

```json
{
  "fullName": "Ananya Rao",
  "email": "ananya@company.com",
  "phone": "+91 98765 43210",
  "company": "Secure Tech Labs",
  "jobTitle": "AI Product Lead",
  "country": "India",
  "companySize": "11-50",
  "serviceInterest": "legal",
  "dataVolume": "1000-10000",
  "projectDetails": "Need legal annotation for judgments.",
  "website": ""
}
```

The `website` field is a honeypot and should stay empty.
