import type { APIRoute } from "astro";
import { loadThemeConfig } from "../config/load";
import { publishedPages, type PageEntry } from "../lib/content/queries";
import { renderEntryMarkdownDocument } from "../lib/agent/markdown-export.mjs";

export function getStaticPaths() {
  const config = loadThemeConfig();
  if (!config.agent.enabled || !config.agent.markdownMirrors) return [];
  return publishedPages().map((page) => ({ params: { slug: page.id }, props: { page } }));
}

export const GET: APIRoute = ({ props }) => {
  const config = loadThemeConfig();
  const page = props.page as PageEntry;
  return new Response(renderEntryMarkdownDocument(page, config.site.url), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
};
