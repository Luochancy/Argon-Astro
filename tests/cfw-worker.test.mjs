import assert from "node:assert/strict";
import worker from "../platform/cloudflare/worker.mjs";
import { handlePostUnlock } from "../src/lib/wordpress/post-unlock.mjs";
import { handleViews } from "../src/lib/wordpress/views.mjs";
import { acceptsMarkdown, resolveNegotiatedMarkdownPath, estimateMarkdownTokens } from "../src/lib/agent/negotiate.mjs";

// 0. Unit tests for RFC 9110 Accept: text/markdown parsing
assert.equal(acceptsMarkdown("text/markdown"), true);
assert.equal(acceptsMarkdown("text/markdown, text/html;q=0.9"), true);
assert.equal(acceptsMarkdown("text/markdown, text/html"), true);
assert.equal(acceptsMarkdown("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"), false);
assert.equal(acceptsMarkdown("text/html, text/markdown;q=0.5"), false);
assert.equal(acceptsMarkdown("*/*"), false);
assert.equal(acceptsMarkdown(""), false);
assert.equal(resolveNegotiatedMarkdownPath("/posts/hello-argon/"), "/posts/hello-argon.md");
assert.equal(resolveNegotiatedMarkdownPath("/archives/707.html"), "/archives/707.md");
assert.equal(resolveNegotiatedMarkdownPath("/aboutme.html"), "/aboutme.md");
assert.equal(resolveNegotiatedMarkdownPath("/"), "/llms.txt");
assert.equal(resolveNegotiatedMarkdownPath("/about/"), "/about.md");
assert.equal(resolveNegotiatedMarkdownPath("/argon/style.css"), null);
assert.ok(estimateMarkdownTokens("# 你好 Argon\nHello world") > 0);

// 1. /api/comments routes to handler and refuses without WP secrets (never leaks CMS host)
const cRes = await worker.fetch(new Request("https://blog.example/api/comments?post=1"), {});
assert.equal(cRes.status, 503);
assert.equal((await cRes.text()).includes("wp-json"), false);

// 2. /api/comment-upvote and /api/shuoshuo-upvote route properly
const cuRes = await worker.fetch(new Request("https://blog.example/api/comment-upvote", { method: "POST" }), {});
assert.equal(cuRes.status, 503);
const suRes = await worker.fetch(new Request("https://blog.example/api/shuoshuo-upvote", { method: "POST" }), {});
assert.equal(suRes.status, 503);

// 3. /api/deploy rejects unsigned requests
const dRes = await worker.fetch(new Request("https://blog.example/api/deploy", { method: "POST", body: "{}" }), {
  ARGON_DEPLOY_SECRET: "secret",
});
assert.equal(dRes.status, 401);

// 4. Unknown /api/* returns JSON 404
const nfRes = await worker.fetch(new Request("https://blog.example/api/nonexistent"), {});
assert.equal(nfRes.status, 404);

const mockAssets = {
  async fetch(req) {
    const p = new URL(req.url).pathname;
    if (p === "/posts/hello-argon.md") {
      return new Response("# 你好 Argon\n\nMarkdown body.\n", {
        status: 200,
        headers: { "content-type": "text/markdown" },
      });
    }
    if (p === "/llms.txt") {
      return new Response("# Argon\n\n## Posts\n", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    }
    if (p === "/posts/hello-argon/" || p === "/archives/" || p === "/archives/707.html" || p === "/dir-route/index.html") {
      return new Response("<!doctype html><html><body>HTML</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (p === "/archives/707.md") {
      return new Response("# Post 707\n\nBody.\n", {
        status: 200,
        headers: { "content-type": "text/markdown" },
      });
    }
    if (p === "/argon-taxonomies.json") {
      return new Response(JSON.stringify({
        tags: { cuda: "/tags/CUDA/", "luocy-cloud": "/tags/Luocy%20Cloud/" },
        categories: { "赛博文学": "/categories/%E8%B5%9B%E5%8D%9A%E6%96%87%E5%AD%A6/" },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (p === "/tags/CUDA/index.html" || p === "/categories/%E8%B5%9B%E5%8D%9A%E6%96%87%E5%AD%A6/index.html") {
      return new Response("<!doctype html><html><body>TAXONOMY</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    if (p === "/feed.xml") {
      return new Response('<?xml version="1.0"?><rss><channel><title>Argon</title></channel></rss>', {
        status: 200,
        headers: { "content-type": "application/xml; charset=utf-8" },
      });
    }
    return new Response("Not Found", { status: 404 });
  },
};

// 5. HTTP Content Negotiation: `Accept: text/markdown` on canonical post URL returns Markdown
const negPost = await worker.fetch(
  new Request("https://blog.example/posts/hello-argon/", { headers: { Accept: "text/markdown, text/html;q=0.8" } }),
  { ASSETS: mockAssets },
);
assert.equal(negPost.status, 200);
assert.equal(negPost.headers.get("content-type"), "text/markdown; charset=utf-8");
assert.match(negPost.headers.get("vary") || "", /Accept/i);
assert.ok(Number(negPost.headers.get("x-markdown-tokens")) > 0);
assert.match(await negPost.text(), /^# 你好 Argon/);

// 6. Content negotiation on homepage `/` returns `/llms.txt` directory as Markdown
const negHome = await worker.fetch(
  new Request("https://blog.example/", { headers: { Accept: "text/markdown" } }),
  { ASSETS: mockAssets },
);
assert.equal(negHome.status, 200);
assert.equal(negHome.headers.get("content-type"), "text/markdown; charset=utf-8");
assert.match(await negHome.text(), /## Posts/);

// 7. Content negotiation on pages without a .md mirror (e.g. /archives/) gracefully falls back to HTML
const negFallback = await worker.fetch(
  new Request("https://blog.example/archives/", { headers: { Accept: "text/markdown" } }),
  { ASSETS: mockAssets },
);
assert.equal(negFallback.status, 200);
assert.match(negFallback.headers.get("content-type") || "", /text\/html/);
assert.match(negFallback.headers.get("vary") || "", /Accept/i);

// 8. Normal browser visit to canonical post URL receives HTML with Vary: Accept
const browserHtml = await worker.fetch(
  new Request("https://blog.example/posts/hello-argon/", {
    headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
  }),
  { ASSETS: mockAssets },
);
assert.equal(browserHtml.status, 200);
assert.match(browserHtml.headers.get("content-type") || "", /text\/html/);
assert.match(browserHtml.headers.get("vary") || "", /Accept/i);

// 9. Direct browser visit to .md mirror receives text/plain + inline (never forces download)
const directBrowserMd = await worker.fetch(
  new Request("https://blog.example/posts/hello-argon.md", {
    headers: { Accept: "text/html,application/xhtml+xml,*/*;q=0.8" },
  }),
  { ASSETS: mockAssets },
);
assert.equal(directBrowserMd.status, 200);
assert.equal(directBrowserMd.headers.get("content-type"), "text/plain; charset=utf-8");
assert.equal(directBrowserMd.headers.get("content-disposition"), "inline");
assert.equal(directBrowserMd.headers.get("x-content-type-options"), "nosniff");

// 10. Serverless runtime injection for /robots.txt, /llms.txt, and /llms-full.txt (works even when omitted from dist/)
const emptyAssets = { async fetch() { return new Response("Not Found", { status: 404 }); } };
const envDocs = {
  ASSETS: emptyAssets,
  ARGON_ROBOTS_TXT: "User-agent: *\nDisallow: /drafts/",
  ARGON_LLMS_TXT: "# Serverless LLMs\n\nCustom edge directory.",
  ARGON_LLMS_FULL_TXT: "# Full Serverless Corpus",
};
const envRobots = await worker.fetch(new Request("https://blog.example/robots.txt"), envDocs);
assert.equal(envRobots.status, 200);
assert.equal(envRobots.headers.get("content-type"), "text/plain; charset=utf-8");
assert.equal(await envRobots.text(), "User-agent: *\nDisallow: /drafts/\n");

const envLlms = await worker.fetch(new Request("https://blog.example/llms.txt"), envDocs);
assert.equal(envLlms.status, 200);
assert.equal(await envLlms.text(), "# Serverless LLMs\n\nCustom edge directory.\n");

const envLlmsFull = await worker.fetch(new Request("https://blog.example/llms-full.txt"), envDocs);
assert.equal(envLlmsFull.status, 200);
assert.equal(await envLlmsFull.text(), "# Full Serverless Corpus\n");

// Homepage Accept: text/markdown also serves ARGON_LLMS_TXT even if dist/llms.txt was omitted
const envHomeNeg = await worker.fetch(
  new Request("https://blog.example/", { headers: { Accept: "text/markdown" } }),
  envDocs,
);
assert.equal(envHomeNeg.status, 200);
assert.equal(envHomeNeg.headers.get("content-type"), "text/markdown; charset=utf-8");
assert.match(await envHomeNeg.text(), /^# Serverless LLMs/);

// 11. WordPress .html permalink stays at exact URL (200) and supports Accept: text/markdown
const wpHtmlPage = await worker.fetch(
  new Request("https://blog.example/archives/707.html", { headers: { Accept: "text/html" } }),
  { ASSETS: mockAssets },
);
assert.equal(wpHtmlPage.status, 200);
assert.match(wpHtmlPage.headers.get("vary") || "", /Accept/i);

const wpHtmlNeg = await worker.fetch(
  new Request("https://blog.example/archives/707.html", { headers: { Accept: "text/markdown" } }),
  { ASSETS: mockAssets },
);
assert.equal(wpHtmlNeg.status, 200);
assert.equal(wpHtmlNeg.headers.get("content-type"), "text/markdown; charset=utf-8");
assert.match(await wpHtmlNeg.text(), /^# Post 707/);

// 12. html_handling = "none" index.html resolution and trailing-slash redirect for directory routes
const dirIndex = await worker.fetch(new Request("https://blog.example/dir-route/"), { ASSETS: mockAssets });
assert.equal(dirIndex.status, 200);
const dirRedirect = await worker.fetch(new Request("https://blog.example/dir-route"), { ASSETS: mockAssets });
assert.equal(dirRedirect.status, 308);
assert.equal(dirRedirect.headers.get("location"), "https://blog.example/dir-route/");

// 13. Legacy WordPress taxonomy aliases (/archives/tag/cuda, /archive/tag/cuda, /tag/cuda, /tags/cuda, /archives/category/...)
for (const alias of [
  "/archives/tag/cuda",
  "/archives/tag/cuda/",
  "/archive/tag/cuda",
  "/tag/cuda",
  "/tags/cuda/",
  "/archives/category/" + encodeURIComponent("赛博文学"),
  "/archive/category/" + encodeURIComponent("赛博文学") + "/",
]) {
  const res = await worker.fetch(new Request("https://blog.example" + alias), { ASSETS: mockAssets });
  assert.equal(res.status, 200, `taxonomy alias ${alias} should return 200`);
  assert.match(await res.text(), /TAXONOMY/);
}

// 14. /api/post-unlock, /api/views, /api/github, and legacy /feed & /rss routes
const unlockMissing = await worker.fetch(new Request("https://blog.example/api/post-unlock", { method: "POST", body: "{}" }), {});
assert.equal(unlockMissing.status, 503);
assert.equal((await unlockMissing.text()).includes("wp-json"), false);

const unlockOk = await handlePostUnlock(
  new Request("https://blog.example/api/post-unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: 102, password: "open" }),
  }),
  { WP_URL: "https://cms.secret", WP_USER: "bot", WP_APP_PASSWORD: "pw" },
  async (url, init) => {
    assert.equal(url, "https://cms.secret/wp-json/argon-astro/v1/post-unlock");
    assert.deepEqual(JSON.parse(init.body), { id: 102, password: "open" });
    return new Response(JSON.stringify({ id: 102, title: "Secret", html: "<p>Unlocked!</p>" }), { status: 200 });
  },
);
assert.equal(unlockOk.status, 200);
assert.equal((await unlockOk.json()).html, "<p>Unlocked!</p>");

const unlockDeny = await handlePostUnlock(
  new Request("https://blog.example/api/post-unlock", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: 102, password: "wrong" }),
  }),
  { WP_URL: "https://cms.secret", WP_USER: "bot", WP_APP_PASSWORD: "pw" },
  async () => new Response(JSON.stringify({ error: "wrong" }), { status: 403 }),
);
assert.equal(unlockDeny.status, 403);

const viewsMissing = await worker.fetch(new Request("https://blog.example/api/views?id=101"), {});
assert.equal(viewsMissing.status, 503);

const viewsGet = await handleViews(
  new Request("https://blog.example/api/views?id=101"),
  { WP_URL: "https://cms.secret", WP_USER: "bot", WP_APP_PASSWORD: "pw" },
  async (url) => {
    assert.equal(url, "https://cms.secret/wp-json/argon-astro/v1/views?id=101");
    return new Response(JSON.stringify({ id: 101, views: 42 }), { status: 200 });
  },
);
assert.equal(viewsGet.status, 200);
assert.equal((await viewsGet.json()).views, 42);

const viewsPost = await handleViews(
  new Request("https://blog.example/api/views", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: 101 }),
  }),
  { WP_URL: "https://cms.secret", WP_USER: "bot", WP_APP_PASSWORD: "pw" },
  async (url, init) => {
    assert.equal(url, "https://cms.secret/wp-json/argon-astro/v1/views");
    assert.deepEqual(JSON.parse(init.body), { id: 101 });
    return new Response(JSON.stringify({ id: 101, views: 43 }), { status: 200 });
  },
);
assert.equal(viewsPost.status, 200);
assert.equal((await viewsPost.json()).views, 43);

const ghBad = await worker.fetch(new Request("https://blog.example/api/github?author=../bad&project=repo"), {});
assert.equal(ghBad.status, 400);

for (const feedPath of ["/feed", "/feed/", "/rss", "/rss/"]) {
  const feedRes = await worker.fetch(new Request("https://blog.example" + feedPath), { ASSETS: mockAssets });
  assert.equal(feedRes.status, 200, `${feedPath} should serve /feed.xml`);
  assert.match(feedRes.headers.get("content-type") || "", /application\/rss\+xml/);
  assert.match(await feedRes.text(), /<rss>/);
}

console.log("cfw worker ok");
