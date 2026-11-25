import { columnCount, placeItems } from "../lib/layout/waterflow.mjs";

function resetItems(items: HTMLElement[], main: HTMLElement): void {
  items.forEach((item) => {
    item.style.transition = "";
    item.style.position = "";
    item.style.top = "";
    item.style.left = "";
    item.style.width = "";
    item.style.margin = "";
  });
  main.querySelector<HTMLElement>(".waterflow-placeholder")?.remove();
}

/** Masonry/waterflow layout matching Argon's 2, 3, and 2and3 / 2,3 responsive column modes. */
export function bindWaterflow(mode: string, signal?: AbortSignal): void {
  const normalizedMode = String(mode || "").trim();
  if (!normalizedMode || normalizedMode === "1") return;

  let restoreFrame = 0;

  const layout = () => {
    const main = document.querySelector<HTMLElement>("#main.article-list");
    const primary = document.getElementById("primary");
    if (!main || !primary) return;

    const items = [...main.querySelectorAll<HTMLElement>("article.post:not(.no-results), .shuoshuo-preview-container")];
    const columns = columnCount(normalizedMode, main.clientWidth, items.length);

    if (columns === 1) {
      main.classList.remove("waterflow");
      primary.classList.remove("waterflow");
      primary.style.transition = "";
      resetItems(items, main);
      return;
    }

    // Disable transitions during column-width measurement and repositioning to prevent visual jitter.
    if (restoreFrame) window.cancelAnimationFrame(restoreFrame);
    primary.style.transition = "none";
    main.classList.add("waterflow");
    primary.classList.add("waterflow");

    const columnWidth = `calc(${100 / columns}% - ${(10 * (columns - 1)) / columns}px)`;
    items.forEach((item) => {
      item.style.transition = "none";
      item.style.position = "absolute";
      item.style.width = columnWidth;
      item.style.margin = "0";
    });

    // Measure card heights after applying multi-column widths so cards never overlap.
    const heights = items.map((item) => item.offsetHeight + 10);
    const placed = placeItems(heights, columns);

    items.forEach((item, index) => {
      const place = placed[index];
      item.style.top = `${place.top}px`;
      item.style.left = `calc(${place.index} * ${place.width} + ${10 * place.index}px)`;
    });

    let placeholder = main.querySelector<HTMLElement>(".waterflow-placeholder");
    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.className = "waterflow-placeholder";
      main.prepend(placeholder);
    }

    const maxHeight = placed.reduce(
      (highest: number, place: { top: number }, index: number) => Math.max(highest, place.top + heights[index]),
      0,
    );
    placeholder.style.height = `${maxHeight}px`;

    // Restore CSS transitions on the next animation frame so hover & navigation animations remain smooth.
    restoreFrame = window.requestAnimationFrame(() => {
      primary.style.transition = "";
      items.forEach((item) => {
        item.style.transition = "";
      });
      restoreFrame = 0;
    });
  };

  layout();
  window.addEventListener("resize", layout, { passive: true, signal });

  const main = document.querySelector<HTMLElement>("#main.article-list");
  main?.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    if (!img.complete) {
      img.addEventListener("load", layout, { once: true, signal });
    }
  });

  signal?.addEventListener(
    "abort",
    () => {
      if (restoreFrame) window.cancelAnimationFrame(restoreFrame);
    },
    { once: true },
  );
}
