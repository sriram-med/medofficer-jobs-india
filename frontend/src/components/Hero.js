export function Hero({ total = 0, checkedAt = 'just now' }) {
  return `
    <section class="hero">
      <div>
        <p class="eyebrow">Verified Govt Medical Officer Jobs</p>
        <h1>Find trusted medical officer openings in one clean feed.</h1>
        <p class="subhead">Freshly checked listings from central, PSU, and state sources with direct notification and apply links.</p>
        <div class="hero-cta-row">
          <a class="btn btn-primary" href="#featured-jobs">Browse verified jobs</a>
          <a class="btn btn-secondary" href="#newly-added">See newly added</a>
        </div>
      </div>
      <div class="live-strip">
        <span class="pulse-dot" aria-hidden="true"></span>
        Live status: <strong>${total.toLocaleString('en-IN')} active roles</strong> • last sync ${checkedAt}
      </div>
    </section>
  `;
}
