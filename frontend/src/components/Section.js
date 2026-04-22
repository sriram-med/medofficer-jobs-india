import { JobCard } from './JobCard.js';

export function JobsSection({ id, title, subtitle, jobs, view = 'grid' }) {
  return `
    <section id="${id}" class="jobs-section">
      <div class="section-head">
        <h2>${title}</h2>
        <p>${subtitle}</p>
      </div>
      <div class="jobs ${view}">
        ${jobs.map(JobCard).join('')}
      </div>
    </section>
  `;
}
