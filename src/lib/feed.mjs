function xml(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderFeed(feed) {
  const items = (feed.items || []).filter((item) => !String(item.link || "").includes("wp-json")).map((item) => {
    return "<item><title>" + xml(item.title) + "</title><link>" + xml(item.link) + "</link><pubDate>" + xml(item.date) + "</pubDate><description>" + xml(item.description) + "</description></item>";
  }).join("");
  return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><title>" + xml(feed.title) + "</title><link>/</link>" + items + "</channel></rss>";
}
