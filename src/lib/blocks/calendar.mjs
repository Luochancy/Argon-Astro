const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function renderCalendar(posts, focus) {
  const dates = (posts || []).map((post) => new Date(post.date)).filter((date) => !Number.isNaN(date.getTime()));
  const monthDate = focus ? new Date(focus) : dates.sort((left, right) => right - left)[0] || new Date("2026-11-01T00:00:00Z");
  const year = monthDate.getUTCFullYear();
  const month = monthDate.getUTCMonth();
  const marked = new Set(
    dates
      .filter((date) => date.getUTCFullYear() === year && date.getUTCMonth() === month)
      .map((date) => date.getUTCDate())
  );
  const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push("<td></td>");
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(
      marked.has(day)
        ? "<td><a href=\"/archives/#year-" + year + "\">" + day + "</a></td>"
        : "<td>" + day + "</td>"
    );
  }
  while (cells.length % 7 !== 0) {
    cells.push("<td></td>");
  }

  let rows = "";
  for (let i = 0; i < cells.length; i += 7) {
    rows += "<tr>" + cells.slice(i, i + 7).join("") + "</tr>";
  }

  const head = "<thead><tr>" + WEEKDAYS.map((day) => "<th scope=\"col\">" + day + "</th>").join("") + "</tr></thead>";
  const caption = year + "-" + String(month + 1).padStart(2, "0");
  return "<table class=\"wp-block-calendar\"><caption>" + caption + "</caption>" + head + "<tbody>" + rows + "</tbody></table>";
}
