function xml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderSitemap(urls, siteUrl = "") {
  const base = /^https?:\/\//i.test(String(siteUrl || "").trim())
    ? String(siteUrl).trim().replace(/\/+$/, "")
    : "";
  const body = (urls || [])
    .map((url) => String(url || ""))
    .filter((url) => url.startsWith("/") && !url.includes("wp-json") && !url.includes("admin-ajax.php"))
    .map((url) => "<url><loc>" + xml(base ? base + url : url) + "</loc></url>")
    .join("");
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">" + body + "</urlset>";
}
