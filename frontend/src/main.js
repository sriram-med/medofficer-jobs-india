import { Hero } from './components/Hero.js';
import { MetricsStrip } from './components/MetricsStrip.js';
import { FilterBar } from './components/FilterBar.js';
import { JobsSection } from './components/Section.js';
import { StatesFocus } from './components/StatesFocus.js';
import { TrustStrip } from './components/TrustStrip.js';
import { SkeletonCards, EmptyState, ErrorState } from './components/StatusViews.js';
import { normalizeJob, sortJobs, daysUntil } from './utils/jobs.js';

const REMOTE_API = 'https://medofficer-jobs-india-production.up.railway.app';

const state = {
  jobs: [],
  stats: {},
  loading: true,
  failed: false,
  activeChip: 'all',
  view: 'grid',
  sortBy: 'latest'
};

const app = document.getElementById('app');

function applyChipFilters(jobs) {
  switch (state.activeChip) {
    case 'verified': return jobs.filter((j) => j.verified);
    case 'telangana': return jobs.filter((j) => /telangana/.test(j.state));
    case 'ap': return jobs.filter((j) => /andhra/.test(j.state));
    case 'psu': return jobs.filter((j) => j.isPsu);
    case 'closing': return jobs.filter((j) => {
      const d = daysUntil(j.deadline);
      return d !== null && d >= 0 && d <= 7;
    });
    default: return jobs;
  }
}

function render() {
  if (state.loading) {
    app.innerHTML = `${Hero({ total: 0, checkedAt: 'syncing...' })}${SkeletonCards(9)}`;
    return;
  }

  if (state.failed) {
    app.innerHTML = `${Hero({ total: 0, checkedAt: 'unavailable' })}${ErrorState()}`;
    document.getElementById('retry-btn')?.addEventListener('click', loadData);
    return;
  }

  const filtered = sortJobs(applyChipFilters(state.jobs), state.sortBy);

  const featured = filtered.filter((j) => j.verified).slice(0, 6);
  const newlyAdded = [...filtered].slice(0, 8);
  const closingSoon = filtered
    .filter((j) => {
      const d = daysUntil(j.deadline);
      return d !== null && d >= 0 && d <= 10;
    })
    .slice(0, 8);
  const psuJobs = filtered.filter((j) => j.isPsu).slice(0, 8);

  const telangana = filtered.filter((j) => /telangana/.test(j.state)).slice(0, 4);
  const ap = filtered.filter((j) => /andhra/.test(j.state)).slice(0, 4);
  const allIndia = filtered.filter((j) => /all india|india/.test(j.location.toLowerCase())).slice(0, 4);

  const checkedLast24h = filtered.filter((j) => {
    if (!j.lastChecked) return false;
    const d = new Date(j.lastChecked);
    return Date.now() - d.getTime() <= 24 * 60 * 60 * 1000;
  }).length;

  app.innerHTML = `
    ${Hero({ total: filtered.length || state.jobs.length, checkedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) })}
    ${MetricsStrip(state.stats)}
    ${FilterBar(state)}
    ${filtered.length === 0 ? EmptyState() : `
      ${JobsSection({ id: 'featured-jobs', title: 'Featured verified jobs', subtitle: 'Highest confidence roles from trusted official notices.', jobs: featured.length ? featured : filtered.slice(0, 6), view: state.view })}
      ${JobsSection({ id: 'newly-added', title: 'Newly added', subtitle: 'Most recent postings pulled into the feed.', jobs: newlyAdded, view: state.view })}
      ${JobsSection({ id: 'closing-soon', title: 'Closing soon', subtitle: 'Apply before these deadlines close.', jobs: closingSoon, view: state.view })}
      ${JobsSection({ id: 'psu-jobs', title: 'PSU jobs', subtitle: 'Public sector and corporation opportunities.', jobs: psuJobs.length ? psuJobs : filtered.slice(0, 6), view: state.view })}
      ${StatesFocus({ telangana, ap, allIndia, view: state.view })}
      ${TrustStrip({ checked: checkedLast24h, verified: filtered.filter((j) => j.verified).length, sources: new Set(filtered.map((j) => j.sourceLabel)).size })}
    `}
  `;

  bindControls();
}

function bindControls() {
  document.querySelectorAll('[data-chip]').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.activeChip = chip.dataset.chip;
      render();
    });
  });

  document.querySelectorAll('[data-view]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      state.view = toggle.dataset.view;
      render();
    });
  });

  document.getElementById('sort-by')?.addEventListener('change', (event) => {
    state.sortBy = event.target.value;
    render();
  });
}

async function request(path, params = {}) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const tryUrls = [url.toString(), `${REMOTE_API}${path}${url.search}`];

  for (const endpoint of tryUrls) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // continue to fallback source
    }
  }
  throw new Error(`Request failed for ${path}`);
}

async function loadData() {
  state.loading = true;
  state.failed = false;
  render();

  try {
    const [jobsData, stats] = await Promise.all([
      request('/api/jobs', { limit: '60' }),
      request('/api/jobs/stats')
    ]);

    state.jobs = (jobsData.jobs || []).map(normalizeJob);
    state.stats = stats || {};
    state.loading = false;
    render();
  } catch {
    state.loading = false;
    state.failed = true;
    render();
  }
}

loadData();
