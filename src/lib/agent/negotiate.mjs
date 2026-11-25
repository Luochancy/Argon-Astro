// RFC 9110 HTTP Content Negotiation helpers for serving Markdown via `Accept: text/markdown`.

function parseAcceptEntry(raw) {
  const parts = raw.split(";").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;
  const type = parts[0].toLowerCase();
  let q = 1;
  for (let i = 1; i < parts.length; i += 1) {
    const match = /^q\s*=\s*([0-9.]+)$/i.exec(parts[i]);
    if (match) {
      const parsed = Number(match[1]);
      q = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
    }
  }
  return { type, q };
}

/**
 * Return true only when the client explicitly asks for `text/markdown` with q > 0
 * and prefers it at least as much as `text/html` (standard browsers never match).
 */
export function acceptsMarkdown(acceptHeader) {
  const header = String(acceptHeader || "").trim();
  if (!header || !header.toLowerCase().includes("text/markdown")) return false;

  let mdQ = -1;
  let htmlQ = -1;
  for (const raw of header.split(",")) {
    const entry = parseAcceptEntry(raw);
    if (!entry) continue;
    if (entry.type === "text/markdown" || entry.type === "text/x-markdown") {
      mdQ = Math.max(mdQ, entry.q);
    } else if (entry.type === "text/html" || entry.type === "application/xhtml+xml") {
      htmlQ = Math.max(htmlQ, entry.q);
    }
  }
  return mdQ > 0 && (htmlQ < 0 || mdQ >= htmlQ);
}

/**
 * Map a canonical blog pathname to its pre-built static Markdown asset path.
 * Returns null for API routes or non-page static asset paths.
 */
export function resolveNegotiatedMarkdownPath(pathname) {
  const clean = String(pathname || "/").split(/[?#]/)[0] || "/";
  if (clean.startsWith("/api/") || clean.startsWith("/_astro/") || clean.startsWith("/argon/") || clean.startsWith("/media/")) {
    return null;
  }
  if (clean === "/" || clean === "/index.html") {
    return "/llms.txt";
  }
  if (clean.endsWith(".md")) {
    return clean;
  }
  const trimmed = clean.endsWith("/index.html")
    ? clean.slice(0, -"/index.html".length)
    : clean.replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") {
    return "/llms.txt";
  }
  // Skip paths that already carry a file extension (e.g. .xml, .json, .ico, .png).
  const lastSegment = trimmed.slice(trimmed.lastIndexOf("/") + 1);
  if (lastSegment.includes(".")) {
    return null;
  }
  return `${trimmed}.md`;
}

/** Estimate LLM token count for the `X-Markdown-Tokens` header (CJK ~1.5 chars/token, Latin ~4 chars/token). */
export function estimateMarkdownTokens(markdown) {
  const text = String(markdown || "");
  if (!text) return 0;
  const cjk = (text.match(/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
  const other = Math.max(0, text.length - cjk);
  return Math.max(1, Math.ceil(cjk / 1.5 + other / 4));
}

/** Append `Accept` to a `Vary` header without duplicating existing tokens. */
export function appendVaryAccept(headers) {
  const existing = headers.get("vary") || "";
  const tokens = existing
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.some((t) => t.toLowerCase() === "accept")) {
    tokens.push("Accept");
    headers.set("vary", tokens.join(", "));
  }
}
