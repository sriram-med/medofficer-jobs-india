export function SkeletonCards(count = 6) {
  return `
    <div class="jobs grid">
      ${Array.from({ length: count }, () => `
        <article class="job-card skeleton">
          <div class="sk-line w-60"></div>
          <div class="sk-line w-90"></div>
          <div class="sk-line w-40"></div>
          <div class="sk-grid">
            <div class="sk-line"></div>
            <div class="sk-line"></div>
            <div class="sk-line"></div>
            <div class="sk-line"></div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

export function EmptyState(message = 'No jobs match your current filters.') {
  return `
    <section class="status-state empty-state">
      <h2>No results yet</h2>
      <p>${message}</p>
      <p>Try removing one quick filter or changing sort to “Latest”.</p>
    </section>
  `;
}

export function ErrorState() {
  return `
    <section class="status-state error-state">
      <h2>We couldn’t load jobs right now.</h2>
      <p>Please retry in a moment. Data sources may be under maintenance.</p>
      <button id="retry-btn" class="btn btn-primary">Retry</button>
    </section>
  `;
}
