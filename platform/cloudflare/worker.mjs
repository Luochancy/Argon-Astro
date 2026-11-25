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

const seenNonces = new Set();

function normalizeApiPath(pathname) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
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

    const res = await env.ASSETS.fetch(request);

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
