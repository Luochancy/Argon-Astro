import type { APIRoute } from "astro";
import { loadThemeConfig } from "../../config/load";
import { publishedMoments, type ShuoshuoEntry } from "../../lib/content/queries";
import { renderEntryMarkdownDocument } from "../../lib/agent/markdown-export.mjs";

export function getStaticPaths() {
  const config = loadThemeConfig();
  if (!config.agent.enabled || !config.agent.markdownMirrors) return [];
  return publishedMoments().map((item) => ({ params: { slug: item.id }, props: { item } }));
}

export const GET: APIRoute = ({ props }) => {
  const config = loadThemeConfig();
  const item = props.item as ShuoshuoEntry;
  return new Response(renderEntryMarkdownDocument(item, config.site.url), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
};
