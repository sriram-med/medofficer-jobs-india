export function TrustStrip({ checked = 0, verified = 0, sources = 0 }) {
  return `
    <section class="trust-strip">
      <div><strong>${verified}</strong><span>Verified jobs</span></div>
      <div><strong>${sources}</strong><span>Official source domains</span></div>
      <div><strong>${checked}</strong><span>Records checked in last 24h</span></div>
    </section>
  `;
}
