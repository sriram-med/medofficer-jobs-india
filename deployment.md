# MedOfficer Jobs — Canonical Deployment Runbook (Render)

This is the **single source of truth** for production deployment.

It standardizes on:
- **Render Web Service** for API (`server.js`)
- **Render Static Site** for frontend (`index.html`, `main.css`)
- **Render Managed PostgreSQL** for the database
- **Render Cron Job** for 15-minute refresh (`node scripts/refresh-jobs.mjs`)

---

## 1) Architecture

```
Users -> Render Static Site (frontend)
                |
                v
         Render Web Service (Node/Express API)
                |
                v
      Render Managed PostgreSQL (primary DB)

Render Cron Job (every 15 min) -> scripts/refresh-jobs.mjs
```

---

## 2) Provisioning steps (exact)

## 2.1 Create PostgreSQL (Managed)

1. In Render dashboard: **New +** -> **PostgreSQL**.
2. Set:
   - Name: `medofficer-db-prod`
   - Region: same as app services
   - Plan: choose based on traffic/SLA
3. Click **Create Database**.
4. After ready, copy:
   - Internal Database URL (preferred for Render-internal access)
   - Host, Port, Database, User, Password

## 2.2 Run migrations/schema

From your local machine (or any box with `psql`), run:

```bash
psql "$DATABASE_URL" -f schema.sql
```

If you do not have a URL string, run with discrete values:

```bash
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "${DB_PORT:-5432}" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f schema.sql
```

Expected result: table/extension creation and seed inserts complete without fatal errors.

## 2.3 Create API Web Service

1. Render dashboard: **New +** -> **Web Service**.
2. Connect repo: `medofficer-jobs-india`.
3. Configure:
   - Name: `medofficer-api-prod`
   - Runtime: `Node`
   - Root Directory: repository root
   - Build Command: `npm ci`
   - Start Command: `npm start`
4. Set environment variables (see section 3).
5. Create service.

## 2.4 Create Frontend Static Site

1. Render dashboard: **New +** -> **Static Site**.
2. Connect same repo.
3. Configure:
   - Name: `medofficer-web-prod`
   - Root Directory: repository root
   - Build Command: *(leave empty)*
   - Publish Directory: `.`
4. Set Rewrite/Redirect rule:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: `Rewrite`
5. Deploy.

> Frontend currently points to a Railway URL in `index.html`; update `API` constant to your Render API URL as part of go-live prep.

## 2.5 Create dedicated Cron Service (15-minute refresh)

1. Render dashboard: **New +** -> **Cron Job**.
2. Connect same repo.
3. Configure:
   - Name: `medofficer-refresh-15m`
   - Runtime: `Node`
   - Root Directory: repository root
   - Build Command: `npm ci`
   - Start Command: `node scripts/refresh-jobs.mjs`
   - Cron Expression: `*/15 * * * *`
   - Timezone: `UTC`
4. Add required env vars/secrets needed by refresh logic.
5. Create cron job.

---

## 3) Required env vars and secrets

Configure these in Render **Environment** for web service and cron job (as applicable):

| Variable | Required | Example | Secret? | Notes |
|---|---|---|---|---|
| `NODE_ENV` | Yes | `production` | No | Runtime mode |
| `PORT` | No | `8080` | No | Render injects this automatically; app already respects `PORT` |
| `DB_HOST` | Yes | `dpg-xxx-a.oregon-postgres.render.com` | Yes | From Render Postgres |
| `DB_PORT` | Yes | `5432` | No | |
| `DB_NAME` | Yes | `medofficer` | No | |
| `DB_USER` | Yes | `medofficer_user` | Yes | |
| `DB_PASSWORD` | Yes | `<strong-random>` | Yes | |
| `DATABASE_URL` | Recommended | `postgres://...` | Yes | Useful for tooling/migrations |
| `CORS_ORIGIN` | Recommended | `https://medofficer-web-prod.onrender.com` | No | If you tighten CORS policy later |

Secret management rules:
- Set secrets only in Render dashboard env var UI.
- Never commit secrets to repo or `.env` tracked files.
- Rotate DB password immediately if exposed.

---

## 4) Service commands (canonical)

- API start command: `npm start`
- API process entry: `node server.js` (via `package.json` script)
- Cron command: `node scripts/refresh-jobs.mjs`
- Migration command: `psql "$DATABASE_URL" -f schema.sql`

---

## 5) Health checks and logs

## 5.1 Health checks

Primary endpoint:

```bash
curl -fsS https://<api-service>.onrender.com/health
```

Expected healthy JSON:

```json
{"status":"ok","database":"connected"}
```

If `database` is `disconnected`, treat as degraded and investigate DB/env connectivity.

## 5.2 Log inspection procedures

Render dashboard -> each service -> **Logs**.

Check these in order:
1. **Web Service logs**
   - Startup line: `Running on port ...`
   - DB or crash errors
2. **Cron Job logs**
   - Success line from script: `Updated jobs.json at ...`
   - Failure line: `Refresh failed: ...`
3. **Postgres metrics/logs**
   - Connection saturation
   - CPU/storage spikes

CLI/quick checks:

```bash
curl -i https://<api-service>.onrender.com/health
curl -i "https://<api-service>.onrender.com/api/jobs?limit=5"
```

---

## 6) Rollback and incident response

## 6.1 Fast rollback

1. Render dashboard -> service -> **Deploys**.
2. Select last known-good deploy.
3. Click **Rollback**.
4. Re-run verification checklist (section 7).

## 6.2 Incident steps

1. **Acknowledge incident** and freeze non-essential deploys.
2. Check `/health` and recent deploy timestamp.
3. Inspect web + cron logs for first failure signature.
4. Validate DB connectivity/credentials.
5. If recent deploy caused breakage: rollback immediately.
6. If data issue:
   - pause cron job temporarily,
   - correct data/migration issue,
   - run one manual cron execution,
   - resume schedule.
7. Document root cause + preventive action in incident note.

---

## 7) Post-deploy verification checklist

Run in this order after every production deploy:

1. API health
   ```bash
   curl -fsS https://<api-service>.onrender.com/health
   ```
2. API jobs endpoint
   ```bash
   curl -fsS "https://<api-service>.onrender.com/api/jobs?limit=3"
   ```
3. Frontend loads and renders job list in browser.
4. Browser network tab shows API calls to Render API domain (not old Railway URL).
5. Cron job last run status is **Succeeded**.
6. Cron log contains `Updated jobs.json at` timestamp from current day.
7. DB connection count stable; no auth failures.
8. No repeating error bursts in web logs for 15 minutes.

Mark deploy complete only if all checks pass.

---

## 8) Operational notes

- Keep all services in the same Render region to reduce latency.
- Do schema updates in backward-compatible phases when possible.
- Prefer additive migrations first; destructive operations in controlled windows.
