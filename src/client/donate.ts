/** Toggle donate QR code popovers on click and blur trigger on close so :focus cannot hold QR open. */
export function bindDonate(signal?: AbortSignal): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".donate-btn");
  if (buttons.length === 0) return;

  const closeQr = (qr: HTMLElement) => {
    const container = qr.closest(".post-donate") ?? qr.parentElement;
    const btn = container?.querySelector<HTMLButtonElement>(".donate-btn");
    qr.classList.remove("is-open");
    btn?.setAttribute("aria-expanded", "false");
    btn?.blur();
  };

  buttons.forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";

    const container = button.closest(".post-donate") ?? button.parentElement;
    const qrcode = container?.querySelector<HTMLElement>(".donate-qrcode");
    if (!qrcode) return;

    button.setAttribute("aria-expanded", "false");
    button.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        const open = qrcode.classList.toggle("is-open");
        button.setAttribute("aria-expanded", open ? "true" : "false");
        if (!open) button.blur();
      },
      { signal },
    );
  });

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target as Node | null;
      document.querySelectorAll<HTMLElement>(".donate-qrcode.is-open").forEach((qr) => {
        const container = qr.closest(".post-donate") ?? qr.parentElement;
        if (target && container?.contains(target)) return;
        closeQr(qr);
      });
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Escape") return;
      document.querySelectorAll<HTMLElement>(".donate-qrcode.is-open").forEach(closeQr);
    },
    { signal },
  );
}
