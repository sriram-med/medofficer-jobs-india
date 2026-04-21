# Scraper Pipeline V2

This scraper design is built for yield and trust, not volume.

## Principles

- Official-source-first: prioritize direct PSU, government, NHM, DME, DHS, HMFW and district sites.
- High-signal only: if a listing does not have a trustworthy notification or official source page, it should not surface on the homepage.
- Dedupe aggressively by organization, title, last date, and official URL fingerprints.
- Preserve trust metadata: source type, source confidence, last checked time, extraction completeness.
- Expire stale rows automatically using `lastDate` and page freshness rules.

## Tier 1 source groups

- Core PSUs: NTPC, NPCIL, BEL, BHEL, ONGC, IOCL, BPCL, HPCL, SAIL, Coal India, ECL, GAIL, HAL
- Central public health and institutes: ESIC, AIIMS, Indian Railways
- State health sources: NHM portals, HMFW Andhra Pradesh, Telangana health portals, DME Telangana, district DHS or DMHO sources

## Recommended pipeline flow

1. Fetch source pages from the official careers or recruitment endpoints.
2. Extract linked notification PDFs and apply pages.
3. Normalize into the job schema.
4. Score source confidence.
5. Deduplicate against existing listings using source URLs and canonical fingerprints.
6. Mark `verified=true` only when the official notification or official recruitment page is available.
7. Expire jobs whose last date has passed or whose source page is removed.
8. Publish only the top 20 to 50 strongest active jobs to the homepage feed.

## Homepage curation rules

- Prefer verified official-source roles.
- Prefer currently active rows with meaningful metadata completion.
- Prefer PSU, Railways, ESIC, AIIMS, NHM and AP/Telangana high-yield government openings.
- Down-rank watchlist rows with weak extraction, missing salary, or no direct PDF.
- Never show dummy links, empty widgets, or zero-value cards.
