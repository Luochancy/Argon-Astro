import assert from "node:assert/strict";
import { pangu } from "../src/lib/pangu.mjs";
import { filterSearch } from "../src/lib/search/filter.mjs";

assert.equal(pangu("你好Astro世界"), "你好 Astro 世界");
const hits = filterSearch([
  { title: "笔记", text: "本地", kind: "post" },
  { title: "说说", text: "早晨", kind: "shuoshuo" },
], "早晨", ["post"]);
assert.equal(hits.length, 0);
const moments = filterSearch([
  { title: "说说", text: "早晨", kind: "shuoshuo" },
], "早晨", ["shuoshuo"]);
assert.equal(moments.length, 1);
console.log("text ok");
