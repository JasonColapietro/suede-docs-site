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
  // API guides (2026-10-11). The 2026-09-08 research has no API-docs terms,
  // so these name what each page covers: the endpoint, protocol and package.
  "quickstart.html": withBrand([
    "x402 quickstart",
    "x402 payment flow",
    "402 payment required",
    "PAYMENT-SIGNATURE header",
    "EIP-3009 transferWithAuthorization",
    "USDC on Base",
  ]),
  "endpoints.html": withBrand([
    "x402 api endpoints",
    "pay per call api",
    "ai music api",
    "ai video api",
    "ai image api",
    "USDC on Base",
  ]),
  "endpoints/create-music.html": withBrand([
    "ai music generation api",
    "text to music api",
    "create music api",
    "x402 music api",
  ]),
  "endpoints/agent-video.html": withBrand([
    "ai video generation api",
    "text to video api",
    "x402 video api",
    "video with native audio",
  ]),
  "endpoints/agent-image.html": withBrand([
    "ai image generation api",
    "text to image api",
    "x402 image api",
    "cover art api",
  ]),
  "errors.html": withBrand([
    "x402 errors",
    "402 payment required",
    "api rate limits",
    "idempotency key",
    "api versioning",
  ]),
  "python-sdk.html": withBrand([
    "suede-ai python sdk",
    "x402 python client",
    "pip install suede-ai",
    "EIP-3009 signing",
  ]),
  "discovery.html": withBrand([
    "x402 discovery",
    "well-known x402",
    "openapi",
    "a2a agent card",
    "mcp server",
    "agentic commerce manifest",
  ]),
};
