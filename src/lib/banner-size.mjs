export function bannerSizeClass(size) {
  if (size === "mini") return "banner-mini";
  if (size === "hide") return "no-banner";
  if (size === "fullscreen") return "banner-as-cover";
  return "";
}
