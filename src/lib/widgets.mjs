// Render sidebar widgets matching upstream Argon #leftbar_tab_tools widget markup.
function esc(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function safeHref(url) {
  const value = String(url ?? "").trim();
  return /^(https?:|\/|#)/.test(value) ? esc(value) : "#";
}

export function renderWidgets(widgets) {
  if (!Array.isArray(widgets) || !widgets.length) return "";
  return widgets.map((widget) => {
    const title = widget.title ? '<h6 class="font-weight-bold text-black">' + esc(widget.title) + "</h6>" : "";
    if (widget.type === "links" && Array.isArray(widget.items)) {
      const items = widget.items.map((item) => '<li><a href="' + safeHref(item.href) + '">' + esc(item.label) + "</a></li>").join("");
      return '<div class="widget card bg-white border-0 leftbar-widget">' + title + "<ul>" + items + "</ul></div>";
    }
    const clean = String(widget.html || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/wp-json|admin-ajax\.php/gi, "");
    return '<div class="widget card bg-white border-0 leftbar-widget">' + title + '<div class="widget-html">' + clean + "</div></div>";
  }).join("");
}
