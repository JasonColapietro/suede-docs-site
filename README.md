# Suede Docs Site

Static documentation index for `docs.suedeai.ai`. The canonical Suede Labs AI developer documentation lives on GitHub at [Suede-AI/suede-docs](https://github.com/Suede-AI/suede-docs) and is mirrored publicly at [JasonColapietro/suede-docs](https://github.com/JasonColapietro/suede-docs).

The site is a single static `index.html` with no build step. `suede-docs-og.svg` is the editable source for the committed 1200×630 `suede-docs-og.png` social card.

## Verify

```bash
node scripts/verify-site.mjs
```

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
