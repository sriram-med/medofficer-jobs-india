# MedOfficer Jobs — v2 (AWS Option A)

> Verified government Medical Officer jobs platform for MBBS doctors in India.

## Project Structure

```
medofficer-v2/
├── frontend/                  # Static site → S3 + CloudFront
│   ├── index.html             # Homepage
│   ├── jobs.html              # Jobs listing + filters
│   ├── job.html               # Job detail page
│   ├── telangana.html         # Telangana state page
│   ├── andhra-pradesh.html    # AP state page
│   ├── psu-jobs.html          # PSU jobs page
│   ├── closing-soon.html      # Closing soon page
│   └── assets/
│       ├── css/main.css       # Full design system
│       └── js/
│           ├── config.js      # API base URL config
│           ├── api.js         # API client library
│           └── main.js        # Shared utilities
│
├── backend/                   # Node.js API → AWS App Runner
│   ├── server.js              # Entry point
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app.js             # Express app
│       ├── config/
│       │   ├── db.js          # PostgreSQL pool
│       │   └── schema.sql     # Full DB schema + seed
│       ├── routes/
│       │   ├── jobs.js        # GET /api/jobs, /api/jobs/:slug
│       │   ├── filters.js     # GET /api/filters
│       │   ├── admin.js       # Admin auth + management
│       │   ├── scraper.js     # Manual scraper trigger
│       │   └── health.js      # GET /health
│       └── scrapers/
│           ├── manager.js     # Orchestrates all scrapers
│           └── htmlScraper.js # HTML scraper + job extractor
│
├── infrastructure/
│   ├── apprunner/apprunner.yaml
│   ├── cloudfront/distribution.json
│   └── iam/apprunner-instance-role.json
│
├── scripts/
│   ├── deploy-frontend.sh     # S3 sync + CloudFront invalidation
│   └── create-admin.js        # Create first admin user
│
└── docs/
    └── deployment.md          # Complete step-by-step AWS guide
```

## Architecture

```
CloudFront → S3          (frontend: HTML/CSS/JS)
CloudFront → App Runner  (backend: REST API)
App Runner → RDS         (PostgreSQL: jobs, orgs, logs)
App Runner → S3          (scraper logs, exports)
EventBridge → App Runner (daily scraper trigger)
```

## Quick Start (local dev)

```bash
# Backend
cd backend
cp .env.example .env
# Fill in local DB values
npm install
npm run dev     # http://localhost:8080

# Frontend
# Open frontend/index.html in browser
# Or: npx serve frontend -p 3000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/jobs` | List jobs (filters, pagination) |
| GET | `/api/jobs/featured` | Featured jobs |
| GET | `/api/jobs/closing-soon` | Closing within 10 days |
| GET | `/api/jobs/stats` | Aggregated counts |
| GET | `/api/jobs/:slug` | Job detail |
| GET | `/api/filters` | All filter options |
| POST | `/api/admin/login` | Admin login → JWT |
| GET | `/api/admin/dashboard` | Admin dashboard |
| PATCH | `/api/admin/jobs/:id` | Update job |
| POST | `/api/scraper/run` | Manual scraper trigger |
| GET | `/api/scraper/status` | Scrape logs |

## Deployment

See [docs/deployment.md](docs/deployment.md) for the full step-by-step guide.

## Niche Focus

This platform covers **only**:
- Medical Officer (MO)
- GDMO (General Duty Medical Officer)
- PSU Doctor
- Factory Medical Officer
- Occupational Health Doctor
- Industrial Medical Officer
- Senior/Junior Resident (Govt)

**Official sources only:** PSU career portals, ESIC, NHM, HMFW, DHS, DME, AIIMS, Railways, ECHS, CGHS.
