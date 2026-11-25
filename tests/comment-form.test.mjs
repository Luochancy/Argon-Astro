import assert from "node:assert/strict";
import { handleComments } from "../src/lib/comments/handler.mjs";
import { issueCaptcha } from "../src/lib/comments/captcha.mjs";

const host = "https://secret-cms.example";
const env = { WP_URL: host, WP_USER: "editor", WP_APP_PASSWORD: "pw", ARGON_CAPTCHA_SECRET: "secret" };
const challenge = await handleComments(new Request("https://blog.example/api/comments?captcha=1"), env, async () => {
  throw new Error("captcha must not call the CMS");
});
const body = await challenge.json();
assert.equal(challenge.status, 200);
assert.equal(JSON.stringify(body).includes(host), false);
assert.match(body.question, /\d+ \+ \d+/);

const issued = issueCaptcha("secret", Date.now());
const answer = Number(issued.question.split("+")[0]) + Number(issued.question.split("+")[1]);
let forwarded = "";
const posted = await handleComments(new Request("https://blog.example/api/comments", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    postId: 3,
    author: "甲",
    email: "a@example.com",
    content: "hi",
    mailNotice: true,
    captchaToken: issued.token,
    captchaAnswer: answer,
  }),
}), { ...env, ARGON_CAPTCHA: "true" }, async (_url, init) => {
  forwarded = init.body;
  return new Response(JSON.stringify({ id: 9 }));
});
assert.equal(posted.status, 201);
assert.match(forwarded, /"mailNotice":true/);
assert.equal(forwarded.includes(host), false);
console.log("comment form ok");
