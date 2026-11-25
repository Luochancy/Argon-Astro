// Generate llmstxt.org compliant /llms.txt, /llms-full.txt, and /agent-index.json.
import { wordCount, readingTime } from "../reading-time.mjs";
import {
  entryCanonicalPath,
  entryMarkdownPath,
  htmlToAgentMarkdown,
  renderEntryMarkdownDocument,
} from "./markdown-export.mjs";

function absUrl(siteUrl, path) {
  const base = String(siteUrl || "").replace(/\/$/, "");
  return base ? base + path : path;
}

function formatDateYmd(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Generate standard /llms.txt site directory for AI agents and LLM browsers. */
export function buildLlmsTxt(config, entries) {
  const siteUrl = config.site?.url || "";
  const title = config.site?.title || "Argon";
  const description = config.site?.description || "";
  const posts = entries.filter((e) => e.kind === "post");
  const moments = entries.filter((e) => e.kind === "shuoshuo");
  const pages = entries.filter((e) => e.kind === "page");

  const lines = [
    `# ${title}`,
    "",
    description ? `> ${description}` : "> Static blog powered by Argon Astro.",
    "",
    "This site supports HTTP Markdown content negotiation (`Accept: text/markdown` on canonical URLs) as well as structured JSON indexes for AI agents.",
    "Password-protected entries are intentionally redacted from all machine-readable exports.",
    "",
    "## Agent Discovery Endpoints",
    `- [Full Corpus Markdown](${absUrl(siteUrl, "/llms-full.txt")}): Concatenated clean Markdown of all public posts, pages, and shuoshuo`,
    `- [Structured JSON Index](${absUrl(siteUrl, "/agent-index.json")}): Machine-readable index with metadata, taxonomies, and Markdown URLs`,
    `- [RSS Feed](${absUrl(siteUrl, "/feed.xml")}): Latest posts in RSS 2.0 XML`,
    `- [XML Sitemap](${absUrl(siteUrl, "/sitemap.xml")}): Canonical URL sitemap`,
    `- [Local Search Page](${absUrl(siteUrl, "/search/")}): Client-side keyword and content-type search`,
  ];

  if (posts.length) {
    lines.push("", "## Posts");
    for (const post of posts) {
      const mdUrl = absUrl(siteUrl, config.agent?.markdownMirrors !== false ? entryMarkdownPath(post) : entryCanonicalPath(post));
      const date = formatDateYmd(post.data.date);
      const summary = post.data.locked
        ? "Password-protected post (content redacted)"
        : (post.data.description || htmlToAgentMarkdown(post.html).slice(0, 120).replace(/\s+/g, " "));
      const meta = [date, ...(post.data.tags || [])].filter(Boolean).join(", ");
      lines.push(`- [${post.data.title}](${mdUrl})${meta ? ` (${meta})` : ""}: ${summary}`);
    }
  }

  if (moments.length) {
    lines.push("", "## Shuoshuo");
    for (const item of moments) {
      const mdUrl = absUrl(siteUrl, config.agent?.markdownMirrors !== false ? entryMarkdownPath(item) : entryCanonicalPath(item));
      const label = item.data.title || `Shuoshuo ${item.id}`;
      const date = formatDateYmd(item.data.date);
      const summary = htmlToAgentMarkdown(item.html).slice(0, 100).replace(/\s+/g, " ");
      lines.push(`- [${label}](${mdUrl})${date ? ` (${date})` : ""}: ${summary}`);
    }
  }

  if (pages.length) {
    lines.push("", "## Pages");
    for (const page of pages) {
      const mdUrl = absUrl(siteUrl, config.agent?.markdownMirrors !== false ? entryMarkdownPath(page) : entryCanonicalPath(page));
      const summary = page.data.description || htmlToAgentMarkdown(page.html).slice(0, 100).replace(/\s+/g, " ");
      lines.push(`- [${page.data.title}](${mdUrl}): ${summary}`);
    }
  }

  return lines.join("\n") + "\n";
}

/** Generate /llms-full.txt concatenating clean Markdown of all public entries. */
export function buildLlmsFullTxt(config, entries) {
  const siteUrl = config.site?.url || "";
  const title = config.site?.title || "Argon";
  const header = [
    `# ${title} — Full Corpus for AI Agents`,
    "",
    `> ${config.site?.description || ""}`,
    `> Source: ${siteUrl || "/"}`,
    `> Entries: ${entries.length}`,
    "",
  ].join("\n");

  const docs = entries.map((entry) => renderEntryMarkdownDocument(entry, siteUrl));
  return header + "\n" + docs.join("\n---\n\n");
}

/** Generate /agent-index.json structured machine-readable catalog for programmatic agent browsing. */
export function buildAgentIndex(config, entries) {
  const siteUrl = config.site?.url || "";
  const categories = new Map();
  const tags = new Map();

  const items = entries.map((entry) => {
    for (const cat of entry.data.categories || []) categories.set(cat, (categories.get(cat) || 0) + 1);
    for (const tag of entry.data.tags || []) tags.set(tag, (tags.get(tag) || 0) + 1);

    const locked = Boolean(entry.data.locked);
    const plain = locked ? "" : htmlToAgentMarkdown(entry.html).replace(/\s+/g, " ").trim();
    return {
      id: entry.id,
      kind: entry.kind,
      title: entry.data.title || (entry.kind === "shuoshuo" ? `Shuoshuo ${entry.id}` : entry.id),
      date: entry.data.date instanceof Date ? entry.data.date.toISOString() : String(entry.data.date || ""),
      description: entry.data.description || "",
      excerpt: locked ? "Password-protected entry." : plain.slice(0, 220),
      categories: entry.data.categories || [],
      tags: entry.data.tags || [],
      sticky: Boolean(entry.data.sticky),
      locked,
      wordCount: locked ? 0 : wordCount(entry.html),
      readingTime: locked ? "" : readingTime(entry.html, {
        cn: config.article?.readingSpeed || 300,
        en: config.article?.readingSpeedEn || 160,
        code: config.article?.readingSpeedCode || 80,
      }),
      url: absUrl(siteUrl, entryCanonicalPath(entry)),
      markdownUrl: config.agent?.markdownMirrors !== false ? absUrl(siteUrl, entryMarkdownPath(entry)) : null,
    };
  });

  return {
    schemaVersion: "1.0",
    generator: "Argon Astro",
    site: {
      title: config.site?.title || "Argon",
      description: config.site?.description || "",
      url: siteUrl,
      language: config.site?.language || "zh-CN",
      author: config.sidebar?.authorName || config.site?.title || "",
    },
    endpoints: {
      llmsTxt: absUrl(siteUrl, "/llms.txt"),
      llmsFullTxt: absUrl(siteUrl, "/llms-full.txt"),
      agentIndex: absUrl(siteUrl, "/agent-index.json"),
      feed: absUrl(siteUrl, "/feed.xml"),
      sitemap: absUrl(siteUrl, "/sitemap.xml"),
      search: absUrl(siteUrl, "/search/"),
    },
    stats: {
      total: items.length,
      posts: items.filter((i) => i.kind === "post").length,
      shuoshuo: items.filter((i) => i.kind === "shuoshuo").length,
      pages: items.filter((i) => i.kind === "page").length,
    },
    taxonomies: {
      categories: Object.fromEntries(categories.entries()),
      tags: Object.fromEntries(tags.entries()),
    },
    entries: items,
  };
}
