// Convert rendered HTML entries into clean, token-efficient Markdown for AI agents.
// Password-protected entries are strictly redacted so secrets never leak to crawlers.

function decodeEntities(text) {
  return String(text ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function stripTags(html) {
  return decodeEntities(String(html ?? "").replace(/<[^>]+>/g, ""));
}

/** Convert entry HTML into clean, readable Markdown suitable for LLM consumption. */
export function htmlToAgentMarkdown(html) {
  let out = String(html ?? "");
  // Strip inline scripts, styles, and embedded encrypted payloads.
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Preserve fenced code blocks first.
  const codeSlots = [];
  out = out.replace(/<pre[^>]*>\s*<code(?:[^>]*class="[^"]*language-([a-z0-9_+-]+)[^"]*")?[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_, lang, code) => {
    const token = `@@AGENT_CODE_${codeSlots.length}@@`;
    const clean = decodeEntities(code.replace(/<[^>]+>/g, "")).replace(/\r?\n$/, "");
    codeSlots.push(`\n\`\`\`${lang || ""}\n${clean}\n\`\`\`\n`);
    return token;
  });

  // Headings
  out = out.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    return `\n${"#".repeat(Number(level))} ${stripTags(inner).trim()}\n\n`;
  });

  // Blockquotes
  out = out.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
    const lines = stripTags(inner).trim().split(/\r?\n/).filter(Boolean);
    return "\n" + lines.map((line) => `> ${line.trim()}`).join("\n") + "\n\n";
  });

  // Tables (simple markdown table conversion)
  out = out.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_, inner) => {
    const rows = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
      [...m[1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => stripTags(c[1]).replace(/\s+/g, " ").trim()),
    ).filter((r) => r.length > 0);
    if (!rows.length) return "";
    const header = rows[0];
    const sep = header.map(() => "---");
    const lines = [
      "| " + header.join(" | ") + " |",
      "| " + sep.join(" | ") + " |",
      ...rows.slice(1).map((r) => "| " + header.map((_, i) => r[i] ?? "").join(" | ") + " |"),
    ];
    return "\n" + lines.join("\n") + "\n\n";
  });

  // Lists
  out = out.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, inner) => `- ${stripTags(inner).replace(/\s+/g, " ").trim()}\n`);
  out = out.replace(/<\/?(?:ul|ol)[^>]*>/gi, "\n");

  // Images and links
  out = out.replace(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*\/?>/gi, (_, src, alt) => `![${alt}](${src})`);
  out = out.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_, alt, src) => `![${alt}](${src})`);
  out = out.replace(/<img[^>]*src=["']([^"']+)["'][^>]*\/?>/gi, (_, src) => `![](${src})`);
  out = out.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const label = stripTags(inner).trim();
    return label ? `[${label}](${href})` : href;
  });

  // Inline code, emphasis, breaks, paragraphs
  out = out.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => "`" + stripTags(code) + "`");
  out = out.replace(/<(?:strong|b)[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_, t) => `**${stripTags(t)}**`);
  out = out.replace(/<(?:em|i)[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (_, t) => `*${stripTags(t)}*`);
  out = out.replace(/<hr\s*\/?>/gi, "\n---\n\n");
  out = out.replace(/<br\s*\/?>/gi, "\n");
  out = out.replace(/<\/(?:p|div|section|article|figure|figcaption)>/gi, "\n\n");

  // Strip any remaining HTML tags and normalize spacing.
  out = stripTags(out);
  out = out.replace(/@@AGENT_CODE_(\d+)@@/g, (_, idx) => codeSlots[Number(idx)] ?? "");
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function entryCanonicalPath(entry) {
  if (entry.kind === "post") return `/posts/${entry.id}/`;
  if (entry.kind === "shuoshuo") return `/shuoshuo/${entry.id}/`;
  return `/${entry.id}/`;
}

export function entryMarkdownPath(entry) {
  if (entry.kind === "post") return `/posts/${entry.id}.md`;
  if (entry.kind === "shuoshuo") return `/shuoshuo/${entry.id}.md`;
  return `/${entry.id}.md`;
}

/** Render a standalone Markdown document for a single post, page, or shuoshuo entry. */
export function renderEntryMarkdownDocument(entry, siteUrl = "") {
  const base = String(siteUrl || "").replace(/\/$/, "");
  const canonical = base + entryCanonicalPath(entry);
  const dateIso = entry.data?.date instanceof Date
    ? entry.data.date.toISOString()
    : String(entry.data?.date || "");
  const title = entry.data?.title || (entry.kind === "shuoshuo" ? `Shuoshuo ${entry.id}` : entry.id);

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `kind: ${entry.kind}`,
    `url: ${JSON.stringify(canonical)}`,
    dateIso ? `date: ${JSON.stringify(dateIso)}` : "",
    entry.data?.description ? `description: ${JSON.stringify(entry.data.description)}` : "",
    entry.data?.categories?.length ? `categories: ${JSON.stringify(entry.data.categories)}` : "",
    entry.data?.tags?.length ? `tags: ${JSON.stringify(entry.data.tags)}` : "",
    entry.data?.locked ? "locked: true" : "",
    "---",
  ].filter(Boolean).join("\n");

  const body = entry.data?.locked
    ? "This entry is password-protected. Content is excluded from static and AI-agent exports."
    : htmlToAgentMarkdown(entry.html);

  return `${frontmatter}\n\n# ${title}\n\n${body}\n`;
}
