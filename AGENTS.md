# Repository instructions

## Commit, pull request, and branch preferences

Omit optional AI attribution from new commit messages and pull request descriptions, including AI Co-Authored-By, Generated-by text, and Claude session links or trailers. Name new branches for the task without agent or model names, subject to system or harness naming requirements. Preserve actual authorship, required provenance, license notices, security and audit records, and attribution required by higher-priority policies or system instructions.

## The company name is "Suede"

Owner direction, 2026-11-21. The company is "Suede"; sub-brands drop "AI" and "Labs" ("Suede Developer Docs", "Suede SEO", "Suede GEO", "Suede IP Registry", "Suede Agent Studio"). Suede's own copy spells "full-stack" with the hyphen. "Suede AI", "Suede Labs" and "Suede Labs AI" are former names: in public copy they appear only as the Organization's schema `alternateName` (`["Suede AI", "Suede Labs AI", "Suede Labs"]` in `index.html`), the one alias line "Suede was formerly known as Suede AI and Suede Labs." in `llms.txt` and `ai-instructions.html` (and so once in `llms-full.txt`), and verbatim third-party text (the Business Insider headline, The Manifest's "Suede AI SEO" listing). Domains, URLs, the `Suede-AI` GitHub org and the `suede-ai` Python package keep their spelling. `scripts/verify-site.mjs` fails any other "Suede AI" or "Suede Labs" in a served file; when it fails, write "Suede", and add an allowed literal only for verbatim third-party text.
