import { lazyloadMargin } from "../lib/lazy-margin.mjs";
import { lazyloadEffectClass } from "../lib/motion/effects.mjs";

function loadingStyleClass(style: string): string {
  const clean = String(style || "").trim();
  if (!clean || clean === "none") return "";
  return clean.startsWith("lazyload-style-") ? clean : "lazyload-style-" + clean;
}

export function bindLazyload(
  enabled: boolean,
  threshold = 800,
  effect = "fadeIn",
  loadingStyle = "",
  signal?: AbortSignal,
): void {
  const images = [...document.querySelectorAll<HTMLImageElement>("img.lazyload[data-original]")];
  if (images.length === 0) return;

  const effectClasses = lazyloadEffectClass(effect).split(" ").filter(Boolean);
  const styleClass = loadingStyleClass(loadingStyle);

  const reveal = (image: HTMLImageElement) => {
    const source = image.dataset.original;
    const finish = () => {
      image.classList.remove("lazyload", "lazyload-fade", ...effectClasses);
      if (styleClass) image.classList.remove(styleClass);
    };

    if (source) {
      image.addEventListener("load", finish, { once: true, signal });
      image.addEventListener("error", finish, { once: true, signal });
      image.src = source;
      if (image.complete && image.naturalWidth > 0) finish();
    } else {
      finish();
    }
  };

  // Fallback immediately when lazyload is disabled or IntersectionObserver is unavailable.
  if (!enabled || !("IntersectionObserver" in window)) {
    images.forEach(reveal);
    return;
  }

  images.forEach((image) => {
    effectClasses.forEach((cls) => image.classList.add(cls));
    if (styleClass) image.classList.add(styleClass);
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const image = entry.target as HTMLImageElement;
        observer.unobserve(image);
        reveal(image);
      }
    },
    { rootMargin: lazyloadMargin(threshold) },
  );

  images.forEach((image) => observer.observe(image));
  signal?.addEventListener("abort", () => observer.disconnect(), { once: true });
}
