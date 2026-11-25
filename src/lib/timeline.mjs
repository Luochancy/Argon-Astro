const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatMonthLabel(month, language) {
  if (String(language || "").toLowerCase().startsWith("zh")) {
    return `${month} 月`;
  }
  return EN_MONTHS[month - 1] || String(month);
}

/** Render upstream-compatible Argon archive timeline with optional Chinese/English month headers. */
export function renderTimeline(posts, showMonth = true, archivesUrl = "/archives/", language = "en") {
  const sorted = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  let html = "<div class=\"argon-timeline archive-timeline\">";
  let lastYear = 0;
  let lastMonth = 0;
  const cleanBase = String(archivesUrl || "/archives/").includes("wp-json")
    ? "/archives/"
    : String(archivesUrl || "/archives/").replace(/\/$/, "") + "/";

  for (const post of sorted) {
    const date = new Date(post.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (year !== lastYear) {
      const yearHref = cleanBase + "#year-" + year;
      html += "<div class=\"argon-timeline-node\"><h2 class=\"argon-timeline-time archive-timeline-year\" id=\"year-" + year + "\"><a href=\"" + yearHref + "\">" + year + "</a></h2><div class=\"argon-timeline-card card bg-gradient-secondary archive-timeline-title\"></div></div>";
      lastYear = year;
      lastMonth = 0;
    }
    if (showMonth && month !== lastMonth) {
      const label = formatMonthLabel(month, language);
      const monthId = "month-" + year + "-" + String(month).padStart(2, "0");
      html += "<div class=\"argon-timeline-node\"><h3 class=\"argon-timeline-time archive-timeline-month" + (lastMonth === 0 ? " first-month-of-year" : "") + "\" id=\"" + monthId + "\"><a href=\"#" + monthId + "\">" + label + "</a></h3><div class=\"argon-timeline-card card bg-gradient-secondary archive-timeline-title\"></div></div>";
      lastMonth = month;
    }
    const day = String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    html += "<div class=\"argon-timeline-node\"><div class=\"argon-timeline-time\">" + day + "</div><div class=\"argon-timeline-card card bg-gradient-secondary archive-timeline-title\"><a href=\"" + post.href + "\">" + escapeHtml(post.title) + "</a></div></div>";
  }
  return html + "</div>";
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
