import { readingPercent } from "../lib/motion/reading.mjs";

export function bindReadingProgress(enabled: boolean, signal?: AbortSignal): void {
  const bar = document.getElementById("reading-progress");
  if (!enabled || !bar) return;

  const update = () => {
    const percent = readingPercent(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
    bar.style.width = percent + "%";
    bar.setAttribute("aria-valuenow", String(percent));
  };

  update();
  window.addEventListener("scroll", update, { passive: true, signal });
}
