/** Bind true viewport-fit, center-translated Zoomify interactions with animated shadow backdrop. */
export function bindZoomify(
  enabled: boolean,
  scale: number,
  duration = 200,
  easing = "ease",
  signal?: AbortSignal,
): void {
  if (!enabled) return;

  const parsedScale = Number(scale);
  const targetRatio = Number.isFinite(parsedScale) && parsedScale > 0 && parsedScale <= 1 ? parsedScale : 0.9;
  const ms = Number(duration);
  const time = Number.isFinite(ms) && ms >= 0 && ms <= 2000 ? ms : 200;
  const curve = /^[a-z0-9(),.\- ]+$/i.test(String(easing || "")) ? easing : "ease";

  let activeImage: HTMLImageElement | null = null;
  let shadow: HTMLElement | null = null;
  let closeTimer: number | null = null;

  const cleanupImmediate = () => {
    if (closeTimer !== null) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (activeImage) {
      activeImage.classList.remove("zoomed");
      activeImage.style.transform = "";
      activeImage.style.transition = "";
      activeImage = null;
    }
    shadow?.remove();
    shadow = null;
    document.body.classList.remove("noscroll");
  };

  const zoomOut = () => {
    if (!activeImage) return;
    const img = activeImage;
    const backdrop = shadow;
    activeImage = null;
    shadow = null;

    img.style.transition = `transform ${time}ms ${curve}`;
    img.style.transform = "";
    backdrop?.classList.remove("zoomed");

    if (closeTimer !== null) window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      img.classList.remove("zoomed");
      img.style.transition = "";
      backdrop?.remove();
      document.body.classList.remove("noscroll");
      closeTimer = null;
    }, time);
  };

  const zoomIn = (image: HTMLImageElement) => {
    if (activeImage && activeImage !== image) {
      cleanupImmediate();
    }
    const rect = image.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fitScale = Math.min((vw * targetRatio) / rect.width, (vh * targetRatio) / rect.height);
    const dx = vw / 2 - (rect.left + rect.width / 2);
    const dy = vh / 2 - (rect.top + rect.height / 2);

    const backdrop = document.createElement("div");
    backdrop.className = "zoomify-shadow";
    backdrop.style.transition = `opacity ${time}ms ${curve}`;
    backdrop.addEventListener("click", zoomOut, { signal });
    document.body.appendChild(backdrop);

    activeImage = image;
    shadow = backdrop;
    image.classList.add("zoomed");
    image.style.transition = `transform ${time}ms ${curve}`;
    document.body.classList.add("noscroll");

    // Upgrade to full-resolution master WebP only when zoomed in.
    const fullSrc = (image.dataset.fullSrc || "").trim();
    if (fullSrc && image.dataset.fullLoaded !== "true" && (image.currentSrc || image.src) !== fullSrc) {
      const hiRes = new Image();
      hiRes.decoding = "async";
      hiRes.onload = () => {
        image.removeAttribute("srcset");
        image.src = fullSrc;
        image.dataset.fullLoaded = "true";
      };
      hiRes.src = fullSrc;
    }

    window.requestAnimationFrame(() => {
      backdrop.classList.add("zoomed");
      image.style.transform = `translate(${dx}px, ${dy}px) scale(${fitScale})`;
    });
  };

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && activeImage) zoomOut();
    },
    { signal },
  );

  signal?.addEventListener("abort", cleanupImmediate, { once: true });

  document.querySelectorAll<HTMLImageElement>("article img").forEach((image) => {
    if (image.dataset.bound === "true") return;
    image.dataset.bound = "true";
    image.classList.add("zoomify");
    image.addEventListener(
      "click",
      () => {
        if (activeImage === image) zoomOut();
        else zoomIn(image);
      },
      { signal },
    );
  });
}
