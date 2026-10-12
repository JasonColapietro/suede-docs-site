import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { SEO_KEYWORDS } from "./seo-keywords.mjs";
import { buildDocsSeo } from "./build-docs-seo.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const robots = readFileSync(join(root, "robots.txt"), "utf8");
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const llms = readFileSync(join(root, "llms.txt"), "utf8");

const expected = {
  canonical: "https://docs.suedeai.ai/",
  title: "Suede AI Developer Docs | x402 APIs and Creator IP",
  description:
    "Read Suede AI developer docs for programmable IP, creator ownership, provenance, licensing, and x402 agent-commerce APIs. Browse the canonical GitHub source.",
  h1: "Suede AI developer docs for programmable IP",
  image: "https://docs.suedeai.ai/suede-docs-og.png",
  imagePath: join(root, "suede-docs-og.png"),
};

function attributes(tag) {
  const parsed = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gis)) {
    parsed[match[1].toLowerCase()] = match[3];
  }
  return parsed;
}

const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => attributes(match[0]));

function metaContent(key, kind = "name") {
  return meta.find((item) => item[kind] === key)?.content;
}

const title = html.match(/<title>(.*?)<\/title>/is)?.[1]?.trim();
const h1s = [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gis)].map((match) =>
  match[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(),
);
const canonical = links.find((item) => item.rel === "canonical")?.href;

assert.equal(title, expected.title, "SEO title must match the concise docs intent");
assert.ok(title.length <= 60, `SEO title is ${title.length} characters; maximum is 60`);
assert.equal(metaContent("description"), expected.description);
assert.ok(expected.description.length <= 160);
assert.equal(canonical, expected.canonical);
assert.deepEqual(h1s, [expected.h1], "page must have one intent-matched H1");
assert.equal(metaContent("robots"), "index, follow");

assert.equal(metaContent("og:title", "property"), "Suede AI Developer Docs: Programmable IP and x402 APIs");
assert.equal(metaContent("og:description", "property"), expected.description);
assert.equal(metaContent("og:url", "property"), expected.canonical);
assert.equal(metaContent("og:type", "property"), "website");
assert.equal(metaContent("og:image", "property"), expected.image);
assert.equal(metaContent("og:image:width", "property"), "1200");
assert.equal(metaContent("og:image:height", "property"), "630");
assert.equal(metaContent("og:image:type", "property"), "image/png");
assert.equal(metaContent("twitter:card"), "summary_large_image");
assert.equal(metaContent("twitter:title"), "Suede AI Developer Docs: Programmable IP and x402 APIs");
assert.equal(metaContent("twitter:image"), expected.image);

assert.ok(existsSync(expected.imagePath), "local social-card PNG is missing");
const png = readFileSync(expected.imagePath);
assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
assert.equal(png.readUInt32BE(16), 1200, "social-card width must be 1200px");
assert.equal(png.readUInt32BE(20), 630, "social-card height must be 630px");

const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
assert.equal(jsonLdBlocks.length, 1, "page must contain one JSON-LD graph");
const schema = JSON.parse(jsonLdBlocks[0][1]);
assert.equal(schema["@context"], "https://schema.org");
assert.ok(Array.isArray(schema["@graph"]));

const byId = new Map(schema["@graph"].map((node) => [node["@id"], node]));
const organization = byId.get("https://suedeai.ai/#organization");
const website = byId.get("https://docs.suedeai.ai/#website");
const webpage = byId.get("https://docs.suedeai.ai/#webpage");
const image = byId.get("https://docs.suedeai.ai/#primaryimage");

assert.equal(organization?.["@type"], "Organization");
assert.ok(organization?.logo, "Organization schema must expose a verified logo");
// The founder edge and its Person node were stripped in #2 along with the
// unverifiable claims they carried (a "Founder and CEO" jobTitle, a Forbes
// line, a personal sameAs list, an author byline). The edge itself is estate
// canon -- suede-brand-domains/lib/canon.ts defines both @ids -- so it is back,
// but only in the minimal form. These assertions keep the claims out.
assert.deepEqual(
  organization?.founder,
  { "@id": "https://suedeai.ai/founder#person" },
  "Organization must point at the canonical estate Person @id",
);
assert.ok(!organization?.sameAs?.some((url) => url.includes("linkedin.com/in/")));
assert.equal(website?.["@type"], "WebSite");
assert.deepEqual(website?.publisher, { "@id": "https://suedeai.ai/#organization" });
assert.equal(webpage?.["@type"], "WebPage");
assert.deepEqual(webpage?.isPartOf, { "@id": "https://docs.suedeai.ai/#website" });
assert.deepEqual(webpage?.about, { "@id": "https://suedeai.ai/#organization" });
assert.deepEqual(webpage?.primaryImageOfPage, { "@id": "https://docs.suedeai.ai/#primaryimage" });
assert.equal(image?.["@type"], "ImageObject");
assert.equal(image?.width, 1200);
assert.equal(image?.height, 630);
const people = schema["@graph"].filter((node) => node["@type"] === "Person");
assert.equal(people.length, 1, "graph must carry exactly one Person node");
assert.deepEqual(
  people[0],
  {
    "@type": "Person",
    "@id": "https://suedeai.ai/founder#person",
    name: "Jason Colapietro",
    url: "https://suedeai.ai/founder",
  },
  "the Person node must stay minimal: no jobTitle, bio, alternateName, or sameAs",
);
assert.ok(!schema["@graph"].some((node) => node["@type"] === "TechArticle"));

const publicCopy = `${html}\n${llms}`;
for (const unsafe of [
  /Forbes contributor/i,
  /founded by/i,
  /20 paid x402 endpoints/i,
  /prices range/i,
  /every Suede site/i,
  /github\.com\/Suede-AI\/suede-x402-acp/i,
]) {
  assert.ok(!unsafe.test(publicCopy), `unsafe or unverifiable public claim remains: ${unsafe}`);
}

// Icons must be local files, not a cross-host reference, and /favicon.ico must
// exist: browsers and Google fall back to that path regardless of <link>.
for (const [file, magic] of [
  ["icon.png", [137, 80, 78, 71]],
  ["apple-touch-icon.png", [137, 80, 78, 71]],
  ["favicon.ico", [0, 0, 1, 0]],
]) {
  const path = join(root, file);
  assert.ok(existsSync(path), `${file} is missing`);
  assert.deepEqual([...readFileSync(path).subarray(0, 4)], magic, `${file} has the wrong file header`);
}
assert.match(html, /<link rel="icon" href="\/favicon\.ico"/);
assert.ok(!/href="https:\/\/[^"]*icon\.png"/.test(html), "icons must be served from this host, not cross-host");

// The primary content block must be a <main> landmark. Lighthouse mobile
// scored landmark-one-main 0 while it was a bare <div class="wrap">, which
// leaves screen-reader users with no way to skip to the content.
const mainOpeners = [...html.matchAll(/<main\b[^>]*>/gi)].map((match) => match[0]);
assert.equal(mainOpeners.length, 1, "page must have exactly one <main> landmark");
assert.match(mainOpeners[0], /class="wrap"/, "the <main> landmark must be the page content wrapper");
assert.equal([...html.matchAll(/<\/main>/gi)].length, 1, "the <main> landmark must be closed once");
assert.ok(!/<div class="wrap"/.test(html), "the content wrapper must not fall back to a bare <div>");

// The Google Fonts stylesheet must not block the first paint. It is fetched
// with preload and promoted to a stylesheet on load, with a <noscript> copy so
// scripting-off browsers still get the faces.
const withoutNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/gi, "");
const fontLinks = [...withoutNoscript.matchAll(/<link\b[^>]*fonts\.googleapis\.com\/css2[^>]*>/gi)].map(
  (match) => match[0],
);
assert.equal(fontLinks.length, 1, "expected one Google Fonts stylesheet reference outside <noscript>");
assert.match(fontLinks[0], /rel="preload"/, "the Google Fonts stylesheet must load asynchronously, not render-blocking");
assert.match(fontLinks[0], /\bas="style"/, "the font preload must declare as=\"style\"");
assert.match(
  html,
  /<noscript><link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2/,
  "scripting-off browsers need a plain stylesheet fallback",
);

assert.match(html, /https:\/\/app\.suedeai\.ai\/api\/v1\/catalog/);
assert.match(llms, /https:\/\/app\.suedeai\.ai\/api\/v1\/catalog/);
assert.match(robots, /User-agent: GPTBot\s+Allow: \//);
assert.match(robots, /User-agent: \*\s+Allow: \//);
assert.match(robots, /Sitemap: https:\/\/docs\.suedeai\.ai\/sitemap\.xml/);
assert.match(sitemap, /<loc>https:\/\/docs\.suedeai\.ai\/<\/loc>/);
// The three freshness signals must agree. Pinning one date here is what let
// them drift apart last time: schema said 2026-07-15 while the page had
// changed 2026-08-20. Assert they match each other instead of a literal.
const schemaDate = html.match(/"dateModified":\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
const footerDate = html.match(/Page last updated (\d{4}-\d{2}-\d{2})\./)?.[1];
const sitemapDate = sitemap.match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/)?.[1];
assert.ok(schemaDate, "schema dateModified is missing");
assert.equal(footerDate, schemaDate, "footer date must match schema dateModified");
assert.equal(sitemapDate, schemaDate, "sitemap lastmod must match schema dateModified");

// A date is a material claim, so the schema publish date needs a prose
// counterpart on the page rather than living in JSON-LD alone.
const schemaPublished = html.match(/"datePublished":\s*"(\d{4}-\d{2}-\d{2})"/)?.[1];
const footerPublished = html.match(/Published (\d{4}-\d{2}-\d{2})\./)?.[1];
assert.ok(schemaPublished, "schema datePublished is missing");
assert.equal(footerPublished, schemaPublished, "footer prose must state the schema datePublished");

// Trust signals: the surface links to a privacy policy and a contact route.
assert.match(html, /href="https:\/\/suedeai\.ai\/privacy"/, "footer must link to the privacy policy");
assert.match(html, /href="https:\/\/suedeai\.ai\/contact"/, "footer must link to a contact page");
assert.match(llms, /github\.com\/Suede-AI\/suede-docs/);

// Meta keywords: every indexable page carries exactly one tag matching the
// central map in scripts/seo-keywords.mjs.
for (const [page, keywords] of Object.entries(SEO_KEYWORDS)) {
  const source = readFileSync(join(root, page), "utf8");
  const pageRobots = source.match(/<meta\s+name="robots"\s+content="([^"]*)"/i)?.[1] ?? "";
  assert.ok(!/noindex/i.test(pageRobots), `${page} is noindex and should not be in the keywords map`);
  const tags = [...source.matchAll(/<meta\s+name="keywords"\s+content="([^"]*)"\s*\/?>/gi)];
  assert.equal(tags.length, 1, `${page} must carry exactly one <meta name="keywords">`);
  assert.equal(tags[0][1].replace(/&amp;/g, "&"), keywords.join(", "), `${page} keywords must match scripts/seo-keywords.mjs`);
  assert.ok(keywords.length >= 4, `${page} needs at least four keywords`);
}
assert.ok(SEO_KEYWORDS["index.html"], "index.html must have a keywords map entry");

// API guides. The array is the reading order: it drives each page's
// rel="prev"/rel="next" links, and the home page links forward to the first.
// Every guide is self-canonical, indexable, in the sitemap and llms.txt,
// linked from the home page docs index, and shares the home page <style>.
const ORIGIN = "https://docs.suedeai.ai";
const DOCS_PAGES = [
  { file: "quickstart.html", path: "/quickstart" },
  { file: "endpoints.html", path: "/endpoints" },
  { file: "endpoints/create-music.html", path: "/endpoints/create-music" },
  { file: "endpoints/agent-video.html", path: "/endpoints/agent-video" },
  { file: "endpoints/agent-image.html", path: "/endpoints/agent-image" },
  { file: "errors.html", path: "/errors" },
  { file: "python-sdk.html", path: "/python-sdk" },
  { file: "discovery.html", path: "/discovery" },
];

const styleBlock = (source) => source.match(/<style>[\s\S]*?<\/style>/)?.[0];
const homeStyle = styleBlock(html);
assert.ok(homeStyle, "index.html must carry the shared <style> block");

const pagerLinks = (source) => {
  const pager = source.match(/<nav class="pager"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
  const rel = (name) => pager.match(new RegExp(`<a\\b[^>]*rel="${name}"[^>]*href="([^"]+)"`))?.[1];
  return { prev: rel("prev"), next: rel("next") };
};
assert.deepEqual(pagerLinks(html), { prev: undefined, next: DOCS_PAGES[0].path }, "home page must link forward to the first guide");

const ownPaths = new Set(["/", "/ai-instructions", "/llms.txt", "/llms-full.txt", "/sitemap.xml", "/robots.txt", ...DOCS_PAGES.map((page) => page.path)]);
const seenTitles = new Set([title]);
const seenDescriptions = new Set([expected.description]);
const allPublic = [html, llms, readFileSync(join(root, "ai-instructions.html"), "utf8")];

DOCS_PAGES.forEach((page, index) => {
  const path = join(root, page.file);
  assert.ok(existsSync(path), `${page.file} is missing`);
  const source = readFileSync(path, "utf8");
  allPublic.push(source);
  const url = `${ORIGIN}${page.path}`;
  const pageMeta = [...source.matchAll(/<meta\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const pageLinks = [...source.matchAll(/<link\b[^>]*>/gi)].map((match) => attributes(match[0]));
  const named = (key, kind = "name") => pageMeta.find((item) => item[kind] === key)?.content;

  const pageTitle = source.match(/<title>(.*?)<\/title>/is)?.[1]?.trim();
  assert.ok(pageTitle && pageTitle.length <= 60, `${page.file} needs a title of at most 60 characters`);
  assert.ok(!seenTitles.has(pageTitle), `${page.file} title is not unique`);
  seenTitles.add(pageTitle);
  const description = named("description");
  assert.ok(description && description.length <= 160, `${page.file} needs a description of at most 160 characters`);
  assert.ok(!seenDescriptions.has(description), `${page.file} description is not unique`);
  seenDescriptions.add(description);

  assert.equal(pageLinks.find((item) => item.rel === "canonical")?.href, url, `${page.file} canonical must be ${url}`);
  assert.equal(named("og:url", "property"), url, `${page.file} og:url must match its canonical`);
  assert.equal(named("robots"), "index, follow", `${page.file} must be indexable`);
  assert.equal([...source.matchAll(/<h1\b/gi)].length, 1, `${page.file} must have one H1`);
  assert.equal([...source.matchAll(/<main\b/gi)].length, 1, `${page.file} must have one <main>`);
  assert.equal(styleBlock(source), homeStyle, `${page.file} must share the home page <style> block`);

  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `${page.file} is missing from sitemap.xml`);
  assert.ok(llms.includes(`(${url})`), `${page.file} is missing from llms.txt`);
  assert.ok(html.includes(`href="${page.path}"`), `home page docs index must link ${page.path}`);

  const expectedPrev = index === 0 ? "/" : DOCS_PAGES[index - 1].path;
  const expectedNext = DOCS_PAGES[index + 1]?.path;
  assert.deepEqual(pagerLinks(source), { prev: expectedPrev, next: expectedNext }, `${page.file} prev/next must follow the reading order`);

  for (const match of source.matchAll(/href="(\/[^"#]*)"/g)) {
    const target = match[1];
    const isAsset = /\.(ico|png)$/.test(target);
    assert.ok(isAsset || ownPaths.has(target), `${page.file} links ${target}, which is not a page on this site`);
  }
});

// First-party link rules: ip.suedeai.ai is a noindex demo (the registry is
// registry.suedeai.ai), producer.suedeai.ai answers 401, and webmcp is not a
// public target. No tracking parameters on any link.
for (const source of allPublic) {
  assert.ok(!/https?:\/\/(ip|producer|webmcp)\.suedeai\.ai/i.test(source), "links to ip/producer/webmcp.suedeai.ai are not allowed");
  assert.ok(!/[?&]utm_[a-z]+=/i.test(source), "tracking parameters are not allowed in links");
  for (const unsafe of [/Forbes contributor/i, /founded by/i, /20 paid x402 endpoints/i, /prices range/i, /every Suede site/i]) {
    assert.ok(!unsafe.test(source), `unsafe or unverifiable public claim remains: ${unsafe}`);
  }
}
for (const page of DOCS_PAGES) {
  assert.ok(SEO_KEYWORDS[page.file], `${page.file} must have a keywords map entry`);
}

// Generated SEO files: every page except the home page carries a JSON-LD graph
// (WebPage or TechArticle plus BreadcrumbList, shared entities by @id only),
// and llms-full.txt carries the full text of every page. Both are built from
// the pages by scripts/build-docs-seo.mjs and must be current.
for (const file of buildDocsSeo()) {
  const current = existsSync(join(root, file.path)) ? readFileSync(join(root, file.path), "utf8") : null;
  assert.equal(current, file.content, `${file.path} is stale: run node scripts/build-docs-seo.mjs`);
}
const llmsFull = readFileSync(join(root, "llms-full.txt"), "utf8");
assert.ok(llmsFull.startsWith("# "), "llms-full.txt must start with a Markdown H1");
assert.ok(Buffer.byteLength(llmsFull) < 500_000, "llms-full.txt must stay under 500 KB");
assert.match(llms, /https:\/\/docs\.suedeai\.ai\/llms-full\.txt/, "llms.txt must reference llms-full.txt");
for (const page of [...DOCS_PAGES, { file: "ai-instructions.html", path: "/ai-instructions" }]) {
  const source = readFileSync(join(root, page.file), "utf8");
  const blocks = [...source.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  assert.equal(blocks.length, 1, `${page.file} must carry one JSON-LD graph`);
  const graph = JSON.parse(blocks[0][1])["@graph"];
  const types = graph.map((node) => node["@type"]);
  assert.ok(types.includes("BreadcrumbList"), `${page.file} needs a BreadcrumbList`);
  assert.ok(types.includes("TechArticle") || types.includes("WebPage"), `${page.file} needs a WebPage or TechArticle node`);
  assert.ok(!types.includes("Organization") && !types.includes("Person"), `${page.file} must reference the estate entities by @id, not redefine them`);
  assert.ok(llmsFull.includes(`URL: ${ORIGIN}${page.path}`), `${page.file} is missing from llms-full.txt`);
}
for (const unsafe of [/Forbes contributor/i, /founded by/i, /20 paid x402 endpoints/i, /prices range/i, /every Suede site/i]) {
  assert.ok(!unsafe.test(llmsFull), `unsafe or unverifiable public claim remains in llms-full.txt: ${unsafe}`);
}
assert.ok(!/\u2014/.test(llmsFull), "llms-full.txt must not contain em dashes");

console.log(`Site verification passed: metadata, social image, schema graph, claims, landmarks, font loading, robots, sitemap, docs links, ${DOCS_PAGES.length} API guides, JSON-LD on every page and llms-full.txt.`);
