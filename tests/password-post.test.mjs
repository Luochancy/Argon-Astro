import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decryptPostHtml, encryptPostHtml, renderPasswordForm } from "../src/lib/crypto-post.mjs";

const secret = "SECRET_BODY_MUST_NOT_SHIP";
const html = `<p>${secret}</p>`;
const payload = encryptPostHtml(html, "secret-phrase");

// Ciphertext and rendered form must never contain plaintext or password.
const formHtml = renderPasswordForm({ id: "locked", hint: "Try secret", payload, mode: "local" });
assert.equal(formHtml.includes(secret), false);
assert.equal(formHtml.includes("secret-phrase"), false);
assert.match(formHtml, /class="post-password-form"/);
assert.match(formHtml, /name="post_password"/);
assert.match(formHtml, /class="argon-encrypted-payload"/);

// Wrong password must fail authentication tag verification.
assert.throws(() => decryptPostHtml(payload, "wrong-password"));

// Correct password decrypts back to exact HTML.
assert.equal(decryptPostHtml(payload, "secret-phrase"), html);

// Built locked post must not leak plaintext while containing password input UI.
const builtLocked = readFileSync(new URL("../dist/posts/locked/index.html", import.meta.url), "utf8");
assert.equal(builtLocked.includes(secret), false);
assert.match(builtLocked, /post-password-form/);
assert.match(builtLocked, /name="post_password"/);
console.log("password post ok");
