// Cloudflare Workers (Static Assets + Edge API + HTTP Markdown Content Negotiation) for Argon Astro.
// Static bundles, fonts, media, and feeds bypass the Worker via wrangler.toml negative rules.
// Page routes negotiate `Accept: text/markdown` -> pre-built static .md mirrors with Vary: Accept.
// /robots.txt, /llms.txt, and /llms-full.txt support runtime Serverless env injection/override.
import { handleComments } from "../../src/lib/comments/handler.mjs";
import { handleCommentUpvote } from "../../src/lib/comments/upvote.mjs";
import { handleUpvote } from "../../src/lib/shuoshuo/upvote.mjs";
import { handleDeployHook } from "../../src/lib/ci/receiver.mjs";
import {
  acceptsMarkdown,
  appendVaryAccept,
  estimateMarkdownTokens,
  resolveNegotiatedMarkdownPath,
} from "../../src/lib/agent/negotiate.mjs";
import {
  buildServerlessDocResponse,
  getServerlessDocText,
} from "../../src/lib/agent/serverless-docs.mjs";
import { resolveTaxonomyAliasPath } from "../../src/lib/content/taxonomies.mjs";

const seenNonces = new Set();
let cachedTaxonomyMap = null;

function normalizeApiPath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

async function handleBingWallpaper(request) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  try {
    const apiRes = await fetch("https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1", {
      headers: { accept: "application/json", "user-agent": "Argon-Astro-Worker/1.0" },
      cf: { cacheTtl: 21600, cacheEverything: true },
    });
    if (apiRes.ok) {
      const data = await apiRes.json();
      const rel = data && Array.isArray(data.images) && data.images[0] ? data.images[0].url : "";
      if (typeof rel === "string" && rel.startsWith("/")) {
        const target = "https://www.bing.com" + rel;
        const imgRes = await fetch(target, {
          headers: { "user-agent": "Argon-Astro-Worker/1.0" },
          cf: { cacheTtl: 21600, cacheEverything: true },
        });
        if (imgRes.ok) {
          const headers = new Headers(imgRes.headers);
          headers.set("cache-control", "public, max-age=3600, s-maxage=21600");
          return new Response(method === "HEAD" ? null : imgRes.body, {
            status: 200,
            headers,
          });
        }
        return new Response(null, {
          status: 302,
          headers: {
            location: target,
            "cache-control": "public, max-age=3600",
          },
        });
      }
    }
  } catch {
    // Fall through to 502 so CSS gradient placeholder stays visible.
  }
  return new Response("Bing wallpaper unavailable.", { status: 502 });
}

async function loadTaxonomyMap(url, env) {
  if (cachedTaxonomyMap) return cachedTaxonomyMap;
  if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") return null;
  try {
    const res = await env.ASSETS.fetch(new Request(new URL("/argon-taxonomies.json", url.origin).toString()));
    if (res.ok) {
      const parsed = await res.json();
      if (parsed && typeof parsed === "object" && (parsed.tags || parsed.categories)) {
        cachedTaxonomyMap = parsed;
        return cachedTaxonomyMap;
      }
    }
  } catch {
    // Ignore when taxonomy manifest is not present.
  }
  return null;
}

async function fetchStaticAsset(request, url, env) {
  const direct = await env.ASSETS.fetch(request);
  if (direct.status !== 404) return direct;
  const pathname = url.pathname;
  if (pathname === "/" || pathname.endsWith("/")) {
    const idxUrl = new URL(pathname + "index.html", url.origin);
    const idxRes = await env.ASSETS.fetch(new Request(idxUrl.toString(), { method: request.method, headers: request.headers }));
    if (idxRes.status !== 404) return idxRes;
  } else {
    const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
    if (!lastSegment.includes(".")) {
      const idxUrl = new URL(pathname + "/index.html", url.origin);
      const idxRes = await env.ASSETS.fetch(new Request(idxUrl.toString(), { method: "HEAD" }));
      if (idxRes.ok) {
        return Response.redirect(url.origin + pathname + "/" + url.search, 308);
      }
      const htmlUrl = new URL(pathname + ".html", url.origin);
      const htmlRes = await env.ASSETS.fetch(new Request(htmlUrl.toString(), { method: request.method, headers: request.headers }));
      if (htmlRes.status !== 404) return htmlRes;
    }
  }

  // Legacy WordPress taxonomy aliases (/archives/tag/cuda, /archive/tag/cuda, /tag/cuda, /archives/category/...).
  const taxMap = await loadTaxonomyMap(url, env);
  const resolvedTax = resolveTaxonomyAliasPath(pathname, taxMap);
  if (resolvedTax) {
    const targetUrl = new URL(resolvedTax + "index.html", url.origin);
    const targetRes = await env.ASSETS.fetch(new Request(targetUrl.toString(), { method: request.method, headers: request.headers }));
    if (targetRes.status !== 404) return targetRes;
    const altUrl = new URL(resolvedTax, url.origin);
    const altRes = await env.ASSETS.fetch(new Request(altUrl.toString(), { method: request.method, headers: request.headers }));
    if (altRes.status !== 404) return altRes;
  }

  return direct;
}

async function buildMarkdownResponse(bodyText, baseHeaders, status, statusText, method) {
  const headers = new Headers(baseHeaders);
  headers.set("content-type", "text/markdown; charset=utf-8");
  headers.set("content-disposition", "inline");
  headers.set("x-content-type-options", "nosniff");
  if (method !== "HEAD") {
    headers.set("x-markdown-tokens", String(estimateMarkdownTokens(bodyText)));
  }
  appendVaryAccept(headers);
  return new Response(method === "HEAD" ? null : bodyText, {
    status,
    statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizeApiPath(url.pathname);

    if (path === "/api/comments") {
      return handleComments(request, env);
    }
    if (path === "/api/comment-upvote") {
      return handleCommentUpvote(request, env);
    }
    if (path === "/api/shuoshuo-upvote") {
      return handleUpvote(request, env);
    }
    if (path === "/api/deploy") {
      return handleDeployHook(request, env, seenNonces);
    }
    if (path === "/api/bing") {
      return handleBingWallpaper(request);
    }
    if (path.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Not found." }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const method = request.method.toUpperCase();

    // 1. Runtime Serverless injection/override for /robots.txt, /llms.txt, /llms-full.txt.
    if (method === "GET" || method === "HEAD") {
      const injected = getServerlessDocText(url.pathname, env);
      if (injected !== null) {
        const wantsMd = (url.pathname === "/llms.txt" || url.pathname === "/llms-full.txt") && acceptsMarkdown(request.headers.get("accept"));
        return wantsMd
          ? buildMarkdownResponse(injected, {}, 200, "OK", method)
          : buildServerlessDocResponse(injected, method);
      }
    }

    if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response("Static assets binding (ASSETS) is not configured.", {
        status: 500,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const wantsMarkdown = (method === "GET" || method === "HEAD") && acceptsMarkdown(request.headers.get("accept"));

    // 2. HTTP Content Negotiation: `Accept: text/markdown` on canonical URLs transparently returns Markdown.
    if (wantsMarkdown) {
      const mdPath = resolveNegotiatedMarkdownPath(url.pathname);
      if (mdPath) {
        // Homepage `/` negotiated as Markdown honors Serverless ARGON_LLMS_TXT first.
        if (mdPath === "/llms.txt") {
          const injectedLlms = getServerlessDocText("/llms.txt", env);
          if (injectedLlms !== null) {
            return buildMarkdownResponse(injectedLlms, {}, 200, "OK", method);
          }
        }
        const mdUrl = new URL(mdPath, url.origin);
        const mdRes = await env.ASSETS.fetch(new Request(mdUrl.toString(), { method }));
        if (mdRes.ok) {
          const bodyText = method === "HEAD" ? "" : await mdRes.text();
          return buildMarkdownResponse(bodyText, mdRes.headers, mdRes.status, mdRes.statusText, method);
        }
      }
    }

    const res = await fetchStaticAsset(request, url, env);

    // 3. Direct browser access to .md/.txt mirrors uses text/plain + inline so Chromium/Edge never downloads.
    if ((url.pathname.endsWith(".md") || url.pathname.endsWith(".txt")) && res.ok) {
      const headers = new Headers(res.headers);
      headers.set("content-type", "text/plain; charset=utf-8");
      headers.set("content-disposition", "inline");
      headers.set("x-content-type-options", "nosniff");
      appendVaryAccept(headers);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }

    // 4. Tag HTML page responses with `Vary: Accept` so caches separate HTML and negotiated Markdown.
    const ct = res.headers.get("content-type") || "";
    if (res.ok && ct.includes("text/html")) {
      const headers = new Headers(res.headers);
      appendVaryAccept(headers);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }

    return res;
  },
};
