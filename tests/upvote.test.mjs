import assert from "node:assert/strict";
import { handleUpvote } from "../src/lib/shuoshuo/upvote.mjs";
import { handleCommentUpvote } from "../src/lib/comments/upvote.mjs";
import { handler as netlifyComments } from "../platform/netlify/functions/comments.js";

const host = "https://secret-cms.example";
const missing = await handleUpvote(new Request("https://blog.example/api/shuoshuo-upvote", { method: "POST", body: "{}" }), {});
assert.equal(missing.status, 503);
assert.equal((await missing.text()).includes(host), false);

let seen = "";
const ok = await handleUpvote(new Request("https://blog.example/api/shuoshuo-upvote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: 4 }),
}), { WP_URL: host, WP_USER: "editor", WP_APP_PASSWORD: "pw" }, async (url, init) => {
  seen = url + " " + init.body;
  return new Response(JSON.stringify({ status: "success", total: 3, secret: host }));
});
const text = await ok.text();
assert.equal(ok.status, 200);
assert.equal(seen.startsWith(host + "/wp-json/argon-astro/v1/shuoshuo-upvote"), true);
assert.equal(text.includes(host), false);
assert.match(text, /"total":3/);

// Comment upvote handler
let commentSeen = "";
const commentOk = await handleCommentUpvote(new Request("https://blog.example/api/comment-upvote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: 12 }),
}), { WP_URL: host, WP_USER: "editor", WP_APP_PASSWORD: "pw" }, async (url, init) => {
  commentSeen = url + " " + init.body;
  return new Response(JSON.stringify({ status: "success", total: 8 }));
});
assert.equal(commentOk.status, 200);
assert.equal(commentSeen, host + '/wp-json/argon-astro/v1/comment-upvote {"id":12}');
assert.deepEqual(await commentOk.json(), { total: 8 });

// Netlify GET handler must not throw TypeError for non-null body on GET
const netlifyRes = await netlifyComments({
  httpMethod: "GET",
  rawUrl: "https://blog.example/api/comments?post=1",
  headers: {},
  body: "",
});
assert.equal(netlifyRes.statusCode, 503);

console.log("upvote ok");
