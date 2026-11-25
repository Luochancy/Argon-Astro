// Build article metadata rows matching upstream Argon icon names and CSS classes.
export function articleMeta(fields, post, options = {}) {
  const active = Array.isArray(fields) && fields.length ? fields : ["time", "categories"];
  const items = [];
  for (const raw of active) {
    const field = String(raw || "").trim();
    if (field === "time" && post.date) {
      items.push({
        key: "time",
        className: "post-meta-detail-time",
        icon: "fa-clock-o",
        text: post.date,
      });
    } else if (field === "categories" && post.categories && post.categories.length) {
      items.push({
        key: "categories",
        className: "post-meta-detail-categories",
        icon: "fa-bookmark-o",
        text: post.categories[0],
        href: "/categories/" + encodeURIComponent(post.categories[0]) + "/",
        links: post.categories.map((cat) => ({
          label: cat,
          href: "/categories/" + encodeURIComponent(cat) + "/",
        })),
      });
    } else if (field === "comments") {
      items.push({
        key: "comments",
        className: "post-meta-detail-comments",
        icon: "fa-comments-o",
        text: String(post.commentCount ?? 0),
      });
    } else if (field === "author" && options.author) {
      items.push({
        key: "author",
        className: "post-meta-detail-author",
        icon: "fa-user-circle-o",
        text: options.author,
      });
    }
  }
  return items;
}
