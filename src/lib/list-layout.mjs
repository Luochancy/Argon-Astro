// Helper functions for article list layout classes and dark-mode policy.
export function shouldUseDark(mode, prefersDark, hour) {
  if (mode === "always" || mode === "alwayson" || mode === "dark") return true;
  if (mode === "off" || mode === "light" || mode === "false") return false;
  if (mode === "time") return hour < 7 || hour >= 22;
  return Boolean(prefersDark);
}

export function listLayoutClass(layout) {
  if (layout === "2") return "article-list-2";
  if (layout === "3") return "article-list-3";
  return "article-list-1";
}
