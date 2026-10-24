// Builds the derived SEO files for docs.suedeai.ai from the committed pages,
// so they cannot drift from what the pages say:
//
//   1. A JSON-LD graph in every page except index.html (which carries its own
//      hand-written graph): WebPage or TechArticle plus BreadcrumbList, with the
//      shared estate entities referenced by @id only.
//   2. llms-full.txt: the full text of every public page, as Markdown.
//
//   node scripts/build-docs-seo.mjs          # write both
//   node scripts/build-docs-seo.mjs --check  # exit 1 if either is stale
//
// scripts/verify-site.mjs runs the --check, so a page edit that is not followed
// by a rebuild fails verification.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://docs.suedeai.ai";
const ORG_ID = "https://suedeai.ai/#organization";
const PERSON_ID = "https://suedeai.ai/founder#person";
const WEBSITE_ID = `${ORIGIN}/#website`;
const IMAGE_ID = `${ORIGIN}/#primaryimage`;
const LD_START = "<!-- docs-jsonld:start -->";
const LD_END = "<!-- docs-jsonld:end -->";

// Reading order, matching scripts/verify-site.mjs. `kind` picks the schema
// type: the guides are technical articles; ai-instructions is a plain page.
export const PAGES = [
  { file: "index.html", path: "/", kind: "home" },
  { file: "quickstart.html", path: "/quickstart", kind: "TechArticle" },
  { file: "endpoints.html", path: "/endpoints", kind: "TechArticle" },
  { file: "endpoints/create-music.html", path: "/endpoints/create-music", kind: "TechArticle" },
  { file: "endpoints/agent-video.html", path: "/endpoints/agent-video", kind: "TechArticle" },
  { file: "endpoints/agent-image.html", path: "/endpoints/agent-image", kind: "TechArticle" },
  { file: "errors.html", path: "/errors", kind: "TechArticle" },
  { file: "python-sdk.html", path: "/python-sdk", kind: "TechArticle" },
  { file: "discovery.html", path: "/discovery", kind: "TechArticle" },
  { file: "ai-instructions.html", path: "/ai-instructions", kind: "WebPage" },
];

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'", "&#39;": "'", "&nbsp;": " ", "&#8594;": "→" };

function decode(text) {
  return text.replace(/&(?:amp|lt|gt|quot|#x27|#39|nbsp|#8594);/g, (m) => ENTITIES[m]);
}

function attr(html, pattern) {
  const match = html.match(pattern);
  return match ? decode(match[1]) : undefined;
}

function plain(fragment) {
  return decode(fragment.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/** Inline HTML to Markdown: links, code and emphasis; everything else as text. */
function inline(fragment, base) {
  let out = fragment
    .replace(/<code>([\s\S]*?)<\/code>/g, (_, c) => `\`${decode(c.replace(/<[^>]+>/g, ""))}\``)
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (_, href, text) => {
      const label = plain(text).replace(/\s*→$/, "");
      const url = href.startsWith("/") ? `${base}${href === "/" ? "/" : href}` : href;
      return `[${label}](${url})`;
    })
    .replace(/<strong>([\s\S]*?)<\/strong>/g, "**$1**")
    .replace(/<span aria-hidden="true">[\s\S]*?<\/span>/g, "")
    .replace(/<[^>]+>/g, "");
  out = decode(out).replace(/\s+/g, " ").trim();
  return out;
}

function table(fragment, base) {
  const rows = [...fragment.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<t([hd])\b[^>]*>([\s\S]*?)<\/t\1>/g)].map((cell) => inline(cell[2], base).replace(/\|/g, "\\|")),
  );
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const pad = (r) => [...r, ...Array(width - r.length).fill("")];
  const hasHead = /<thead>/.test(fragment);
  const head = hasHead ? pad(rows[0]) : Array(width).fill("");
  const body = hasHead ? rows.slice(1) : rows;
  return [
    `| ${head.join(" | ")} |`,
    `| ${Array(width).fill("---").join(" | ")} |`,
    ...body.map((r) => `| ${pad(r).join(" | ")} |`),
  ].join("\n");
}

/** The page's <main> content as Markdown, in document order. */
function mainMarkdown(html, base) {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
  const body = main
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/g, "")
    .replace(/<span class="mono">[\s\S]*?<\/span>/g, "");
  const blocks = [];
  const pattern = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>|<p\b[^>]*>([\s\S]*?)<\/p>|<(ul|ol)\b[^>]*>([\s\S]*?)<\/\4>|<pre>([\s\S]*?)<\/pre>|<table\b[^>]*>([\s\S]*?)<\/table>|<a class="btn"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  for (const m of body.matchAll(pattern)) {
    if (m[1]) {
      const level = Math.min(Number(m[1][1]) + 2, 6);
      blocks.push(`${"#".repeat(level)} ${inline(m[2], base)}`);
    } else if (m[3] !== undefined) {
      const text = inline(m[3], base);
      if (text) blocks.push(text);
    } else if (m[4]) {
      const ordered = m[4] === "ol";
      const items = [...m[5].matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((li, i) =>
        `${ordered ? `${i + 1}.` : "-"} ${inline(li[1], base)}`,
      );
      blocks.push(items.join("\n"));
    } else if (m[6] !== undefined) {
      const code = decode(m[6].replace(/<\/?code>/g, "")).replace(/\n+$/, "");
      blocks.push(`\`\`\`\n${code}\n\`\`\``);
    } else if (m[7] !== undefined) {
      blocks.push(table(m[7], base));
    } else if (m[8]) {
      blocks.push(`[${plain(m[9]).replace(/\s*→$/, "")}](${m[8]})`);
    }
  }
  return blocks.filter(Boolean).join("\n\n");
}

function pageFacts(page) {
  const html = readFileSync(join(root, page.file), "utf8");
  const url = page.path === "/" ? `${ORIGIN}/` : `${ORIGIN}${page.path}`;
  const title = attr(html, /<title>([\s\S]*?)<\/title>/);
  const description = attr(html, /<meta name="description" content="([^"]*)"/);
  const h1 = plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  const crumbHtml = html.match(/<nav class="mono" aria-label="Breadcrumb">([\s\S]*?)<\/nav>/)?.[1];
  const crumbs = crumbHtml
    ? [...crumbHtml.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>|<span aria-current="page">([\s\S]*?)<\/span>/g)].map((m) =>
        m[1] ? { name: plain(m[2]), url: m[1] === "/" ? `${ORIGIN}/` : `${ORIGIN}${m[1]}` } : { name: plain(m[3]), url },
      )
    : [{ name: "Suede AI Developer Docs", url: `${ORIGIN}/` }, { name: h1, url }];
  // The first crumb reads "docs.suedeai.ai"; schema names the site properly.
  crumbs[0] = { name: "Suede AI Developer Docs", url: `${ORIGIN}/` };
  const published =
    html.match(/Published (\d{4}-\d{2}-\d{2})\./)?.[1] ?? isoFromProse(html.match(/Published ([A-Z][a-z]+ \d{1,2}, \d{4})\./)?.[1]);
  const modified =
    html.match(/(?:Checked against the live API on|Page last updated) (\d{4}-\d{2}-\d{2})\./)?.[1] ??
    isoFromProse(html.match(/Updated ([A-Z][a-z]+ \d{1,2}, \d{4})\./)?.[1]) ??
    published;
  return { html, url, title, description, h1, crumbs, published, modified };
}

function isoFromProse(text) {
  if (!text) return undefined;
  const date = new Date(`${text} 00:00:00 UTC`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function graphFor(page, facts) {
  const pageNode = {
    "@type": page.kind,
    "@id": `${facts.url}#${page.kind === "TechArticle" ? "article" : "webpage"}`,
    url: facts.url,
    name: facts.title,
    description: facts.description,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    about: { "@id": ORG_ID },
    primaryImageOfPage: { "@id": IMAGE_ID },
    breadcrumb: { "@id": `${facts.url}#breadcrumb` },
    ...(facts.published ? { datePublished: facts.published } : {}),
    ...(facts.modified ? { dateModified: facts.modified } : {}),
  };
  // A guide is a TechArticle inside a WebPage: the WebPage carries the page
  // facts and breadcrumb, and names the article as its main entity.
  const nodes = [pageNode];
  if (page.kind === "TechArticle") {
    Object.assign(pageNode, {
      headline: facts.h1,
      image: `${ORIGIN}/suede-docs-og.png`,
      author: { "@id": ORG_ID },
      mainEntityOfPage: { "@id": `${facts.url}#webpage` },
    });
    delete pageNode.breadcrumb;
    delete pageNode.primaryImageOfPage;
    nodes.unshift({
      "@type": "WebPage",
      "@id": `${facts.url}#webpage`,
      url: facts.url,
      name: facts.title,
      description: facts.description,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      primaryImageOfPage: { "@id": IMAGE_ID },
      breadcrumb: { "@id": `${facts.url}#breadcrumb` },
      mainEntity: { "@id": `${facts.url}#article` },
      ...(facts.modified ? { dateModified: facts.modified } : {}),
    });
  }
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...nodes,
      {
        "@type": "BreadcrumbList",
        "@id": `${facts.url}#breadcrumb`,
        itemListElement: facts.crumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.url,
        })),
      },
      { "@type": "WebSite", "@id": WEBSITE_ID, url: `${ORIGIN}/`, name: "Suede AI Developer Docs", publisher: { "@id": ORG_ID } },
      { "@type": "ImageObject", "@id": IMAGE_ID, url: `${ORIGIN}/suede-docs-og.png`, width: 1200, height: 630 },
    ],
  };
}

function withJsonLd(html, graph) {
  const block = `${LD_START}\n<script type="application/ld+json">\n${JSON.stringify(graph, null, 2).replace(/</g, "\\u003c")}\n</script>\n${LD_END}`;
  const start = html.indexOf(LD_START);
  const end = html.indexOf(LD_END);
  if (start !== -1 && end > start) return html.slice(0, start) + block + html.slice(end + LD_END.length);
  // First build: place the block just before </head> (or before <style> when
  // the page closes its head on the same line as the stylesheet).
  const at = html.indexOf("</style></head>") !== -1 ? html.indexOf("<style>") : html.indexOf("</head>");
  return `${html.slice(0, at)}${block}\n${html.slice(at)}`;
}

function llmsFull(factsByPage) {
  const intro = [
    "# Suede AI Developer Docs: full text",
    "",
    "> The complete public text of docs.suedeai.ai, one section per page, for AI assistants and offline readers. The pages themselves are the source of truth; this file is generated from them by scripts/build-docs-seo.mjs. The shorter index is https://docs.suedeai.ai/llms.txt.",
    "",
    "Publisher: Suede AI (https://suedeai.ai), also known as Suede Labs. Founder: Jason Colapietro (https://suedeai.ai/founder).",
    "Prices and request fields on the API pages were checked against the live discovery documents on app.suedeai.ai; those documents (https://app.suedeai.ai/.well-known/x402 and https://app.suedeai.ai/api/v1/catalog) carry the current values.",
  ];
  const sections = PAGES.map((page) => {
    const facts = factsByPage.get(page.file);
    return [
      "---",
      "",
      `## ${facts.title}`,
      "",
      `URL: ${facts.url}`,
      facts.modified ? `Last updated: ${facts.modified}` : "",
      "",
      `> ${facts.description}`,
      "",
      mainMarkdown(facts.html, ORIGIN),
    ]
      .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
      .join("\n");
  });
  return `${[...intro, "", ...sections.flatMap((s) => [s, ""])].join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

export function buildDocsSeo() {
  const outputs = [];
  const factsByPage = new Map();
  for (const page of PAGES) {
    const facts = pageFacts(page);
    factsByPage.set(page.file, facts);
    if (page.kind === "home") continue;
    const next = withJsonLd(facts.html, graphFor(page, facts));
    outputs.push({ path: page.file, content: next });
    // llms-full reads the page body, which the JSON-LD block does not touch.
  }
  outputs.push({ path: "llms-full.txt", content: llmsFull(factsByPage) });
  return outputs;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes("--check");
  const stale = [];
  for (const file of buildDocsSeo()) {
    const target = join(root, file.path);
    let current = null;
    try {
      current = readFileSync(target, "utf8");
    } catch {
      current = null;
    }
    if (current === file.content) continue;
    stale.push(file.path);
    if (!check) writeFileSync(target, file.content);
  }
  if (check && stale.length > 0) {
    console.error(`Stale generated SEO files (run node scripts/build-docs-seo.mjs):\n  ${stale.join("\n  ")}`);
    process.exit(1);
  }
  console.log(stale.length ? `${check ? "Stale" : "Wrote"}: ${stale.join(", ")}` : "Generated SEO files are current.");
}
