import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleComments } from "../src/lib/comments/handler.mjs";
import { gravatarUrl } from "../src/lib/comments/gravatar-url.mjs";
import { handleDeployHook } from "../src/lib/ci/receiver.mjs";
import { signDeploy } from "../src/lib/ci/contract.mjs";

const secretHost = "https://secret-cms.example";

const missing = await handleComments(new Request("https://blog.example/api/comments?post=1"), {});
assert.equal(missing.status, 503);
assert.equal((await missing.text()).includes(secretHost), false);

const cross = await handleComments(new Request("https://blog.example/api/comments", {
  method: "POST",
  headers: { origin: "https://evil.example", "content-type": "application/json" },
  body: "{}",
}), { WP_URL: secretHost, WP_USER: "u", WP_APP_PASSWORD: "p" });
assert.equal(cross.status, 403);

let seen = "";
const ok = await handleComments(new Request("https://blog.example/api/comments?post=7"), {
  WP_URL: secretHost,
  WP_USER: "editor",
  WP_APP_PASSWORD: "app-pass",
}, async (url) => {
  seen = url;
  return new Response(JSON.stringify([{
    id: 1,
    parent: 0,
    author: "A",
    date: "2026-11-11",
    content: "hi",
    url: "",
    parentAuthor: "Root",
    pinned: true,
    private: false,
    markdown: true,
    upvotes: 5,
  }, {
    id: 2,
    parent: 1,
    author: "B",
    date: "2026-11-11",
    content: "secret",
    url: "",
    parentAuthor: "A",
    pinned: false,
    private: true,
    markdown: false,
    upvotes: 0,
  }]));
});
assert.equal(ok.status, 200);
assert.equal(seen, secretHost + "/wp-json/argon-astro/v1/comments?post=7");
const list = await ok.json();
assert.equal(list[0].pinned, true);
assert.equal(list[0].markdown, true);
assert.equal(list[0].upvotes, 5);
assert.equal(list[0].parentAuthor, "Root");
assert.equal(list[1].private, true);
assert.equal(list[1].content, "", "private comment content must be masked");

// POST with QQ number + markdown + private
let postBody = null;
const created = await handleComments(new Request("https://blog.example/api/comments", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    postId: 7,
    author: "QQUser",
    email: "123456789",
    content: "**hello**",
    markdown: true,
    private: true,
  }),
}), { WP_URL: secretHost, WP_USER: "editor", WP_APP_PASSWORD: "app-pass" }, async (_url, init) => {
  postBody = JSON.parse(init.body);
  return new Response(JSON.stringify({ id: 99 }));
});
assert.equal(created.status, 201);
assert.equal(postBody.markdown, true);
assert.equal(postBody.private, true);
assert.equal(postBody.email, "123456789");

// POST action=pin
let pinUrl = "";
const pinned = await handleComments(new Request("https://blog.example/api/comments", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "pin", id: 99, pinned: true }),
}), { WP_URL: secretHost, WP_USER: "editor", WP_APP_PASSWORD: "app-pass" }, async (url, init) => {
  pinUrl = url + " " + init.body;
  return new Response(JSON.stringify({ id: 99, pinned: true }));
});
assert.equal(pinned.status, 200);
assert.equal(pinUrl, secretHost + '/wp-json/argon-astro/v1/comments/pin {"id":99,"pinned":true}');

// gravatar-url.mjs must not contain literal CMS paths and still reject them
const gravatarSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../src/lib/comments/gravatar-url.mjs"),
  "utf8",
);
assert.equal(gravatarSource.includes("wp-json"), false);
assert.equal(gravatarSource.includes("wp-admin"), false);
assert.equal(gravatarSource.includes("admin-ajax.php"), false);
const hash = "0".repeat(32);
assert.equal(gravatarUrl("https://www.gravatar.com/avatar", hash), "https://www.gravatar.com/avatar/" + hash + "?s=80&d=mp");
assert.equal(gravatarUrl("https://evil.example/wp-json/avatar", hash), "");
assert.equal(gravatarUrl("https://evil.example/wp-admin/admin-ajax.php", hash), "");

// receiver.mjs downstream dispatch via DEPLOY_HOOK_URL and GITHUB_REPO + GITHUB_TOKEN
const now = 1700000100;
const ts = "1700000050";
const secret = "deploy-secret";
const payload = JSON.stringify({ reason: "post-save:post" });
const sig1 = signDeploy(secret, ts, "nonce-1", payload);
let dispatchedUrl = "";
const deployRes = await handleDeployHook(
  new Request("https://blog.example/api/deploy", {
    method: "POST",
    headers: {
      "x-argon-timestamp": ts,
      "x-argon-nonce": "nonce-1",
      "x-argon-signature": sig1,
    },
    body: payload,
  }),
  { ARGON_DEPLOY_SECRET: secret, DEPLOY_HOOK_URL: "https://hooks.example/build" },
  new Set(),
  now,
  async (url) => {
    dispatchedUrl = url;
    return new Response("ok", { status: 200 });
  },
);
assert.equal(deployRes.status, 202);
assert.equal(dispatchedUrl, "https://hooks.example/build");

const sig2 = signDeploy(secret, ts, "nonce-2", payload);
let ghCall = null;
const ghRes = await handleDeployHook(
  new Request("https://blog.example/api/deploy", {
    method: "POST",
    headers: {
      "x-argon-timestamp": ts,
      "x-argon-nonce": "nonce-2",
      "x-argon-signature": sig2,
    },
    body: payload,
  }),
  { ARGON_DEPLOY_SECRET: secret, GITHUB_REPO: "owner/repo", GITHUB_TOKEN: "tok" },
  new Set(),
  now,
  async (url, init) => {
    ghCall = { url, body: JSON.parse(init.body) };
    return new Response(null, { status: 204 });
  },
);
assert.equal(ghRes.status, 202);
assert.equal(ghCall.url, "https://api.github.com/repos/owner/repo/dispatches");
assert.equal(ghCall.body.event_type, "argon-config");
assert.equal(ghCall.body.client_payload.reason, "post-save:post");

console.log("comments ok");
