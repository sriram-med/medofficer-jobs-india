# MedOfficer Jobs v2 — AWS Deployment Guide

## Architecture at a Glance

```
Users → CloudFront → S3 (frontend HTML/CSS/JS)
             ↕
Users → CloudFront → App Runner (API)
                          ↕
                     RDS PostgreSQL
                          ↕
                     S3 (logs/exports)
```

---

## Prerequisites

- AWS account with billing enabled
- AWS CLI installed and configured (`aws configure`)
- Node.js 18+ on your local machine
- `psql` command available (PostgreSQL client)

---

## Step 1 — Create RDS PostgreSQL

### 1.1 Launch RDS

In AWS Console → RDS → Create database:

| Setting | Value |
|---|---|
| Engine | PostgreSQL 15 |
| Template | Free tier (dev) or Production |
| DB Identifier | `medofficer-db` |
| Master username | `medofficer_admin` |
| Master password | Generate strong password, save it |
| Instance class | `db.t3.micro` (dev) / `db.t3.small` (prod) |
| Storage | 20 GB gp3 |
| VPC | Default or create new |
| Public access | **No** (App Runner uses VPC connector) |
| Backup retention | 7 days |

### 1.2 Create the database user

Connect via psql (from a bastion or Cloud9):

```bash
psql -h <rds-endpoint> -U medofficer_admin -d postgres
```

```sql
CREATE DATABASE medofficer;
CREATE USER medofficer_api WITH PASSWORD 'strong_api_password';
GRANT ALL PRIVILEGES ON DATABASE medofficer TO medofficer_api;
```

### 1.3 Run schema

```bash
psql -h <rds-endpoint> -U medofficer_api -d medofficer \
  -f backend/src/config/schema.sql
```

---

## Step 2 — Store Secrets in AWS Secrets Manager

Never put credentials directly in App Runner env vars.

```bash
# Create secret
aws secretsmanager create-secret \
  --name medofficer/production \
  --region ap-south-1 \
  --secret-string '{
    "DB_HOST": "your-rds.rds.amazonaws.com",
    "DB_PORT": "5432",
    "DB_NAME": "medofficer",
    "DB_USER": "medofficer_api",
    "DB_PASSWORD": "your_db_password",
    "JWT_SECRET": "generate_64_char_random_string_here",
    "DB_SSL": "true"
  }'
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Step 3 — Deploy Backend to App Runner

### 3.1 Create IAM Role for App Runner Instance

1. Go to IAM → Roles → Create Role
2. Trusted entity: **App Runner**
3. Attach policy from `infrastructure/iam/apprunner-instance-role.json`
4. Name: `MedOfficerAppRunnerRole`

### 3.2 Create App Runner Service

AWS Console → App Runner → Create service:

**Source:**
- Source type: Source code repository (GitHub)
- Connect your GitHub account
- Repository: your repo
- Branch: `main`
- Root directory: `backend`

**Build settings:**
- Runtime: Node.js 18
- Build command: `npm ci --only=production`
- Start command: `node server.js`
- Port: `8080`

**Service settings:**
- CPU: 1 vCPU
- Memory: 2 GB
- Instance role: `MedOfficerAppRunnerRole`

**Environment variables** (add each from your secret):
```
NODE_ENV = production
DB_HOST  = (from Secrets Manager)
DB_PORT  = 5432
DB_NAME  = medofficer
DB_USER  = medofficer_api
DB_PASSWORD = (from Secrets Manager)
DB_SSL   = true
JWT_SECRET = (from Secrets Manager)
ALLOWED_ORIGINS = https://yourdomain.com
AWS_REGION = ap-south-1
S3_LOGS_BUCKET = medofficer-scraper-logs
```

> Tip: App Runner supports direct Secrets Manager injection — link the secret ARN per variable for better security.

### 3.3 Verify deployment

```bash
curl https://your-apprunner-url.ap-south-1.awsapprunner.com/health
# Expected: {"status":"ok","database":"connected"}
```

Note your App Runner URL — you'll use it in the frontend config.

---

## Step 4 — Create S3 Bucket for Frontend

### 4.1 Create bucket

```bash
aws s3 mb s3://medofficer-frontend --region ap-south-1
```

### 4.2 Disable public access block (CloudFront will serve it)

```bash
aws s3api put-public-access-block \
  --bucket medofficer-frontend \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 4.3 Set up frontend config

Edit `frontend/assets/js/config.js`:

```js
window.MEDOFFICER_CONFIG = {
  API_BASE: 'https://your-apprunner-url.ap-south-1.awsapprunner.com',
  SITE_NAME: 'MedOfficer Jobs',
};
```

Or if you have a custom domain:
```js
  API_BASE: 'https://api.yourdomain.com',
```

### 4.4 Upload frontend to S3

```bash
aws s3 sync frontend/ s3://medofficer-frontend/ \
  --delete \
  --cache-control "public, max-age=300" \
  --exclude "*.html" \
  --include "*.css" --cache-control "public, max-age=86400" \
  --include "*.js"  --cache-control "public, max-age=86400"

# Upload HTML with short cache
aws s3 sync frontend/ s3://medofficer-frontend/ \
  --delete \
  --include "*.html" \
  --cache-control "public, max-age=300, must-revalidate"
```

Or use the deploy script:
```bash
bash scripts/deploy-frontend.sh
```

---

## Step 5 — Set Up CloudFront

### 5.1 Create distribution

AWS Console → CloudFront → Create distribution:

| Setting | Value |
|---|---|
| Origin domain | `medofficer-frontend.s3.ap-south-1.amazonaws.com` |
| Origin access | Origin access control (OAC) — create new |
| Viewer protocol | Redirect HTTP to HTTPS |
| Allowed HTTP methods | GET, HEAD |
| Cache policy | CachingOptimized |
| Price class | Use only North America and Europe (or All) |
| Default root object | `index.html` |

**Error pages:**
- 403 → `/index.html`, response 200
- 404 → `/index.html`, response 200

### 5.2 Grant CloudFront access to S3

After creating the distribution, AWS will show you a bucket policy to add:

```bash
# AWS Console will show you the exact policy — copy and apply it:
aws s3api put-bucket-policy \
  --bucket medofficer-frontend \
  --policy file://infrastructure/cloudfront/bucket-policy.json
```

### 5.3 Note your CloudFront URL

`https://xxxxxxxxx.cloudfront.net` — this is your live site.

---

## Step 6 — S3 Bucket for Scraper Logs

```bash
aws s3 mb s3://medofficer-scraper-logs --region ap-south-1

# Lifecycle: auto-delete logs older than 90 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket medofficer-scraper-logs \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "DeleteOldLogs",
      "Status": "Enabled",
      "Prefix": "logs/",
      "Expiration": { "Days": 90 }
    }]
  }'
```

---

## Step 7 — EventBridge Scheduler (Scraper Automation)

Since the scraper runs inside App Runner, use EventBridge to POST to the scraper endpoint:

### Option A: HTTP Target (simplest)

```bash
# Create scheduler that calls the scraper endpoint daily at 2 AM IST
aws scheduler create-schedule \
  --name medofficer-daily-scrape \
  --schedule-expression "cron(30 20 * * ? *)" \
  --flexible-time-window '{"Mode":"FLEXIBLE","MaximumWindowInMinutes":30}' \
  --target '{
    "Arn": "arn:aws:scheduler:::http",
    "RoleArn": "arn:aws:iam::ACCOUNT_ID:role/SchedulerHTTPRole",
    "Input": "{\"method\":\"POST\",\"endpoint\":\"https://your-apprunner.awsapprunner.com/api/scraper/run\",\"headers\":{\"Authorization\":\"Bearer YOUR_ADMIN_JWT\"}}",
    "RetryPolicy": {"MaximumRetryAttempts": 2}
  }'
```

> Or call it manually from the admin dashboard when needed.

---

## Step 8 — Custom Domain (Optional)

### 8.1 Add domain to CloudFront

1. CloudFront → Your distribution → Edit → Alternate domain names
2. Add: `yourdomain.com`, `www.yourdomain.com`
3. Request SSL certificate via AWS Certificate Manager (ACM) in **us-east-1**

### 8.2 API domain

1. App Runner → Custom domains → Add domain: `api.yourdomain.com`
2. Follow the CNAME DNS instructions

### 8.3 Update CORS

In App Runner env vars, update:
```
ALLOWED_ORIGINS = https://yourdomain.com,https://www.yourdomain.com
```

---

## Environment Variables Reference

### Backend (App Runner)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port (App Runner sets this) | `8080` |
| `NODE_ENV` | Environment | `production` |
| `DB_HOST` | RDS endpoint | `medofficer.xxx.rds.amazonaws.com` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `medofficer` |
| `DB_USER` | DB user | `medofficer_api` |
| `DB_PASSWORD` | DB password | (from Secrets Manager) |
| `DB_SSL` | Enable SSL | `true` |
| `JWT_SECRET` | JWT signing key (64+ chars) | (from Secrets Manager) |
| `ALLOWED_ORIGINS` | CORS whitelist | `https://yourdomain.com` |
| `AWS_REGION` | AWS region | `ap-south-1` |
| `S3_LOGS_BUCKET` | Scraper log bucket | `medofficer-scraper-logs` |

### Frontend (config.js)

| Variable | Description |
|---|---|
| `API_BASE` | Backend URL from App Runner or custom domain |

---

## Monthly Cost Estimate (light production)

| Service | Config | Est. Cost/month |
|---|---|---|
| App Runner | 1 vCPU, 2GB, low traffic | ~$20–40 |
| RDS PostgreSQL | db.t3.micro, 20GB | ~$15–20 |
| S3 (frontend + logs) | <1 GB | ~$1 |
| CloudFront | <10 GB transfer | ~$2–5 |
| Secrets Manager | 2 secrets | ~$1 |
| **Total** | | **~$40–70/month** |

---

## Admin User Setup

After deploying and running the schema, create your first admin:

```bash
node backend/scripts/create-admin.js \
  --email admin@yourdomain.com \
  --password StrongPassword123
```

Or via psql:
```sql
INSERT INTO admin_users (email, password_hash, role)
VALUES (
  'admin@yourdomain.com',
  -- generate with: node -e "const b=require('bcryptjs');b.hash('password',12).then(console.log)"
  '$2a$12$...',
  'super'
);
```

---

## Ongoing Maintenance

| Task | Frequency | How |
|---|---|---|
| Deploy backend changes | On push | App Runner auto-deploys from GitHub |
| Deploy frontend changes | On push | `bash scripts/deploy-frontend.sh` |
| CloudFront cache invalidation | After frontend deploy | `aws cloudfront create-invalidation --distribution-id XXXX --paths "/*"` |
| RDS snapshots | Automatic | Configured in RDS (7-day retention) |
| Review scrape logs | Weekly | Admin dashboard or S3 |
| Expire old jobs | Weekly | `UPDATE jobs SET is_active=FALSE WHERE last_date < CURRENT_DATE - 7` |
