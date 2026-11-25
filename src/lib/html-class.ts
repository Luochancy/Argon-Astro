import type { ThemeConfig } from "../config/types";
import { bannerSizeClass } from "./banner-size.mjs";

export function htmlClass(config: ThemeConfig, extra: string[] = []): string {
  const names = ["no-js", ...extra];
  const layout = config.appearance.layout;
  if (layout === "single") names.push("single-column");
  if (layout === "triple") names.push("triple-column");
  if (layout === "double-reverse") names.push("double-column-reverse");
  if (!layout || layout === "double") names.push("double-column");
  if (config.appearance.immersionColor) names.push("immersion-color");
  if (config.appearance.amoledDark) names.push("amoled-dark");
  if (config.appearance.cardShadow === "big") names.push("use-big-shadow");
  if (config.appearance.font === "serif") names.push("use-serif");
  if (config.motion.disableCodeblockStyle) names.push("disable-codeblock-style");
  if (config.toolbar.headroom === "absolute") names.push("navbar-absolute");
  const bannerClass = bannerSizeClass(config.banner.size);
  if (bannerClass) names.push(bannerClass);
  if (config.toolbar.blur) names.push("toolbar-blur");
  if (config.banner.toolbarMask) names.push("toolbar-mask");
  if (config.appearance.cardShadow !== "big") names.push("use-small-shadow");
  names.push(config.appearance.articleHeaderStyle);
  return names.join(" ");
}
