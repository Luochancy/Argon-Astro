import { copyTarget } from "../lib/share-copy.mjs";

async function writeClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy textarea copy.
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  return ok;
}

/** Bind Argon share bar reveal, animated WeChat QR popover, and copy-link feedback. */
export function bindShare(signal?: AbortSignal): void {
  const container = document.getElementById("share_container");
  const toggleBtn = document.getElementById("share_show");

  const closeAllQr = () => {
    document.querySelectorAll<HTMLElement>(".argon-wechat-qr.is-open").forEach((popover) => {
      popover.classList.remove("is-open");
    });
  };

  if (container && toggleBtn && toggleBtn.dataset.bound !== "true") {
    toggleBtn.dataset.bound = "true";
    toggleBtn.addEventListener(
      "click",
      () => {
        const opened = container.classList.toggle("opened");
        if (!opened) closeAllQr();
      },
      { signal },
    );
  }

  document.querySelectorAll<HTMLElement>(".icon-wechat").forEach((link) => {
    if (link.dataset.bound === "true") return;
    link.dataset.bound = "true";
    link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        const host = container ?? link.parentElement;
        if (!host) return;

        let popover = host.querySelector<HTMLElement>(".argon-wechat-qr");
        if (!popover) {
          popover = document.createElement("div");
          popover.className = "argon-wechat-qr card shadow-sm";
          const url = copyTarget(location.href);
          popover.innerHTML =
            '<div class="argon-wechat-qr-title">WeChat Share</div>' +
            `<img alt="WeChat QR" src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}" width="160" height="160">` +
            '<div class="argon-wechat-qr-hint">Scan in WeChat</div>';
          host.appendChild(popover);
          // Force initial hidden frame so first open smoothly animates opacity and transform.
          void popover.offsetWidth;
          window.requestAnimationFrame(() => popover?.classList.add("is-open"));
          return;
        }
        popover.classList.toggle("is-open");
      },
      { signal },
    );
  });

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Node | null;
      document.querySelectorAll<HTMLElement>(".argon-wechat-qr.is-open").forEach((popover) => {
        if (target && popover.contains(target)) return;
        popover.classList.remove("is-open");
      });
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") closeAllQr();
    },
    { signal },
  );

  document.querySelectorAll<HTMLElement>(".icon-copy-link").forEach((link) => {
    if (link.dataset.bound === "true") return;
    link.dataset.bound = "true";
    link.addEventListener(
      "click",
      async (event) => {
        event.preventDefault();
        const target = copyTarget(location.href);
        const ok = await writeClipboard(target);
        if (!ok) return;
        link.classList.add("is-copied");
        link.setAttribute("data-copied", "Copied!");
        window.setTimeout(() => {
          link.classList.remove("is-copied");
          link.removeAttribute("data-copied");
        }, 1600);
      },
      { signal },
    );
  });
}
