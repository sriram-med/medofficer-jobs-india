export const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export function formatDate(value) {
  if (!value) return 'TBD';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatSalary(value) {
  if (value === null || value === undefined || value === '') return 'As per notification';
  if (typeof value === 'number') return `₹${value.toLocaleString('en-IN')}`;
  return esc(value);
}

export function daysUntil(dateValue) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

export function toEpoch(value) {
  if (!value) return 0;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function normalizeJob(job) {
  const location = [job.location_city, job.location_district, job.location_state].filter(Boolean).join(', ') || 'All India';
  const sourceLabel = (job.source_name || job.source_type || 'Official Source').toString();
  const tags = [job.specialty, job.category, job.job_type, job.org_type].filter(Boolean).slice(0, 4);

  return {
    ...job,
    id: job.id || job.job_id || `${job.title || 'job'}-${job.last_date || Math.random().toString(36).slice(2)}`,
    organization: job.org_name || job.organization || 'Government Health Department',
    title: job.title || 'Medical Officer',
    location,
    salary: job.salary || job.salary_range || job.pay_scale,
    deadline: job.last_date || job.deadline,
    postedAt: job.created_at || job.published_at || job.posted_on,
    lastChecked: job.last_checked_at || job.scraped_at || job.updated_at,
    verified: Boolean(job.is_verified || job.verified),
    sourceLabel,
    sourceUrl: job.source_url || job.notification_url || job.official_url,
    applyUrl: job.apply_url,
    status: job.status || (daysUntil(job.last_date || job.deadline) < 0 ? 'Closed' : 'Active'),
    score: Number(job.relevance_score || job.score || 0),
    tags,
    state: (job.location_state || '').toLowerCase(),
    isPsu: /psu|public sector|corporation|limited/i.test(`${job.org_type || ''} ${job.organization_type || ''} ${job.org_name || ''}`)
  };
}

export function sortJobs(jobs, sortBy) {
  const byLatest = (a, b) => toEpoch(b.postedAt) - toEpoch(a.postedAt);
  if (sortBy === 'deadline') return [...jobs].sort((a, b) => toEpoch(a.deadline) - toEpoch(b.deadline));
  if (sortBy === 'salary') {
    return [...jobs].sort((a, b) => {
      const an = Number(String(a.salary || '').replace(/[^\d.]/g, '')) || 0;
      const bn = Number(String(b.salary || '').replace(/[^\d.]/g, '')) || 0;
      return bn - an;
    });
  }
  if (sortBy === 'relevance') return [...jobs].sort((a, b) => b.score - a.score);
  return [...jobs].sort(byLatest);
}
