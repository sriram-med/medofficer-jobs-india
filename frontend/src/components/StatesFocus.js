import { JobCard } from './JobCard.js';

export function StatesFocus({ telangana, ap, allIndia, view = 'grid' }) {
  const columns = [
    { title: 'Telangana', jobs: telangana },
    { title: 'Andhra Pradesh', jobs: ap },
    { title: 'All India', jobs: allIndia }
  ];

  return `
    <section class="jobs-section">
      <div class="section-head">
        <h2>State focus</h2>
        <p>Scan openings by state priority in one view.</p>
      </div>
      <div class="state-columns">
        ${columns.map((col) => `
          <div class="state-col">
            <h3>${col.title}</h3>
            <div class="jobs ${view}">
              ${col.jobs.length ? col.jobs.map(JobCard).join('') : '<div class="empty-panel">No current openings in this segment.</div>'}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}
