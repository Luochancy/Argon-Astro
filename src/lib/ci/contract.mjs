import { createHmac, timingSafeEqual } from "node:crypto";

export const REPLAY_WINDOW_SECONDS = 300;
export const COALESCE_SECONDS = 15;
export const RATE_LIMIT_SECONDS = 60;

export function signDeploy(secret, timestamp, nonce, body) {
  return createHmac("sha256", secret).update(timestamp + "." + nonce + "." + body).digest("hex");
}

export function timestampFresh(timestamp, now, window = REPLAY_WINDOW_SECONDS) {
  if (!/^[0-9]{10,}$/.test(String(timestamp))) return false;
  return Math.abs(Number(now) - Number(timestamp)) <= window;
}

export function retryDelay(now, last, interval = RATE_LIMIT_SECONDS) {
  const elapsed = Number(now) - Number(last);
  return elapsed < interval ? interval - elapsed : 0;
}

export function signatureMatches(secret, timestamp, nonce, body, given) {
  const expected = signDeploy(secret, timestamp, nonce, body);
  const left = Buffer.from(expected);
  const right = Buffer.from(String(given || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}
