export function bannerThumbnailCss(enabled, image) {
  if (!enabled || !image) return "";
  const src = String(image);
  if (src.includes("wp-json") || src.includes("admin-ajax.php")) return "";
  return "section.banner{background-image:url(" + src + ") !important}";
}
