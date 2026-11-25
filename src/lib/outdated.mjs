export function outdatedNotice(tip, tipType, timeType, date, deltaDays) {
  let text = String(tip || "").replace(/[<>]/g, "");
  if (typeof deltaDays === "number" && Number.isFinite(deltaDays)) {
    text = text.replace(/%date_delta%/g, String(Math.max(0, Math.floor(deltaDays))));
  }
  const kind = tipType === "info" || tipType === "toast" ? "alert-info" : "alert-warning";
  const when = timeType === "relative" || tip.includes("%date_delta%") ? "" : (date ? " " + String(date) : "");
  return '<div class="post-outdated-info alert ' + kind + ' outdated-post"><i class="fa fa-info-circle" aria-hidden="true"></i> ' + text + when + "</div>";
}

export function archiveYearHref(base, year) {
  const root = String(base || "/archives/").replace(/\/$/, "");
  if (root.includes("wp-json") || root.includes("admin-ajax.php")) return "/archives/#year-" + year;
  return root + "/#year-" + year;
}

export function mathScriptUrl(url) {
  const value = String(url || "").trim();
  if (!value.startsWith("https://")) return "";
  if (value.includes("wp-json") || value.includes("admin-ajax.php")) return "";
  return value;
}
