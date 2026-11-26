// End-to-end dual-mode verification: starts a mock headless WordPress server,
// runs the full headless sync + config merge + Astro static build + verify-no-cms,
// asserts Gutenberg/shuoshuo/media rewriting and comment-provider isolation,
// then restores a clean local build.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

function runNode(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed: node ${args.join(" ")}\n${stdout}\n${stderr}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const origin = `http://${req.headers.host}`;
  if (url.pathname === "/wp-content/uploads/2026/11/hero.png") {
    res.writeHead(200, { "content-type": "image/png" });
    res.end(TINY_PNG);
    return;
  }
  if (!req.headers.authorization?.startsWith("Basic ")) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }
  const json = (body) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/wp-json/argon-astro/v1/config") {
    return json({
      site: { title: "Headless Argon E2E" },
      banner: { backgroundUrl: "--bing--", toolbarMask: true },
      toolbar: {
        iconLink: `${origin}/`,
        menu: [{ label: "关于我", href: `${origin}/aboutme.html`, icon: "fa fa-user-o", children: [] }],
      },
      sidebar: {
        authorImage: "https://cdn.invalid/avatar.png",
        bannerSubtitle: "--hitokoto--",
        widgetsHtml: `<section class="widget"><a href="${origin}/archives/101.html">WP Widget Link</a></section>`,
        extraHtml: `<div class="wp-extra-widget">Extra Siteinfo</div>`,
      },
      article: {
        meta: ["time", "edittime", "views", "categories", "comments"],
      },
      friendLinks: [{ name: "Ext", url: "https://ext.example", avatar: "https://cdn.invalid/friend.png" }],
      // Attempt to override comments.provider — must be ignored by compile-config.mjs.
      comments: { provider: "giscus" },
      media: [{ id: 10, sourceUrl: `${origin}/wp-content/uploads/2026/11/hero.png`, filename: "hero.png" }],
    });
  }
  if (url.pathname === "/wp-json/argon-astro/v1/posts") {
    return json({
      page: 1,
      totalPages: 1,
      items: [
        {
          id: 101,
          slug: "headless-gutenberg",
          permalink: "/archives/101.html",
          title: "Headless Gutenberg Post",
          date: "2026-11-25T00:00:00.000Z",
          modifiedDate: "2026-11-25T02:00:00.000Z",
          excerpt: "Synced from mock WP",
          tags: ["Headless"],
          categories: ["CMS"],
          sticky: true,
          passwordProtected: false,
          featuredMediaId: 10,
          featuredMediaUrl: `${origin}/wp-content/uploads/2026/11/hero.png`,
          views: 128,
          commentCount: 1,
          comments: [{ id: 1, author: "Alice", content: "Hello from WP", upvotes: 2 }],
          raw: [
            `<!-- wp:image {"id":10} --><figure class="wp-block-image"><img src="${origin}/wp-content/uploads/2026/11/hero-300x200.png" alt="Hero"/></figure><!-- /wp:image -->`,
            `<!-- wp:argon/alert {"title":"Notice"} --><p>Synced block</p><!-- /wp:argon/alert -->`,
            `[collapse title="Details"]Inner shortcode[/collapse]`,
          ].join("\n"),
          media: [{ id: 10, sourceUrl: `${origin}/wp-content/uploads/2026/11/hero.png`, filename: "hero.png" }],
        },
        {
          id: 102,
          slug: "secret-post",
          title: "Secret Post",
          date: "2026-11-24T00:00:00.000Z",
          excerpt: "",
          tags: [],
          categories: [],
          sticky: false,
          protected: true,
          commentCount: 0,
          raw: "TOP_SECRET_SHOULD_NOT_LEAK",
          media: [],
        },
      ],
    });
  }
  if (url.pathname === "/wp-json/argon-astro/v1/pages") {
    return json({
      page: 1,
      totalPages: 1,
      items: [
        {
          id: 201,
          slug: "aboutme",
          permalink: "/aboutme.html",
          commentsOpen: true,
          title: "Headless About",
          date: "2026-11-20T00:00:00.000Z",
          excerpt: "About page",
          tags: [],
          categories: [],
          commentCount: 0,
          content: "<!-- wp:paragraph --><p>Headless page body [friendlinks]</p><!-- /wp:paragraph -->",
          media: [],
        },
      ],
    });
  }
  if (url.pathname === "/wp-json/argon-astro/v1/shuoshuo") {
    return json({
      page: 1,
      totalPages: 1,
      items: [
        {
          id: 301,
          slug: "wp-moment",
          title: "WP Moment",
          date: "2026-11-25T01:00:00.000Z",
          excerpt: "",
          tags: [],
          categories: [],
          sticky: true,
          upvotes: 7,
          mood: "happy",
          images: [`${origin}/wp-content/uploads/2026/11/hero.png`],
          commentCount: 0,
          raw: "<p>Headless shuoshuo entry</p>",
          media: [{ id: 10, sourceUrl: `${origin}/wp-content/uploads/2026/11/hero.png`, filename: "hero.png" }],
        },
      ],
    });
  }
  res.writeHead(404);
  res.end("not found");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const wpUrl = `http://127.0.0.1:${port}`;
const wpEnv = {
  ARGON_SOURCE: "wordpress",
  WP_URL: wpUrl,
  WP_USER: "bot",
  WP_APP_PASSWORD: "secret",
};

try {
  await runNode(["scripts/compile-config.mjs"], wpEnv);
  await runNode(["scripts/sync-wordpress.mjs"], wpEnv);
  await runNode(["scripts/compile-config.mjs"], wpEnv);
  await runNode(["scripts/prepare-build.mjs"], wpEnv);
  await runNode(["scripts/build-content.mjs"], wpEnv);
  await runNode(["node_modules/astro/bin/astro.mjs", "build"], wpEnv);
  await runNode(["scripts/verify-no-cms.ts"], wpEnv);

  // Verify theme config merged remote title while keeping local comments.provider ("wordpress").
  const mergedConfig = JSON.parse(readFileSync(join(root, "src/generated/theme-config.json"), "utf8"));
  assert.equal(mergedConfig.site.title, "Headless Argon E2E");
  assert.equal(mergedConfig.comments.provider, "wordpress");
  assert.equal(mergedConfig.banner.backgroundUrl, "--bing--");
  assert.equal(mergedConfig.toolbar.iconLink, "/");
  assert.equal(mergedConfig.toolbar.menu[0].href, "/aboutme.html");
  assert.equal(mergedConfig.sidebar.authorImage, "https://cdn.invalid/avatar.png");
  assert.equal("media" in mergedConfig, false);

  // Verify homepage resolved --bing--, --hitokoto--, toolbarMask, menu icon, and .html post link.
  const indexHtml = readFileSync(join(root, "dist/index.html"), "utf8");
  assert.match(indexHtml, /url\(\/api\/bing\)/);
  assert.match(indexHtml, /<span class="hitokoto"><\/span>/);
  assert.match(indexHtml, /#banner:after/);
  assert.match(indexHtml, /fa fa-user-o/);
  assert.match(indexHtml, /href="\/archives\/101\.html"/);

  // Verify WordPress .html permalink emitted as a real file (not a directory) with .md mirror and rewritten media.
  const postFile = join(root, "dist/archives/101.html");
  assert.equal(statSync(postFile).isFile(), true, "WordPress .html permalink must be a flat file");
  const postHtml = readFileSync(postFile, "utf8");
  assert.match(postHtml, /\/media\/wp\/10-hero\.png/);
  assert.match(postHtml, /collapse-block/);
  assert.match(postHtml, /data-wp-id="101"/);
  assert.match(postHtml, /data-views-post-id="101">128</);
  assert.match(postHtml, /post-meta-detail-edittime/);
  assert.match(postHtml, /id="blog_categories"/);
  assert.match(postHtml, /id="blog_tags"/);
  assert.match(postHtml, /WP Widget Link/);
  assert.match(postHtml, /Extra Siteinfo/);
  assert.equal(postHtml.includes(wpUrl), false);
  assert.equal(existsSync(join(root, "public/media/wp/10-hero.png")), true);
  assert.equal(existsSync(join(root, "dist/archives/101.md")), true);

  // Verify date archive pages (/archives/date/2026/ and /archives/date/2026/11/) were emitted.
  const yearArchive = readFileSync(join(root, "dist/archives/date/2026/index.html"), "utf8");
  assert.match(yearArchive, /Headless Gutenberg Post/);
  const monthArchive = readFileSync(join(root, "dist/archives/date/2026/11/index.html"), "utf8");
  assert.match(monthArchive, /Headless Gutenberg Post/);

  // Verify full-text search index includes public post body and excludes locked post body.
  const searchHtml = readFileSync(join(root, "dist/search/index.html"), "utf8");
  assert.match(searchHtml, /Inner shortcode/);
  assert.equal(searchHtml.includes("TOP_SECRET_SHOULD_NOT_LEAK"), false);

  // Verify WordPress .html page emitted as a real file with friendlinks shortcode + comments form.
  const aboutFile = join(root, "dist/aboutme.html");
  assert.equal(statSync(aboutFile).isFile(), true, "WordPress page .html permalink must be a flat file");
  const aboutHtml = readFileSync(aboutFile, "utf8");
  assert.match(aboutHtml, /friend-link-container/);
  assert.match(aboutHtml, /id="argon-comment-form"/);

  // Verify password-protected post body did not leak.
  const secretHtml = readFileSync(join(root, "dist/posts/secret-post/index.html"), "utf8");
  assert.equal(secretHtml.includes("TOP_SECRET_SHOULD_NOT_LEAK"), false);

  // Verify headless shuoshuo page built cleanly with rewritten image.
  const shuoshuoHtml = readFileSync(join(root, "dist/shuoshuo/index.html"), "utf8");
  assert.match(shuoshuoHtml, /Headless shuoshuo entry/);
  assert.match(shuoshuoHtml, /\/media\/wp\/10-hero\.png/);

  console.log("headless e2e ok");
} finally {
  server.close();
  // Restore clean local build so workspace dist/ and src/generated/ stay in local mode.
  rmSync(join(root, ".cache"), { recursive: true, force: true });
  rmSync(join(root, "public/media/wp"), { recursive: true, force: true });
  const localEnv = { ARGON_SOURCE: "local", WP_URL: "" };
  await runNode(["scripts/compile-config.mjs"], localEnv);
  await runNode(["scripts/build-content.mjs"], localEnv);
  await runNode(["node_modules/astro/bin/astro.mjs", "build"], localEnv);
}
