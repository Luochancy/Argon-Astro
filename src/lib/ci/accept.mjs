import { signatureMatches, timestampFresh } from "./contract.mjs";

export const MAX_SEEN_NONCES = 1000;

export function acceptDeploy({ timestamp, nonce, body, signature }, secret, now, seen) {
  if (!timestampFresh(timestamp, now)) return { ok: false, status: 401, error: "时间戳超出窗口。" };
  if (!nonce || seen.has(nonce)) return { ok: false, status: 409, error: "重复请求被拒绝。" };
  if (!signatureMatches(secret, timestamp, nonce, body, signature)) {
    return { ok: false, status: 401, error: "签名不正确。" };
  }
  seen.add(nonce);
  while (seen.size > MAX_SEEN_NONCES) {
    const oldest = seen.values().next().value;
    seen.delete(oldest);
  }
  return { ok: true, status: 202 };
}
