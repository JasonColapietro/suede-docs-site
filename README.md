# Suede Docs Site

Static documentation index for `docs.suedeai.ai`. The canonical Suede AI developer documentation lives on GitHub at [Suede-AI/suede-docs](https://github.com/Suede-AI/suede-docs) and is mirrored publicly at [JasonColapietro/suede-docs](https://github.com/JasonColapietro/suede-docs).

The site is static HTML with no build step: `index.html` (overview and docs index), the API guides (`quickstart.html`, `endpoints.html`, `endpoints/*.html`, `errors.html`, `python-sdk.html`, `discovery.html`) and `ai-instructions.html`. `vercel.json` sets `cleanUrls`, so `quickstart.html` is served at `/quickstart`, and canonicals use that form. `suede-docs-og.svg` is the editable source for the committed 1200×630 `suede-docs-og.png` social card.

The API guides document the live endpoints on `app.suedeai.ai`. Every price, field and response on them comes from the live discovery documents (`/.well-known/x402`, `/openapi.json`, `/api/v1/catalog`) or from a live request, and each page lists its sources. Re-check them against those documents when the catalog changes. The guides share the home page `<style>` block, and `scripts/verify-site.mjs` enforces it, along with the prev/next reading order, sitemap and `llms.txt` entries, and the keyword map.

## Verify

```bash
node scripts/build-docs-seo.mjs   # after editing any page
node scripts/verify-site.mjs
```

`scripts/build-docs-seo.mjs` writes two derived files from the pages: the JSON-LD block (WebPage or TechArticle plus BreadcrumbList) between the `docs-jsonld` markers in every page except `index.html`, and `llms-full.txt`, the full text of every page as Markdown. `verify-site.mjs` fails when either is stale.

## Deploy

Deployed on Vercel from `index.html` + `vercel.json`.

**Pushing to `main` deploys production.** The Vercel project `suede-docs-site`
(team `suede-ai-64d39175`) was connected to this repo on 2026-08-23; Root
Directory is the repo root, and the `ignoreCommand` in `vercel.json` skips
preview builds only. Before that it was CLI-deploy only, which is why merged
PRs used to change nothing live — production once sat 37 days stale behind
`main`.

Manual deploy is now a fallback, and needs an explicit link first because this
repo has no committed `.vercel/` (and worktrees never inherit one). Without the
link step, `vercel --prod` silently creates a **new** project named after the
directory and leaves `docs.suedeai.ai` untouched:

```bash
vercel link --yes --project suede-docs-site --scope suede-ai-64d39175
vercel --prod --yes --scope suede-ai-64d39175   # expect: Aliased docs.suedeai.ai
```
