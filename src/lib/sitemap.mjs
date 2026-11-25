function xml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderSitemap(urls) {
  const body = (urls || [])
    .map((url) => String(url || ""))
    .filter((url) => url.startsWith("/") && !url.includes("wp-json") && !url.includes("admin-ajax.php"))
    .map((url) => "<url><loc>" + xml(url) + "</loc></url>")
    .join("");
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" + body + "</urlset>";
}
