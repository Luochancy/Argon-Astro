import type { APIRoute } from "astro";
import { loadThemeConfig } from "../config/load";
import {
  publishedMoments,
  publishedPages,
  publishedPosts,
  type ContentEntry,
} from "../lib/content/queries";
import { entryMarkdownRouteParam } from "../lib/content/urls.mjs";
import { renderEntryMarkdownDocument } from "../lib/agent/markdown-export.mjs";

export function getStaticPaths() {
  const config = loadThemeConfig();
  if (!config.agent.enabled || !config.agent.markdownMirrors) return [];

  const reservedExact = new Set(["robots", "llms", "llms-full", "agent-index", "feed", "sitemap"]);
  const seen = new Set<string>();
  const all: ContentEntry[] = [...publishedPosts(), ...publishedMoments(), ...publishedPages()];
  const paths: { params: { permalink: string }; props: { entry: ContentEntry } }[] = [];

  for (const entry of all) {
    const param = entryMarkdownRouteParam(entry);
    if (!param || reservedExact.has(param.toLowerCase()) || seen.has(param)) continue;
    seen.add(param);
    paths.push({ params: { permalink: param }, props: { entry } });
  }
  return paths;
}

export const GET: APIRoute = ({ props }) => {
  const config = loadThemeConfig();
  const entry = props.entry as ContentEntry;
  return new Response(renderEntryMarkdownDocument(entry, config.site.url), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
};
