# MedOfficer Jobs India V2

Focused rebuild of the product into a premium, high-trust Medical Officer jobs platform for India.

## What this version changes

- Replaces a cluttered dashboard feel with a narrow homepage built around job discovery.
- Pushes official links, source confidence, verification badges, and last-checked timestamps into every listing.
- Keeps only high-value sections: hero search, featured jobs, PSU jobs, Telangana and Andhra Pradesh shortcuts, closing soon, latest verified.
- Uses a richer data model for salary, qualification, vacancies, selection mode, tags, expiry logic, and trust metadata.
- Includes a scraper foundation for official-source-first ingestion rather than low-signal aggregation.

## Files

- [index.html](C:\Users\srikr\Documents\Codex\2026-04-21-the-current-website-is-not-good\index.html)
- [styles.css](C:\Users\srikr\Documents\Codex\2026-04-21-the-current-website-is-not-good\styles.css)
- [app.js](C:\Users\srikr\Documents\Codex\2026-04-21-the-current-website-is-not-good\app.js)
- [jobs-data.js](C:\Users\srikr\Documents\Codex\2026-04-21-the-current-website-is-not-good\jobs-data.js)
- [scraper/README.md](C:\Users\srikr\Documents\Codex\2026-04-21-the-current-website-is-not-good\scraper\README.md)
- [scraper/job.schema.json](C:\Users\srikr\Documents\Codex\2026-04-21-the-current-website-is-not-good\scraper\job.schema.json)
- [scraper/sources.js](C:\Users\srikr\Documents\Codex\2026-04-21-the-current-website-is-not-good\scraper\sources.js)

## Notes

- The UI is static and dependency-free so it can be opened directly in a browser.
- The seeded dataset is curated to demonstrate the V2 experience and the trust-oriented data contract.
- For production use, swap the seed data with scraper outputs that pass verification and expiry checks.
