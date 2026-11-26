import { publishedPosts } from "../lib/content/queries";
import { entryUrl } from "../lib/content/urls.mjs";
import { loadThemeConfig } from "../config/load";
import { renderFeed } from "../lib/feed.mjs";

export const prerender = true;

export function GET() {
  const config = loadThemeConfig();
  const body = renderFeed({
    title: config.site.title,
    items: publishedPosts().map((post) => ({
      title: post.data.title,
      link: entryUrl(post),
      date: post.data.date.toISOString(),
      description: post.data.description,
    })),
  });
  return new Response(body, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
