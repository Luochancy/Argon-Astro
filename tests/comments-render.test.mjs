import assert from "node:assert/strict";
import { renderCommentList } from "../src/lib/comments/render.mjs";
import { shareLinks } from "../src/lib/share.mjs";

const html = renderCommentList([
  { id: 2, author: "甲", content: "**加粗**", markdown: true, parentAuthor: "乙", pinned: true },
  { id: 3, author: "丙", content: "不要出现的悄悄话", private: true },
]);
assert.match(html, /<strong>加粗<\/strong>/);
assert.match(html, /comment-parent-info/);
assert.match(html, /badge-pinned/);
assert.match(html, /badge-private-comment/);
assert.equal(html.includes("不要出现的悄悄话"), false);
const links = shareLinks("https://blog.example/posts/a/", "标题");
assert.equal(links.some((link) => String(link.href).includes("wp-json")), false);
assert.equal(links.some((link) => link.id === "telegram"), true);
console.log("comment render ok");
