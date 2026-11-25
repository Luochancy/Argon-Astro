import assert from "node:assert/strict";
import { handleCommentUpvote } from "../src/lib/comments/upvote.mjs";
import { zoomifyTransform } from "../src/lib/motion/zoomify.mjs";

assert.equal(zoomifyTransform(0.9, false), "none");
assert.equal(zoomifyTransform(0.9, true), "scale(0.9)");
assert.equal(zoomifyTransform(9, true), "scale(0.9)");

const host = "https://secret-cms.example";
let seen = "";
const ok = await handleCommentUpvote(new Request("https://blog.example/api/comment-upvote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: 8 }),
}), { WP_URL: host, WP_USER: "editor", WP_APP_PASSWORD: "pw" }, async (url) => {
  seen = url;
  return new Response(JSON.stringify({ total: 2, leak: host }));
});
const text = await ok.text();
assert.equal(ok.status, 200);
assert.equal(seen, host + "/wp-json/argon-astro/v1/comment-upvote");
assert.equal(text.includes(host), false);
console.log("motion ok");
