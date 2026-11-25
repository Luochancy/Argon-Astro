const BLOCKED_CMS_PATH = /\/(?:wp-[a-z]+|admin-ajax)/i;

export function gravatarUrl(cdn, hash) {
  const base = String(cdn || "https://www.gravatar.com/avatar").replace(/\/$/, "");
  if (!base.startsWith("https://")) return "";
  try {
    const parsed = new URL(base);
    if (BLOCKED_CMS_PATH.test(parsed.pathname)) return "";
  } catch {
    return "";
  }
  if (!/^[a-f0-9]{32}$/.test(String(hash || ""))) return "";
  return base + "/" + hash + "?s=80&d=mp";
}
