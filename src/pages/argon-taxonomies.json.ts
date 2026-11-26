import type { APIRoute } from "astro";
import { loadThemeConfig } from "../config/load";
import { publishedPosts } from "../lib/content/queries";
import { buildTaxonomyRouteMap } from "../lib/content/taxonomies.mjs";

export const prerender = true;

export const GET: APIRoute = () => {
  const config = loadThemeConfig();
  const map = buildTaxonomyRouteMap(publishedPosts(), config);
  return new Response(JSON.stringify(map), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
