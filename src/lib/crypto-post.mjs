// Build-time PBKDF2-SHA256 + AES-256-GCM encryption for password-protected static posts.
// Ciphertext is safe to ship in static HTML and decrypted in the browser via Web Crypto API.
import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";

const ITERATIONS = 100_000;
const KEY_LEN = 32;

export function encryptPostHtml(html, password) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(String(password), salt, ITERATIONS, KEY_LEN, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(html), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Web Crypto AES-GCM expects ciphertext || 16-byte auth tag concatenated.
  const combined = Buffer.concat([encrypted, tag]);
  return {
    v: 1,
    iter: ITERATIONS,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    ct: combined.toString("base64"),
  };
}

export function decryptPostHtml(payload, password) {
  const salt = Buffer.from(payload.salt, "base64");
  const iv = Buffer.from(payload.iv, "base64");
  const combined = Buffer.from(payload.ct, "base64");
  const tag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);
  const key = pbkdf2Sync(String(password), salt, Number(payload.iter) || ITERATIONS, KEY_LEN, "sha256");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Render Argon's native .post-password-form markup for both local AES-GCM and headless WP locked posts. */
export function renderPasswordForm({ id, hint = "", payload = null, mode = "local" }) {
  const safeId = escapeHtml(id || "post");
  const hintHtml = hint ? `<div class="post-password-hint">${escapeHtml(hint)}</div>` : "";
  const payloadScript = payload
    ? `<script type="application/json" class="argon-encrypted-payload">${JSON.stringify(payload)}</script>`
    : "";
  return (
    '<div class="text-center container argon-password-gate" data-post-id="' + safeId + '" data-mode="' + escapeHtml(mode) + '">' +
      '<form class="post-password-form" method="post" autocomplete="off">' +
        '<div class="post-password-form-text">这是一篇受密码保护的文章，您需要提供访问密码</div>' +
        '<div class="row">' +
          '<div class="form-group col-lg-6 col-md-8 col-sm-10 col-xs-12 post-password-form-input">' +
            '<div class="input-group input-group-alternative">' +
              '<div class="input-group-prepend">' +
                '<span class="input-group-text"><i class="fa fa-key" aria-hidden="true"></i></span>' +
              '</div>' +
              '<input name="post_password" class="form-control" placeholder="密码" type="password" required />' +
            '</div>' +
            hintHtml +
            '<div class="post-password-error text-danger mt-2" role="alert" hidden></div>' +
          '</div>' +
        '</div>' +
        '<button class="btn btn-primary" type="submit">确认</button>' +
      '</form>' +
      payloadScript +
    '</div>'
  );
}
