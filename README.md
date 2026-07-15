# Suede Docs Site

Static documentation index for `docs.suedeai.ai`. The canonical Suede Labs AI developer documentation lives on GitHub at [Suede-AI/suede-docs](https://github.com/Suede-AI/suede-docs) and is mirrored publicly at [JasonColapietro/suede-docs](https://github.com/JasonColapietro/suede-docs).

The site is a single static `index.html` with no build step. `suede-docs-og.svg` is the editable source for the committed 1200×630 `suede-docs-og.png` social card.

## Verify

```bash
node scripts/verify-site.mjs
```

## Deploy

Deployed on Vercel from `index.html` + `vercel.json`.
