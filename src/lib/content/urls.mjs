// Single source of truth for canonical entry URLs, WordPress permalinks, and Markdown mirror paths.

const RESERVED_PREFIXES = ["/api/", "/argon/", "/_astro/", "/media/", "/wp-json", "/wp-admin", "/wp-content"];

/**
 * Normalize a relative WordPress permalink path while preserving `.html` suffixes
 * (e.g. `/archives/707.html`, `/aboutme.html`) and directory trailing slashes (`/2026/06/hello/`).
 * Returns "" if invalid, root "/", or reserved.
 */
export function normalizeEntryPermalink(raw) {
  let value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname;
    } catch {
      return "";
    }
  }
  value = value.split(/[?#]/)[0].trim();
  if (!value || value === "/") return "";
  if (!value.startsWith("/")) value = "/" + value;

  const segments = value
    .split("/")
    .filter(Boolean)
    .map((seg) => {
      let decoded = seg;
      try {
        decoded = decodeURIComponent(seg);
      } catch {
        // Keep original segment when malformed.
      }
      return decoded.replace(/[\\:"*?<>|\x00-\x1f]+/g, "-").trim();
    })
    .filter((seg) => seg && seg !== "." && seg !== "..");

  if (!segments.length) return "";
  const joined = "/" + segments.join("/");
  const lower = joined.toLowerCase();
  if (RESERVED_PREFIXES.some((prefix) => lower === prefix.replace(/\/$/, "") || lower.startsWith(prefix))) {
    return "";
  }
  if (/\.html?$/i.test(joined)) {
    return joined;
  }
  return joined + "/";
}

/** Return the canonical public path for a post, page, or shuoshuo entry. */
export function entryUrl(entry) {
  const custom = normalizeEntryPermalink(entry?.data?.permalink ?? entry?.permalink ?? "");
  if (custom) return custom;
  const id = String(entry?.id || "");
  if (entry?.kind === "post") return `/posts/${id}/`;
  if (entry?.kind === "shuoshuo") return `/shuoshuo/${id}/`;
  return `/${id}/`;
}

/** Return the pre-built `.md` mirror path corresponding to `entryUrl(entry)`. */
export function entryMarkdownPath(entry) {
  const canonical = entryUrl(entry);
  const base = canonical.replace(/\.html?$/i, "").replace(/\/+$/, "");
  return `${base}.md`;
}

/** Return the Astro `[...permalink]` route param (no leading or trailing slash). */
export function entryRouteParam(entry) {
  return entryUrl(entry).replace(/^\/+|\/+$/g, "");
}

/** Return the Astro `[...permalink].md` route param (no leading slash, no `.md` suffix). */
export function entryMarkdownRouteParam(entry) {
  return entryMarkdownPath(entry).replace(/^\/+/, "").replace(/\.md$/i, "");
}

/** Rewrite same-origin CMS URLs to relative paths while leaving external links untouched. */
export function relativizeSameOriginUrl(rawUrl, origin) {
  const value = String(rawUrl || "").trim();
  if (!value || !origin || !/^https?:\/\//i.test(value)) return value;
  try {
    const parsed = new URL(value);
    if (parsed.origin !== origin) return value;
    return (parsed.pathname || "/") + parsed.search + parsed.hash;
  } catch {
    return value;
  }
}

/** Resolve Argon sentinel background tokens (`--bing--`) to live endpoints. */
export function resolveBackgroundToken(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (value === "--bing--") return "/api/bing";
  return value;
}
