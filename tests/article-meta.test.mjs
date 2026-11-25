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
console.log("article meta ok");
