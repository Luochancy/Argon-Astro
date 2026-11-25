import type { APIRoute } from "astro";
import { loadThemeConfig } from "../config/load";
import { publishedMoments, publishedPages, publishedPosts } from "../lib/content/queries";
import { buildLlmsFullTxt, buildLlmsTxt } from "../lib/agent/llms.mjs";
import { buildRobotsTxt } from "../lib/agent/robots.mjs";

export function getStaticPaths() {
  const config = loadThemeConfig();
  const paths: { params: { doc: string } }[] = [];
  if (config.agent.robotsTxt !== false) {
    paths.push({ params: { doc: "robots" } });
  }
  if (config.agent.enabled && config.agent.llmsTxt) {
    paths.push({ params: { doc: "llms" } }, { params: { doc: "llms-full" } });
  }
  return paths;
}

export const GET: APIRoute = ({ params }) => {
  const config = loadThemeConfig();
  const doc = params.doc;

  if (doc === "robots") {
    return new Response(buildRobotsTxt(config), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (doc === "llms") {
    const custom = String(config.agent.customLlmsTxt || "").replace(/\r\n/g, "\n").trim();
    const body = custom
      ? custom + "\n"
      : buildLlmsTxt(config, [...publishedPosts(), ...publishedMoments(), ...publishedPages()]);
    return new Response(body, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (doc === "llms-full") {
    const entries = [...publishedPosts(), ...publishedMoments(), ...publishedPages()];
    return new Response(buildLlmsFullTxt(config, entries), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response("Not found", { status: 404 });
};
