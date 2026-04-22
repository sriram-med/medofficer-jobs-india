#!/usr/bin/env node
const fs = require('fs/promises');
const path = require('path');
const { Pool } = require('pg');

const LOCK_KEY = 90817263541;
const SUMMARY_PATH = path.join(process.cwd(), 'artifacts', 'refresh-summary.json');

function createPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false });
  }

  return new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
}

async function ensureArtifactDir() {
  await fs.mkdir(path.dirname(SUMMARY_PATH), { recursive: true });
}

async function writeSummary(summary) {
  await ensureArtifactDir();
  await fs.writeFile(SUMMARY_PATH, JSON.stringify(summary, null, 2), 'utf8');
}

async function withAdvisoryLock(client, lockKey, fn) {
  const { rows } = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [lockKey]);
  if (!rows[0]?.locked) return { locked: false };

  try {
    const result = await fn();
    return { locked: true, result };
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [lockKey]);
  }
}

async function runRefreshTasks(client) {
  const startedAt = new Date().toISOString();
  const summary = {
    startedAt,
    completedAt: null,
    status: 'running',
    lock: 'acquired',
    metrics: {
      new: 0,
      updated: 0,
      expired: 0,
      duplicates: 0,
      failures: 0
    },
    sourceHealth: {
      healthy: 0,
      stale: 0,
      staleSources: []
    },
    stats: {}
  };

  const scrapeLog = await client.query(
    "INSERT INTO scrape_logs (status, started_at, jobs_found, jobs_new, jobs_updated) VALUES ('running', NOW(), 0, 0, 0) RETURNING id"
  );
  const logId = scrapeLog.rows[0].id;

  try {
    const expiredResult = await client.query(
      `UPDATE jobs
       SET is_active = FALSE, updated_at = NOW()
       WHERE is_active = TRUE AND last_date IS NOT NULL AND last_date < CURRENT_DATE`
    );
    summary.metrics.expired = expiredResult.rowCount;

    const dedupeResult = await client.query(
      `WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY slug ORDER BY updated_at DESC, created_at DESC) AS rn
        FROM jobs
        WHERE slug IS NOT NULL
      )
      UPDATE jobs j
      SET is_active = FALSE, updated_at = NOW()
      FROM ranked r
      WHERE j.id = r.id AND r.rn > 1 AND j.is_active = TRUE`
    );
    summary.metrics.duplicates = dedupeResult.rowCount;

    const updateResult = await client.query(
      `UPDATE jobs
       SET updated_at = NOW()
       WHERE is_active = TRUE
         AND (last_date IS NULL OR last_date >= CURRENT_DATE)
         AND updated_at < NOW() - INTERVAL '1 day'`
    );
    summary.metrics.updated = updateResult.rowCount;

    // Placeholder for ingestion hooks. Keep explicit in summary.
    summary.metrics.new = 0;

    const statsResult = await client.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active,
         COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive,
         COUNT(*) FILTER (WHERE last_date IS NOT NULL AND last_date < CURRENT_DATE)::int AS expired
       FROM jobs`
    );
    summary.stats = statsResult.rows[0] || {};

    const healthResult = await client.query(
      `SELECT
         id,
         name,
         url,
         last_scraped_at,
         scrape_interval_hours,
         CASE
           WHEN last_scraped_at IS NULL THEN 'stale'
           WHEN last_scraped_at < NOW() - (make_interval(hours => GREATEST(scrape_interval_hours * 2, 1))) THEN 'stale'
           ELSE 'healthy'
         END AS health
       FROM scrape_sources
       WHERE is_active = TRUE`
    );

    for (const source of healthResult.rows) {
      if (source.health === 'healthy') {
        summary.sourceHealth.healthy += 1;
      } else {
        summary.sourceHealth.stale += 1;
        summary.sourceHealth.staleSources.push({
          id: source.id,
          name: source.name,
          url: source.url,
          lastScrapedAt: source.last_scraped_at
        });
      }
    }

    await client.query(
      `UPDATE scrape_logs
       SET status = 'success',
           ended_at = NOW(),
           jobs_found = $2,
           jobs_new = $3,
           jobs_updated = $4
       WHERE id = $1`,
      [logId, summary.stats.total || 0, summary.metrics.new, summary.metrics.updated]
    );

    summary.status = 'success';
  } catch (error) {
    summary.status = 'failed';
    summary.metrics.failures += 1;
    summary.error = error.message;

    await client.query(
      `UPDATE scrape_logs
       SET status = 'failed', ended_at = NOW(), error_msg = $2
       WHERE id = $1`,
      [logId, error.message.slice(0, 5000)]
    );

    throw error;
  } finally {
    summary.completedAt = new Date().toISOString();
    await writeSummary(summary);
  }

  return summary;
}

async function main() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    const lockResult = await withAdvisoryLock(client, LOCK_KEY, async () => runRefreshTasks(client));

    if (!lockResult.locked) {
      const summary = {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'skipped',
        lock: 'busy',
        message: 'Another refresh worker currently holds the advisory lock.',
        metrics: { new: 0, updated: 0, expired: 0, duplicates: 0, failures: 0 }
      };
      await writeSummary(summary);
      console.log(JSON.stringify(summary));
      return;
    }

    console.log(JSON.stringify(lockResult.result));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  const failureSummary = {
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'failed',
    lock: 'unknown',
    metrics: { new: 0, updated: 0, expired: 0, duplicates: 0, failures: 1 },
    error: error.message
  };

  try {
    await writeSummary(failureSummary);
  } catch (_) {
    // Best effort artifact write only.
  }

  console.error('Refresh run failed:', error);
  process.exit(1);
});
