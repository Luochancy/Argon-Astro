import { zoomifyTransform } from "./zoomify.mjs";

export function zoomifyStyle(scale, zoomed, duration, easing) {
  const ms = Number(duration);
  const time = Number.isFinite(ms) && ms >= 0 && ms <= 2000 ? ms : 200;
  const curve = /^[a-z0-9(),.\- ]+$/i.test(String(easing || "")) ? easing : "ease";
  return "transform:" + zoomifyTransform(scale, zoomed) + ";transition:transform " + time + "ms " + curve;
}

export function lazyloadEffectClass(effect) {
  if (effect === "fadeIn") return "lazyload lazyload-fade";
  return "lazyload";
}

export function referenceHeading(title) {
  const text = String(title || "参考").replace(/[<>]/g, "");
  return "<h2 class=\"reference-list-title\">" + text + "</h2>";
}
