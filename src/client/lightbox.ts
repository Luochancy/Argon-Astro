/** Resolve caption text from image alt or enclosing figcaption. */
function captionFor(image: HTMLImageElement): string {
  if (image.alt) return image.alt;
  const caption = image.closest("figure")?.querySelector("figcaption")?.textContent;
  return caption ? caption.trim() : "";
}

/** Bind animated article & shuoshuo image lightbox that upgrades to full-resolution WebP only on zoom. */
export function bindLightbox(signal?: AbortSignal): void {
  const images = [
    ...document.querySelectorAll<HTMLImageElement>(
      "#post_content img, .wp-block-image img, .wp-block-gallery img, .shuoshuo-images img",
    ),
  ];
  if (images.length === 0) return;

  let dialog = document.getElementById("argon-lightbox");
  if (!dialog) {
    dialog = document.createElement("div");
    dialog.id = "argon-lightbox";
    dialog.className = "argon-lightbox";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-hidden", "true");
    dialog.innerHTML =
      '<button type="button" class="argon-lightbox-close" aria-label="Close">×</button>' +
      '<button type="button" class="argon-lightbox-prev" aria-label="Previous">‹</button>' +
      '<div class="argon-lightbox-stage"><img alt=""><div class="argon-lightbox-caption"></div></div>' +
      '<button type="button" class="argon-lightbox-next" aria-label="Next">›</button>';
    document.body.appendChild(dialog);
  }

  const targetImg = dialog.querySelector<HTMLImageElement>("img");
  const captionEl = dialog.querySelector<HTMLElement>(".argon-lightbox-caption");
  const prevBtn = dialog.querySelector<HTMLButtonElement>(".argon-lightbox-prev");
  const nextBtn = dialog.querySelector<HTMLButtonElement>(".argon-lightbox-next");

  let activeIndex = 0;
  let loadToken = 0;

  const isOpen = () => dialog!.classList.contains("is-open");

  const show = (index: number) => {
    activeIndex = (index + images.length) % images.length;
    const current = images[activeIndex];
    const token = ++loadToken;
    if (targetImg) {
      const previewSrc = current.currentSrc || current.src;
      const fullSrc = (current.dataset.fullSrc || "").trim();
      targetImg.src = previewSrc;
      targetImg.alt = current.alt;
      // Upgrade seamlessly to full-resolution master WebP only when the image is opened/zoomed.
      if (fullSrc && fullSrc !== previewSrc) {
        const hiRes = new Image();
        hiRes.decoding = "async";
        hiRes.onload = () => {
          if (loadToken === token && isOpen() && targetImg) {
            targetImg.src = fullSrc;
          }
        };
        hiRes.src = fullSrc;
      }
    }
    if (captionEl) {
      const text = captionFor(current);
      captionEl.textContent = text;
      captionEl.hidden = !text;
    }
    const multi = images.length > 1;
    if (prevBtn) prevBtn.hidden = !multi;
    if (nextBtn) nextBtn.hidden = !multi;

    dialog!.hidden = false;
    dialog!.setAttribute("aria-hidden", "false");
    // Suppress Argon's darkmode global scrim and lock background scrolling while open.
    document.body.classList.add("fancybox-active", "noscroll");
    window.requestAnimationFrame(() => dialog!.classList.add("is-open"));
  };

  const close = () => {
    dialog!.classList.remove("is-open");
    dialog!.setAttribute("aria-hidden", "true");
    document.body.classList.remove("fancybox-active", "noscroll");
  };

  dialog.addEventListener(
    "click",
    (event) => {
      const el = event.target as HTMLElement;
      if (event.target === dialog || el.classList.contains("argon-lightbox-close")) {
        close();
      } else if (el.classList.contains("argon-lightbox-prev")) {
        show(activeIndex - 1);
      } else if (el.classList.contains("argon-lightbox-next")) {
        show(activeIndex + 1);
      }
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isOpen()) return;
      if (event.key === "Escape") close();
      else if (event.key === "ArrowLeft" && images.length > 1) show(activeIndex - 1);
      else if (event.key === "ArrowRight" && images.length > 1) show(activeIndex + 1);
    },
    { signal },
  );

  signal?.addEventListener("abort", () => close(), { once: true });

  images.forEach((image, index) => {
    if (image.dataset.bound === "true") return;
    image.dataset.bound = "true";
    // Add zoom-in cursor class directly on the image without altering enclosing <p> elements.
    image.classList.add("zoomify");
    image.addEventListener("click", () => show(index), { signal });
  });
}
