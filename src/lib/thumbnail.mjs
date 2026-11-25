export function firstImage(html) {
  const match = String(html || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match) return "";
  const src = match[1];
  if (src.includes("wp-json") || src.includes("admin-ajax.php")) return "";
  return src;
}
