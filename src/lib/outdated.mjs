function escapeAttr(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Render upstream Argon outdated-post notice (in-post translucent banner or toast marker). */
export function outdatedNotice(tip, tipType, timeType, date, deltaDays, extra = {}) {
  let text = String(tip || "本文最后更新于 %date_delta% 天前，其中的信息可能已经有所发展或是发生改变。").replace(/[<>]/g, "");
  const safeDays = (v) => (typeof v === "number" && Number.isFinite(v) ? String(Math.max(0, Math.floor(v))) : "");
  const dMain = safeDays(deltaDays);
  const dPost = safeDays(extra?.postDeltaDays ?? deltaDays);
  const dMod = safeDays(extra?.modifyDeltaDays ?? deltaDays);
  if (dMain !== "") text = text.replace(/%date_delta%/g, dMain);
  if (dPost !== "") text = text.replace(/%post_date_delta%/g, dPost);
  if (dMod !== "") text = text.replace(/%modify_date_delta%/g, dMod);

  const hasPlaceholder = /%(?:date_delta|post_date_delta|modify_date_delta)%/.test(String(tip || ""));
  const when = timeType === "relative" || timeType === "modifiedtime" || hasPlaceholder ? "" : (date ? " (" + String(date) + ")" : "");
  const fullText = text + when;

  if (tipType === "toast" || tipType === "info") {
    return '<div id="post_outdate_toast" style="display:none;" data-text="' + escapeAttr(fullText) + '"></div>';
  }
  return '<div class="post-outdated-info"><i class="fa fa-info-circle" aria-hidden="true"></i>' + fullText + "</div>";
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
