const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
const pool = new Pool({
 host: process.env.DB_HOST,
 port: process.env.DB_PORT || 5432,
 database: process.env.DB_NAME,
 user: process.env.DB_USER,
 password: process.env.DB_PASSWORD,
 ssl: false
});
app.get('/health', async (req, res) => {
 try { await pool.query('SELECT 1'); res.json({ status: 'ok', database: 'connected' }); }
 catch(e) { res.json({ status: 'ok', database: 'disconnected', error: e.message }); }
});
app.get('/api/jobs/stats', async (req, res) => {
 try {
 const r = await pool.query(`SELECT
 COUNT(*) FILTER (WHERE is_active=true) as total_active,
 COUNT(*) FILTER (WHERE is_active=true AND is_verified=true) as total_verified,
 COUNT(*) FILTER (WHERE posted_date >= CURRENT_DATE-7 AND is_active=true) as posted_this_week,
 COUNT(*) FILTER (WHERE last_date BETWEEN CURRENT_DATE AND CURRENT_DATE+7 AND is_active=true) as closing_this_week
 FROM jobs`);
 res.json(r.rows[0]);
 } catch(e) { res.status(500).json({error: e.message}); }
});
app.get('/api/jobs', async (req, res) => {
 try {
 const { state, type, org_type, psu, search, closing_soon, verified, featured, page=1, limit=20, sort='recent' } = req.query;
 const conditions = ['j.is_active = true'];
 const params = [];
 let i = 1;
 if (state) { conditions.push(`j.location_state ILIKE ${i++}`); params.push('%'+state+'%'); }
 if (type) { conditions.push(`j.job_type = ${i++}`); params.push(type); }
 if (org_type) { conditions.push(`o.org_type = ${i++}`); params.push(org_type); }
 if (psu === 'true') { conditions.push(`o.org_type = 'PSU'`); }
 if (verified === 'true') { conditions.push(`j.is_verified = true`); }
 if (featured === 'true') { conditions.push(`j.is_featured = true`); }
 if (closing_soon === 'true') { conditions.push(`j.last_date BETWEEN CURRENT_DATE AND CURRENT_DATE+10`); }
 if (search) { conditions.push(`(j.title ILIKE ${i++} OR j.description ILIKE ${i++})`); params.push('%'+search+'%','%'+search+'%'); i++; }
 const where = conditions.join(' AND ');
 const orderBy = sort === 'closing' ? 'j.last_date ASC NULLS LAST' : 'j.posted_date DESC NULLS LAST';
 const lim = Math.min(parseInt(limit)||20, 100);
 const off = (Math.max(parseInt(page)||1, 1)-1)*lim;
 const countR = await pool.query(`SELECT COUNT(*) FROM jobs j LEFT JOIN organizations o ON o.id=j.organization_id WHERE ${where}`, params);
 const jobsR = await pool.query(`SELECT j.id,j.title,j.job_type,j.location_state,j.location_city,j.vacancies,j.pay_level,j.salary_min,j.salary_max,j.last_date,j.posted_date,j.is_verified,j.is_featured,j.apply_url,j.notification_url,j.description,j.slug,o.name as org_name,o.short_name as org_short,o.org_type,o.website FROM jobs j LEFT JOIN organizations o ON o.id=j.organization_id WHERE ${where} ORDER BY ${orderBy} LIMIT ${i++} OFFSET ${i++}`, [...params, lim, off]);
 const total = parseInt(countR.rows[0].count);
 res.json({ jobs: jobsR.rows, pagination: { total, page: parseInt(page)||1, limit: lim, pages: Math.ceil(total/lim) } });
 } catch(e) { res.status(500).json({error: e.message}); }
});
app.get('/api/filters', async (req, res) => {
 try {
 const [states, types, orgs] = await Promise.all([
 pool.query('SELECT DISTINCT location_state, COUNT(*) as count FROM jobs WHERE is_active=true GROUP BY location_state ORDER BY count DESC'),
 pool.query('SELECT DISTINCT job_type, COUNT(*) as count FROM jobs WHERE is_active=true GROUP BY job_type ORDER BY count DESC'),
 pool.query('SELECT o.id, o.name, o.short_name, o.org_type, COUNT(j.id) as job_count FROM organizations o LEFT JOIN jobs j ON j.organization_id=o.id AND j.is_active=true GROUP BY o.id,o.name,o.short_name,o.org_type HAVING COUNT(j.id)>0 ORDER BY job_count DESC')
 ]);
 res.json({ states: states.rows, job_types: types.rows, organizations: orgs.rows });
 } catch(e) { res.status(500).json({error: e.message}); }
});
app.get('/api/jobs/:id', async (req, res) => {
 try {
 const r = await pool.query('SELECT j.*,o.name as org_name,o.short_name as org_short,o.org_type,o.website FROM jobs j LEFT JOIN organizations o ON o.id=j.organization_id WHERE (j.id::text=$1 OR j.slug=$1) AND j.is_active=true', [req.params.id]);
 if (!r.rows.length) return res.status(404).json({error:'Not found'});
 pool.query('UPDATE jobs SET view_count=view_count+1 WHERE id=$1', [r.rows[0].id]).catch(()=>{});
 res.json({ job: r.rows[0] });
 } catch(e) { res.status(500).json({error: e.message}); }
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log('MedOfficer API running on port ' + PORT));
