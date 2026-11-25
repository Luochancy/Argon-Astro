export function pageBackgroundCss(background) {
  if (!background || !background.url) return "";
  const opacity = Number(background.opacity);
  const safeOpacity = Number.isFinite(opacity) ? Math.min(1, Math.max(0, opacity)) : 1;
  let css = "#content:before{content:\"\";display:block;position:fixed;inset:0;z-index:-2;background:url(" + background.url + ") center/cover no-repeat;opacity:" + safeOpacity + "}";
  if (background.darkUrl) {
    css += "html.darkmode #content:before{background-image:url(" + background.darkUrl + ")}";
  } else {
    css += "html.darkmode #content:before{filter:brightness(.65)}";
  }
  if (background.bannerStyle === "transparent") {
    css += "section.banner{background-color:transparent !important;background-image:none !important}#banner .shape{background:transparent !important}";
  }
  return css;
}

export function isOutdated(date, days, now = Date.now()) {
  const limit = Number(days);
  if (!Number.isFinite(limit) || limit <= 0) return false;
  const published = date instanceof Date ? date.getTime() : new Date(date).getTime();
  if (Number.isNaN(published)) return false;
  return now - published > limit * 86400000;
}
