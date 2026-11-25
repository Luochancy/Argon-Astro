import { createHash } from "node:crypto";
export { gravatarUrl } from "./gravatar-url.mjs";

export function emailHash(email) {
  return createHash("md5").update(String(email || "").trim().toLowerCase()).digest("hex");
}
