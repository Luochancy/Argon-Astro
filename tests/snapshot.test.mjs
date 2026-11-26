import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { writeSnapshot, snapshotFailed } from "../src/lib/wordpress/snapshot.mjs";

const root = mkdtempSync(join(tmpdir(), "argon-snapshot-"));
const downloaded = [];
const client = {
  origin: "https://cms.example",
  async getJson() {
    return {
      version: 1,
      appearance: { color: "#112233" },
      banner: { backgroundUrl: "https://cms.example/uploads/banner hero.jpg" },
      background: {
        url: "https://cms.example/uploads/bg-light.png",
        darkUrl: "https://cms.example/uploads/bg-dark.png",
      },
      toolbar: { icon: "https://cms.example/uploads/logo.png" },
      sidebar: { authorImage: "https://cdn.example/avatar.webp" },
      article: { donateQr: "https://cms.example/uploads/donate.png" },
      friendLinks: [
        { name: "LocalFriend", url: "https://friend.example", avatar: "https://cms.example/uploads/friend.png" },
        { name: "ExtFriend", url: "https://ext.example", avatar: "https://cdn.example/ext-avatar.png" },
      ],
      media: [{ id: 12, sourceUrl: "https://cms.example/uploads/banner hero.jpg" }],
    };
  },
  async list(kind) {
    if (kind === "posts") {
      return [{
        id: 9,
        slug: "from-wp",
        title: "From WP",
        date: "2026-11-11T00:00:00.000Z",
        modifiedDate: "2026-11-12T00:00:00.000Z",
        excerpt: "excerpt",
        categories: ["笔记"],
        tags: ["Argon"],
        upvotes: 12,
        featuredMediaId: 3,
        featuredMediaUrl: "https://cms.example/a.jpg",
        raw: "<!-- wp:paragraph -->\n<p>full: https://cms.example/a.jpg resized: https://cms.example/a-1024x768.jpg</p>\n<!-- /wp:paragraph -->",
        media: [{ id: 3, sourceUrl: "https://cms.example/a.jpg" }],
        comments: [{
          id: 5,
          parent: 0,
          author: "Alice",
          date: "2026-11-11T01:00:00Z",
          content: "Nice post",
          parentAuthor: "",
          pinned: true,
          private: false,
          markdown: true,
          upvotes: 2,
          qq: "",
          gravatar: "",
          userAgent: "",
        }],
      }];
    }
    if (kind === "pages") {
      return [{
        id: 20,
        slug: "%E5%85%B3%E4%BA%8E",
        title: "About",
        date: "2026-11-10T00:00:00.000Z",
        excerpt: "about",
        raw: "<p>About page</p>",
        media: [],
      }];
    }
    if (kind === "shuoshuo") {
      return [{
        id: 30,
        slug: "moment-1",
        title: "Moment",
        date: "2026-11-11T02:00:00.000Z",
        excerpt: "hi",
        sticky: true,
        upvotes: 4,
        raw: "<p>hello</p>",
        media: [],
        images: ["https://cms.example/uploads/shot 1.png", "https://cdn.example/external-shot.png"],
      }];
    }
    return [];
  },
  async download(sourceUrl, target) {
    downloaded.push({ sourceUrl, target });
  },
};

const result = await writeSnapshot(client, root);
assert.equal(result.posts, 1);
assert.equal(result.pages, 1);
assert.equal(result.shuoshuo, 1);
assert.equal(existsSync(join(root, ".cache", "snapshot-complete.json")), true);

const post = readFileSync(join(root, ".cache", "content", "posts", "from-wp.md"), "utf8");
assert.equal(post.includes("https://cms.example"), false, "secret host must not remain in post");
assert.match(post, /cover: "\/media\/wp\/3-a\.jpg"/);
assert.match(post, /modifiedDate: "2026-11-12T00:00:00\.000Z"/);
assert.match(post, /upvotes: 12/);
assert.match(post, /comments: \[\{"id":5,/);
assert.equal(post.includes("template:"), false, "posts should not get page template");
assert.equal(post.includes("<ol class=\"comment-list\">"), false, "comments HTML must not be appended to markdown body");
assert.equal(post.includes("a-1024x768.jpg"), false, "resized WP image URL must be rewritten");

const page = readFileSync(join(root, ".cache", "content", "pages", "关于.md"), "utf8");
assert.match(page, /template: "page"/);

const moment = readFileSync(join(root, ".cache", "content", "shuoshuo", "moment-1.md"), "utf8");
assert.equal(moment.includes("https://cms.example"), false, "shuoshuo image must be rewritten");
assert.match(moment, /\/media\/wp\/[a-f0-9]{8}-shot-1\.png/);
assert.equal(moment.includes("https://cdn.example/external-shot.png"), true, "external shuoshuo image must stay untouched");
assert.match(moment, /sticky: true/);
assert.match(moment, /upvotes: 4/);

const theme = JSON.parse(readFileSync(join(root, ".cache", "wp-theme.json"), "utf8"));
assert.equal(JSON.stringify(theme).includes("https://cms.example"), false, "theme config images must be rewritten");
assert.equal("media" in theme, false, "config.media must be stripped from wp-theme.json");
assert.match(theme.banner.backgroundUrl, /^\/media\/wp\/12-banner-hero\.jpg$/);
assert.match(theme.background.url, /^\/media\/wp\//);
assert.match(theme.background.darkUrl, /^\/media\/wp\//);
assert.match(theme.toolbar.icon, /^\/media\/wp\//);
assert.match(theme.article.donateQr, /^\/media\/wp\//);
assert.equal(theme.sidebar.authorImage, "https://cdn.example/avatar.webp", "external CDN avatar must not be mirrored");
assert.match(theme.friendLinks[0].avatar, /^\/media\/wp\//);
assert.equal(theme.friendLinks[1].avatar, "https://cdn.example/ext-avatar.png", "external friend avatar must not be mirrored");
assert.equal(downloaded.some((d) => d.sourceUrl.includes("cdn.example")), false, "external CDN URLs must never be downloaded");
assert.equal(downloaded.length, 8);

snapshotFailed(root);
assert.equal(existsSync(join(root, ".cache", "snapshot-complete.json")), false);
console.log("snapshot ok");
