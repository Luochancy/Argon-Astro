// Build schema.org JSON-LD structured metadata for search engines and AI agents.
import { wordCount } from "../reading-time.mjs";
import { entryCanonicalPath } from "./markdown-export.mjs";

function absUrl(siteUrl, path) {
  const base = String(siteUrl || "").replace(/\/$/, "");
  return base ? base + path : path;
}

export function buildSiteJsonLd(config) {
  const siteUrl = config.site?.url || "";
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.site?.title || "Argon",
    description: config.site?.description || "",
    url: siteUrl || "/",
    inLanguage: config.site?.language || "zh-CN",
    potentialAction: {
      "@type": "SearchAction",
      target: `${absUrl(siteUrl, "/search/")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildArticleJsonLd(config, post) {
  const siteUrl = config.site?.url || "";
  const url = absUrl(siteUrl, entryCanonicalPath(post));
  const published = post.data.date instanceof Date ? post.data.date.toISOString() : String(post.data.date || "");
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.data.title,
    description: post.data.description || "",
    datePublished: published,
    inLanguage: config.site?.language || "zh-CN",
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    author: {
      "@type": "Person",
      name: config.sidebar?.authorName || config.site?.title || "Argon",
    },
    keywords: (post.data.tags || []).join(", "),
    articleSection: (post.data.categories || [])[0] || undefined,
    wordCount: post.data.locked ? 0 : wordCount(post.html),
    isAccessibleForFree: !post.data.locked,
  };
}

export function buildShuoshuoJsonLd(config, item) {
  const siteUrl = config.site?.url || "";
  const url = absUrl(siteUrl, entryCanonicalPath(item));
  const published = item.data.date instanceof Date ? item.data.date.toISOString() : String(item.data.date || "");
  return {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    headline: item.data.title || `Shuoshuo ${item.id}`,
    datePublished: published,
    inLanguage: config.site?.language || "zh-CN",
    url,
    author: {
      "@type": "Person",
      name: config.sidebar?.authorName || config.site?.title || "Argon",
    },
  };
}
