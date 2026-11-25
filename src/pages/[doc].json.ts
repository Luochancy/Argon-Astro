import type { APIRoute } from "astro";
import { loadThemeConfig } from "../config/load";
import { publishedMoments, publishedPages, publishedPosts } from "../lib/content/queries";
import { buildAgentIndex } from "../lib/agent/llms.mjs";

export function getStaticPaths() {
  const config = loadThemeConfig();
  if (!config.agent.enabled || !config.agent.jsonIndex) return [];
  return [{ params: { doc: "agent-index" } }];
}

export const GET: APIRoute = ({ params }) => {
  if (params.doc !== "agent-index") {
    return new Response("Not found", { status: 404 });
  }
  const config = loadThemeConfig();
  const entries = [...publishedPosts(), ...publishedMoments(), ...publishedPages()];
  return new Response(JSON.stringify(buildAgentIndex(config, entries), null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
