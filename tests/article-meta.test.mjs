import assert from "node:assert/strict";
import { articleMeta } from "../src/lib/article-meta.mjs";

const items = articleMeta(["time", "views", "categories", "author"], {
  date: "2026-11-11",
  categories: ["笔记"],
  commentCount: 0,
}, { author: "Argon" });
assert.deepEqual(items.map((item) => item.key), ["time", "categories", "author"]);
assert.equal(items.some((item) => item.key === "views"), false);
assert.equal(JSON.stringify(items).includes("wp-json"), false);

const full = articleMeta(["time", "edittime", "views", "categories", "comments", "author"], {
  date: "2026-11-11",
  modifiedDate: "2026-11-12",
  views: 256,
  categories: ["笔记"],
  commentCount: 3,
}, { author: "Argon" });
assert.deepEqual(full.map((item) => item.key), ["time", "edittime", "views", "categories", "comments", "author"]);
assert.equal(full.find((item) => item.key === "edittime")?.text, "2026-11-12");
assert.equal(full.find((item) => item.key === "views")?.text, "256");

console.log("article meta ok");
