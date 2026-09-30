// Central page -> <meta name="keywords"> map for docs.suedeai.ai.
//
// Keys are paths relative to the repo root (the site is served as-is).
// scripts/verify-site.mjs fails when an indexable page lacks its tag or the
// tag drifts from this map. Terms come from what the page covers, checked
// against the measured keyword research in ~/seo (keywords-report.json,
// 2026-09-08). Brand terms go last; the company is "Suede AI".

const BRAND = ["Suede AI"];

function withBrand(terms) {
  const seen = new Set();
  return [...terms, ...BRAND].filter((term) => {
    const key = term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const SEO_KEYWORDS = {
  "index.html": withBrand([
    "Suede AI developer docs",
    "x402 api",
    "x402 agent payments",
    "agent commerce api",
    "programmable ip",
    "creator ownership",
    "content provenance",
    "rights metadata",
    "licensing workflows",
  ]),
};
