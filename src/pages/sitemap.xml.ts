import { publishedMoments, publishedPages, publishedPosts } from "../lib/content/queries";
import { renderSitemap } from "../lib/sitemap.mjs";

export const prerender = true;

export function GET() {
  const urls = [
    "/",
    "/archives/",
    "/shuoshuo/",
    "/search/",
    "/feed.xml",
    ...publishedPosts().map((post) => "/posts/" + post.id + "/"),
    ...publishedPages().map((page) => "/" + page.id + "/"),
    ...publishedMoments().map((item) => "/shuoshuo/" + item.id + "/"),
  ];
  return new Response(renderSitemap(urls), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
