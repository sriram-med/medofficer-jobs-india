export function MetricsStrip(stats) {
  const cards = [
    { label: 'Active jobs', value: stats.total_active || 0 },
    { label: 'Posted this week', value: stats.posted_this_week || 0 },
    { label: 'Closing this week', value: stats.closing_this_week || 0 },
    { label: 'Verified sources', value: stats.verified_sources || 0 }
  ];

  return `
    <section class="metrics-strip">
      ${cards.map((item) => `
        <article class="metric-card">
          <strong>${Number(item.value).toLocaleString('en-IN')}</strong>
          <span>${item.label}</span>
        </article>
      `).join('')}
    </section>
  `;
}
