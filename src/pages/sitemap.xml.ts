import { publishedMoments, publishedPages, publishedPosts } from "../lib/content/queries";
import { entryUrl } from "../lib/content/urls.mjs";
import { loadThemeConfig } from "../config/load";
import { renderSitemap } from "../lib/sitemap.mjs";

export const prerender = true;

export function GET() {
  const config = loadThemeConfig();
  const urls = [
    "/",
    "/archives/",
    "/shuoshuo/",
    "/search/",
    "/feed.xml",
    ...publishedPosts().map((post) => entryUrl(post)),
    ...publishedPages().map((page) => entryUrl(page)),
    ...publishedMoments().map((item) => entryUrl(item)),
  ];
  return new Response(renderSitemap(urls, config.site.url), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
