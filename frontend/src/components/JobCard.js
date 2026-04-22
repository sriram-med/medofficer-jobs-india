import { esc, formatDate, formatSalary, daysUntil } from '../utils/jobs.js';

export function JobCard(job) {
  const days = daysUntil(job.deadline);
  const urgency = days === null ? 'Open' : days < 0 ? 'Closed' : days <= 3 ? `Closing in ${days}d` : `${days} days left`;
  const statusClass = days !== null && days <= 3 && days >= 0 ? 'warn' : '';

  return `
    <article class="job-card">
      <header>
        <div>
          <p class="org">${esc(job.organization)}</p>
          <h3>${esc(job.title)}</h3>
        </div>
        <div class="badges">
          ${job.verified ? '<span class="badge verified">Verified</span>' : ''}
          <span class="badge">${esc(job.sourceLabel)}</span>
        </div>
      </header>

      <div class="meta-grid">
        <p><strong>Location:</strong> ${esc(job.location)}</p>
        <p><strong>Salary:</strong> ${formatSalary(job.salary)}</p>
        <p><strong>Deadline:</strong> ${formatDate(job.deadline)}</p>
        <p><strong>Status:</strong> <span class="status ${statusClass}">${esc(job.status)} • ${urgency}</span></p>
      </div>

      <div class="tags">
        ${job.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}
      </div>

      <footer>
        <div class="cta-row">
          ${job.sourceUrl ? `<a href="${esc(job.sourceUrl)}" target="_blank" rel="noopener" class="btn btn-link">Official notification</a>` : ''}
          ${job.applyUrl ? `<a href="${esc(job.applyUrl)}" target="_blank" rel="noopener" class="btn btn-primary">Apply now</a>` : '<span class="btn btn-disabled">Apply link pending</span>'}
        </div>
        <small>Last checked: ${formatDate(job.lastChecked)}</small>
      </footer>
    </article>
  `;
}
