import type { APIRoute } from "astro";
import { loadThemeConfig } from "../../config/load";
import { publishedPosts, type PostEntry } from "../../lib/content/queries";
import { renderEntryMarkdownDocument } from "../../lib/agent/markdown-export.mjs";

export function getStaticPaths() {
  const config = loadThemeConfig();
  if (!config.agent.enabled || !config.agent.markdownMirrors) return [];
  return publishedPosts().map((post) => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = ({ props }) => {
  const config = loadThemeConfig();
  const post = props.post as PostEntry;
  return new Response(renderEntryMarkdownDocument(post, config.site.url), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": "inline",
      "x-content-type-options": "nosniff",
    },
  });
};
