import { publishedMoments, publishedPages, publishedPosts } from "../lib/content/queries";
import { entryUrl } from "../lib/content/urls.mjs";
import { renderSitemap } from "../lib/sitemap.mjs";

export const prerender = true;

export function GET() {
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
  return new Response(renderSitemap(urls), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
