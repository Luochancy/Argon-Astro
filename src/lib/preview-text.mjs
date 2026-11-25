export function previewText(text, hideShortcode) {
  const source = String(text || "");
  if (!hideShortcode) return source;
  return source.replace(/\[[^\]]+\]/g, " ").replace(/\s+/g, " ").trim();
}
