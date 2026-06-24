# MedOfficer Jobs

Verified government Medical Officer jobs platform for MBBS doctors in India.

## Stack

- Frontend: static `index.html` + `main.css`
- API: Node.js + Express (`server.js`)
- Database: PostgreSQL (`schema.sql`)
- Refresh job: Node script (`scripts/refresh-jobs.mjs`)

## Local development

```bash
npm ci
npm start
```

API runs on `http://localhost:8080` by default.

## Core endpoints

- `GET /health`
- `GET /api/jobs`

## Deployment

Canonical production runbook (Render):

- `deployment.md`

This runbook includes exact provisioning steps for web service + static site + managed Postgres + 15-minute cron job, required env vars/secrets, migrations, health checks, rollback, and post-deploy verification.
