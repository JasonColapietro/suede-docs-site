import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const robots = readFileSync(join(root, "robots.txt"), "utf8");
const sitemap = readFileSync(join(root, "sitemap.xml"), "utf8");
const llms = readFileSync(join(root, "llms.txt"), "utf8");

const expected = {
  canonical: "https://docs.suedeai.ai/",
  title: "Suede Developer Docs | x402 APIs and Creator IP",
  description:
    "Read Suede developer docs for programmable IP, creator ownership, provenance, licensing, and x402 agent-commerce APIs. Browse the canonical GitHub source.",
  h1: "Suede developer docs for programmable IP",
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

assert.equal(metaContent("og:title", "property"), "Suede Developer Docs: Programmable IP and x402 APIs");
assert.equal(metaContent("og:description", "property"), expected.description);
assert.equal(metaContent("og:url", "property"), expected.canonical);
assert.equal(metaContent("og:type", "property"), "website");
assert.equal(metaContent("og:image", "property"), expected.image);
assert.equal(metaContent("og:image:width", "property"), "1200");
assert.equal(metaContent("og:image:height", "property"), "630");
assert.equal(metaContent("og:image:type", "property"), "image/png");
assert.equal(metaContent("twitter:card"), "summary_large_image");
assert.equal(metaContent("twitter:title"), "Suede Developer Docs: Programmable IP and x402 APIs");
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
assert.equal(organization?.founder, undefined, "docs schema must not assert an unsupported founder relationship");
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
assert.ok(!schema["@graph"].some((node) => node["@type"] === "Person"));
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

assert.match(html, /https:\/\/app\.suedeai\.ai\/api\/v1\/catalog/);
assert.match(llms, /https:\/\/app\.suedeai\.ai\/api\/v1\/catalog/);
assert.match(robots, /User-agent: GPTBot\s+Allow: \//);
assert.match(robots, /User-agent: \*\s+Allow: \//);
assert.match(robots, /Sitemap: https:\/\/docs\.suedeai\.ai\/sitemap\.xml/);
assert.match(sitemap, /<loc>https:\/\/docs\.suedeai\.ai\/<\/loc>/);
assert.match(sitemap, /<lastmod>2026-07-15<\/lastmod>/);
assert.match(llms, /github\.com\/Suede-AI\/suede-docs/);

console.log("Site verification passed: metadata, social image, schema graph, claims, robots, sitemap, and docs links.");
