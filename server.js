const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (e) {
    res.json({ status: 'ok', database: 'disconnected', error: e.message });
  }
});

app.get('/api/jobs', (req, res) => {
  res.json({ jobs: [], total: 0 });
});

app.get('/api/stats/public', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM public_stats_view');
    const stats = rows[0] || {
      active_jobs: 0,
      new_24h: 0,
      new_7d: 0,
      closing_soon: 0,
      psu_count: 0,
      central_count: 0,
      state_count: 0,
      telangana_count: 0,
      andhra_pradesh_count: 0,
      official_sources_tracked: 0,
      last_platform_refresh: null
    };

    res.json({
      activeJobs: Number(stats.active_jobs || 0),
      new24h: Number(stats.new_24h || 0),
      new7d: Number(stats.new_7d || 0),
      closingSoon: Number(stats.closing_soon || 0),
      countsByType: {
        psu: Number(stats.psu_count || 0),
        central: Number(stats.central_count || 0),
        state: Number(stats.state_count || 0)
      },
      countsByState: {
        telangana: Number(stats.telangana_count || 0),
        andhraPradesh: Number(stats.andhra_pradesh_count || 0)
      },
      officialSourcesTracked: Number(stats.official_sources_tracked || 0),
      lastPlatformRefresh: stats.last_platform_refresh
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load public stats', details: e.message });
  }
});

app.get('/api/admin/stats/ops', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM admin_ops_stats_view');
    const stats = rows[0] || {
      source_success_rate: 0,
      failed_source_count: 0,
      refresh_duration_seconds: 0,
      jobs_new: 0,
      jobs_changed: 0,
      jobs_expired: 0,
      duplicate_suppression_count: 0,
      stale_source_count: 0,
      run_started_at: null,
      run_ended_at: null
    };

    res.json({
      sourceSuccessRate: Number(stats.source_success_rate || 0),
      failedSourceCount: Number(stats.failed_source_count || 0),
      refreshDurationSeconds: Number(stats.refresh_duration_seconds || 0),
      perRun: {
        new: Number(stats.jobs_new || 0),
        changed: Number(stats.jobs_changed || 0),
        expired: Number(stats.jobs_expired || 0)
      },
      duplicateSuppressionCount: Number(stats.duplicate_suppression_count || 0),
      staleSourceCount: Number(stats.stale_source_count || 0),
      lastRun: {
        startedAt: stats.run_started_at,
        endedAt: stats.run_ended_at
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load ops stats', details: e.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log('Running on port ' + PORT));
