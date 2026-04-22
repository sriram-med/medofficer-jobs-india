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

-- ── Refresh Runs (precomputed operational metrics per refresh cycle) ─────────
CREATE TABLE IF NOT EXISTS refresh_runs (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at                  TIMESTAMPTZ NOT NULL,
  ended_at                    TIMESTAMPTZ,
  source_success_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  failed_source_count         INT NOT NULL DEFAULT 0,
  refresh_duration_seconds    INT NOT NULL DEFAULT 0,
  jobs_new                    INT NOT NULL DEFAULT 0,
  jobs_changed                INT NOT NULL DEFAULT 0,
  jobs_expired                INT NOT NULL DEFAULT 0,
  duplicate_suppression_count INT NOT NULL DEFAULT 0,
  stale_source_count          INT NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_runs_ended_at ON refresh_runs (ended_at DESC);

-- ── Public platform stats view ───────────────────────────────────────────────
CREATE OR REPLACE VIEW public_stats_view AS
SELECT
  COUNT(*) FILTER (WHERE j.is_active) AS active_jobs,
  COUNT(*) FILTER (WHERE j.created_at >= NOW() - INTERVAL '24 hours') AS new_24h,
  COUNT(*) FILTER (WHERE j.created_at >= NOW() - INTERVAL '7 days') AS new_7d,
  COUNT(*) FILTER (
    WHERE j.is_active
      AND j.last_date IS NOT NULL
      AND j.last_date >= CURRENT_DATE
      AND j.last_date <= CURRENT_DATE + INTERVAL '3 days'
  ) AS closing_soon,
  COUNT(*) FILTER (WHERE j.is_active AND o.org_type = 'PSU') AS psu_count,
  COUNT(*) FILTER (WHERE j.is_active AND j.is_central) AS central_count,
  COUNT(*) FILTER (WHERE j.is_active AND NOT j.is_central) AS state_count,
  COUNT(*) FILTER (WHERE j.is_active AND lower(j.location_state) IN ('telangana')) AS telangana_count,
  COUNT(*) FILTER (
    WHERE j.is_active
      AND lower(j.location_state) IN ('andhra pradesh', 'andhra', 'ap')
  ) AS andhra_pradesh_count,
  (SELECT COUNT(*) FROM scrape_sources s WHERE s.is_active) AS official_sources_tracked,
  (SELECT MAX(l.ended_at) FROM scrape_logs l WHERE l.status IN ('success', 'partial')) AS last_platform_refresh
FROM jobs j
LEFT JOIN organizations o ON o.id = j.organization_id;

-- ── Admin ops stats view ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW admin_ops_stats_view AS
WITH latest_run AS (
  SELECT *
  FROM refresh_runs rr
  ORDER BY COALESCE(rr.ended_at, rr.started_at) DESC
  LIMIT 1
),
fallback AS (
  SELECT
    ROUND(
      100.0 * (
        COUNT(*) FILTER (WHERE sl.status IN ('success', 'partial'))::NUMERIC /
        NULLIF(COUNT(*), 0)
      ),
      2
    ) AS source_success_rate,
    COUNT(*) FILTER (WHERE sl.status = 'failed') AS failed_source_count,
    COALESCE(EXTRACT(EPOCH FROM (MAX(sl.ended_at) - MAX(sl.started_at)))::INT, 0) AS refresh_duration_seconds,
    COALESCE(SUM(sl.jobs_new), 0) AS jobs_new,
    COALESCE(SUM(sl.jobs_updated), 0) AS jobs_changed,
    0::INT AS jobs_expired,
    0::INT AS duplicate_suppression_count,
    COUNT(*) FILTER (
      WHERE src.is_active
        AND src.last_scraped_at IS NOT NULL
        AND src.last_scraped_at < NOW() - make_interval(hours => src.scrape_interval_hours * 2)
    ) AS stale_source_count,
    MAX(sl.started_at) AS run_started_at,
    MAX(sl.ended_at) AS run_ended_at
  FROM scrape_logs sl
  LEFT JOIN scrape_sources src ON src.id = sl.source_id
  WHERE sl.started_at >= NOW() - INTERVAL '24 hours'
)
SELECT
  COALESCE(lr.source_success_rate, fb.source_success_rate, 0) AS source_success_rate,
  COALESCE(lr.failed_source_count, fb.failed_source_count, 0) AS failed_source_count,
  COALESCE(lr.refresh_duration_seconds, fb.refresh_duration_seconds, 0) AS refresh_duration_seconds,
  COALESCE(lr.jobs_new, fb.jobs_new, 0) AS jobs_new,
  COALESCE(lr.jobs_changed, fb.jobs_changed, 0) AS jobs_changed,
  COALESCE(lr.jobs_expired, fb.jobs_expired, 0) AS jobs_expired,
  COALESCE(lr.duplicate_suppression_count, fb.duplicate_suppression_count, 0) AS duplicate_suppression_count,
  COALESCE(lr.stale_source_count, fb.stale_source_count, 0) AS stale_source_count,
  COALESCE(lr.started_at, fb.run_started_at) AS run_started_at,
  COALESCE(lr.ended_at, fb.run_ended_at) AS run_ended_at
FROM fallback fb
LEFT JOIN latest_run lr ON TRUE;
