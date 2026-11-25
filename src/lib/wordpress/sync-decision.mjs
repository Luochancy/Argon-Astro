export function syncDecision(source, env) {
  if (source !== "wordpress") return { action: "skip" };
  if (!env.WP_URL || !env.WP_USER || !env.WP_APP_PASSWORD) return { action: "fail" };
  return { action: "sync" };
}
