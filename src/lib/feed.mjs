function xml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function toRssDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value || "") : d.toUTCString();
}

export function renderFeed(feed) {
  const base = /^https?:\/\//i.test(String(feed.siteUrl || "").trim())
    ? String(feed.siteUrl).trim().replace(/\/+$/, "")
    : "";
  const channelLink = base ? base + "/" : "/";
  const channelDesc = feed.description ? "<description>" + xml(feed.description) + "</description>" : "";
  const items = (feed.items || []).filter((item) => !String(item.link || "").includes("wp-json")).map((item) => {
    const rawLink = String(item.link || "/");
    const absLink = /^https?:\/\//i.test(rawLink) ? rawLink : (base ? base + rawLink : rawLink);
    return "<item><title>" + xml(item.title) + "</title><link>" + xml(absLink) + "</link><guid isPermaLink=\"true\">" + xml(absLink) + "</guid><pubDate>" + xml(toRssDate(item.date)) + "</pubDate><description>" + xml(item.description) + "</description></item>";
  }).join("");
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><title>" + xml(feed.title) + "</title><link>" + xml(channelLink) + "</link>" + channelDesc + items + "</channel></rss>";
}
