-- MedOfficer Jobs Platform — PostgreSQL Schema
-- Run this once on a fresh RDS instance
-- psql -h <host> -U <user> -d medofficer -f schema.sql

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- fuzzy text search

-- ── Organizations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  short_name  TEXT,
  org_type    TEXT NOT NULL CHECK (org_type IN ('PSU','GOVT','NHM','ESIC','RAILWAY','AIIMS','OTHER')),
  website     TEXT,
  logo_url    TEXT,
  state       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Scrape Sources ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL UNIQUE,
  scraper_type    TEXT NOT NULL CHECK (scraper_type IN ('html','pdf','rss','api')),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_scraped_at TIMESTAMPTZ,
  scrape_interval_hours INT NOT NULL DEFAULT 24,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Jobs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id       UUID REFERENCES scrape_sources(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  title           TEXT NOT NULL,
  slug            TEXT UNIQUE,
  description     TEXT,
  short_desc      TEXT GENERATED ALWAYS AS (LEFT(description, 300)) STORED,

  job_type        TEXT NOT NULL CHECK (job_type IN (
                    'Medical Officer','GDMO','PSU Doctor',
                    'Factory MO','Occupational Health','Industrial MO',
                    'Senior Resident','Junior Resident','Specialist','Other'
                  )),
  location_city   TEXT,
  location_state  TEXT NOT NULL,
  is_central      BOOLEAN NOT NULL DEFAULT FALSE,

  vacancies       INT,
  salary_min      NUMERIC(12,2),
  salary_max      NUMERIC(12,2),
  pay_level       TEXT,

  qualification   TEXT,
  experience_years INT,
  age_limit_min   INT,
  age_limit_max   INT,

  apply_url       TEXT,
  notification_url TEXT,
  source_url      TEXT,

  posted_date     DATE,
  last_date       DATE,
  interview_date  DATE,

  is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured     BOOLEAN NOT NULL DEFAULT FALSE,

  view_count      INT NOT NULL DEFAULT 0,
  apply_count     INT NOT NULL DEFAULT 0,

  tags            TEXT[],
  raw_data        JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_jobs_fts ON jobs
  USING GIN(to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));

-- Trigram index for ILIKE searches
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING GIN (title gin_trgm_ops);

-- Common filter indexes
CREATE INDEX IF NOT EXISTS idx_jobs_state       ON jobs (location_state);
CREATE INDEX IF NOT EXISTS idx_jobs_type        ON jobs (job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_last_date   ON jobs (last_date);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active   ON jobs (is_active);
CREATE INDEX IF NOT EXISTS idx_jobs_is_featured ON jobs (is_featured);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs (posted_date DESC);

-- ── Scrape Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scrape_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id   UUID REFERENCES scrape_sources(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  status      TEXT NOT NULL CHECK (status IN ('running','success','partial','failed')),
  jobs_found  INT DEFAULT 0,
  jobs_new    INT DEFAULT 0,
  jobs_updated INT DEFAULT 0,
  error_msg   TEXT,
  s3_log_key  TEXT -- path to full log in S3
);

-- ── Admin Users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('super','editor','viewer')),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Bookmarks (optional) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookmarks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, job_id)
);

-- ── Trigger: auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER orgs_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed: Organizations ───────────────────────────────────────────────────────
INSERT INTO organizations (name, short_name, org_type, website, state) VALUES
  ('NTPC Limited','NTPC','PSU','https://ntpc.co.in','Delhi'),
  ('Nuclear Power Corporation of India','NPCIL','PSU','https://npcil.nic.in','Mumbai'),
  ('Bharat Electronics Limited','BEL','PSU','https://bel-india.in','Bangalore'),
  ('Bharat Heavy Electricals Limited','BHEL','PSU','https://bhel.com','Delhi'),
  ('Oil and Natural Gas Corporation','ONGC','PSU','https://ongcindia.com','Delhi'),
  ('Indian Oil Corporation Limited','IOCL','PSU','https://iocl.com','Delhi'),
  ('Bharat Petroleum Corporation Limited','BPCL','PSU','https://bharatpetroleum.in','Mumbai'),
  ('Hindustan Petroleum Corporation Limited','HPCL','PSU','https://hindustanpetroleum.com','Mumbai'),
  ('Steel Authority of India Limited','SAIL','PSU','https://sail.co.in','Delhi'),
  ('Coal India Limited','CIL','PSU','https://coalindia.in','Kolkata'),
  ('Eastern Coalfields Limited','ECL','PSU','https://easterncoal.gov.in','Kolkata'),
  ('GAIL (India) Limited','GAIL','PSU','https://gail.nic.in','Delhi'),
  ('Hindustan Aeronautics Limited','HAL','PSU','https://hal-india.co.in','Bangalore'),
  ('Mishra Dhatu Nigam Limited','MIDHANI','PSU','https://midhani-india.in','Hyderabad'),
  ('All India Institute of Medical Sciences','AIIMS','AIIMS','https://aiims.edu','Delhi'),
  ('Employees State Insurance Corporation','ESIC','ESIC','https://esic.in','Delhi'),
  ('Indian Railways','Railways','RAILWAY','https://indianrailways.gov.in','Delhi'),
  ('National Health Mission','NHM','NHM','https://nhm.gov.in','Delhi'),
  ('Health, Medical and Family Welfare - Telangana','HMFW TS','GOVT','https://hmfw.telangana.gov.in','Telangana'),
  ('Directorate of Health Services - AP','DHS AP','GOVT','https://dhs.ap.gov.in','Andhra Pradesh'),
  ('Directorate of Medical Education - TS','DME TS','GOVT','https://dme.telangana.gov.in','Telangana'),
  ('Ex-Servicemen Contributory Health Scheme','ECHS','GOVT','https://echs.gov.in','Delhi'),
  ('Central Government Health Scheme','CGHS','GOVT','https://cghs.gov.in','Delhi')
ON CONFLICT DO NOTHING;
