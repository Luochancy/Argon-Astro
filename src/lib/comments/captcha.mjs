import { createHmac, timingSafeEqual } from "node:crypto";

function sign(secret, payload) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function issueCaptcha(secret, now = Date.now()) {
  const seed = Math.abs(now % 100000);
  const a = (seed % 7) + 1;
  const b = (Math.floor(seed / 7) % 8) + 1;
  const expires = now + 5 * 60 * 1000;
  const payload = a + "+" + b + ":" + expires;
  return { question: a + " + " + b, token: payload + "." + sign(secret, payload), expires };
}

export function verifyCaptcha(secret, token, answer, now = Date.now()) {
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return false;
  const payload = parts[0];
  const expected = sign(secret, payload);
  const given = Buffer.from(parts[1]);
  const actual = Buffer.from(expected);
  if (given.length !== actual.length || !timingSafeEqual(given, actual)) return false;
  const [expr, expires] = payload.split(":");
  if (Number(expires) < now) return false;
  const [left, right] = expr.split("+").map(Number);
  return Number(answer) === left + right;
}
