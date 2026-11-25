/** Argon native card-radius slider built on bundled noUiSlider DOM/CSS classes. */

const MIN = 0;
const MAX = 30;
const STEP = 0.5;

export interface RadiusSliderOptions {
  defaultRadius: number;
  initialRadius: number;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
  onReset: (value: number) => void;
  signal?: AbortSignal;
}

export interface RadiusSliderHandle {
  setValue: (value: number, animate?: boolean) => void;
}

function snap(value: number): number {
  const clamped = Math.max(MIN, Math.min(MAX, value));
  return Math.round(clamped / STEP) * STEP;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Ensure #blog_setting_card_radius is a mountable div container even if SSR rendered an input. */
function ensureHostContainer(): HTMLElement | null {
  const existing = document.getElementById("blog_setting_card_radius");
  if (!existing) return null;
  if (existing.tagName !== "INPUT") return existing;

  const wrapper = document.createElement("div");
  wrapper.style.flex = "1";
  wrapper.style.marginLeft = "20px";
  wrapper.style.marginRight = "8px";
  wrapper.style.transform = "translateY(2px)";

  const host = document.createElement("div");
  host.id = "blog_setting_card_radius";
  wrapper.appendChild(host);
  existing.replaceWith(wrapper);
  return host;
}

/** Mount Argon's native noUiSlider inside #blog_setting_card_radius. */
export function mountRadiusSlider(options: RadiusSliderOptions): RadiusSliderHandle | null {
  const host = ensureHostContainer();
  if (!host) return null;

  const { defaultRadius, initialRadius, onChange, onCommit, onReset, signal } = options;

  host.className = "noUi-target noUi-ltr noUi-horizontal";
  host.innerHTML =
    '<div class="noUi-base">' +
      '<div class="noUi-connects"><div class="noUi-connect"></div></div>' +
      '<div class="noUi-origin" style="z-index: 4;">' +
        '<div class="noUi-handle noUi-handle-lower" data-handle="0" tabindex="0" role="slider" ' +
          `aria-orientation="horizontal" aria-valuemin="${MIN}" aria-valuemax="${MAX}">` +
          '<div class="noUi-touch-area"></div>' +
        "</div>" +
      "</div>" +
    "</div>";

  const base = host.querySelector<HTMLElement>(".noUi-base")!;
  const connect = host.querySelector<HTMLElement>(".noUi-connect")!;
  const origin = host.querySelector<HTMLElement>(".noUi-origin")!;
  const handle = host.querySelector<HTMLElement>(".noUi-handle")!;

  let current = snap(initialRadius);
  let tapTimer: number | null = null;
  let keyTooltipTimer: number | null = null;
  let dragging = false;

  const triggerTapTransition = () => {
    host.classList.add("noUi-state-tap");
    if (tapTimer !== null) window.clearTimeout(tapTimer);
    tapTimer = window.setTimeout(() => {
      host.classList.remove("noUi-state-tap");
      tapTimer = null;
    }, 300);
  };

  const paint = (value: number, animate = false) => {
    current = snap(value);
    const ratio = (current - MIN) / (MAX - MIN);
    const formatted = formatValue(current);

    if (animate) triggerTapTransition();
    connect.style.transform = `translate(0%, 0px) scale(${ratio}, 1)`;
    origin.style.transform = `translate(${(ratio - 1) * 100}%, 0px)`;
    handle.setAttribute("aria-valuenow", formatted);
    handle.setAttribute("aria-valuetext", `${formatted} px`);
  };

  const valueFromClientX = (clientX: number): number => {
    const rect = base.getBoundingClientRect();
    if (rect.width <= 0) return current;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snap(MIN + ratio * (MAX - MIN));
  };

  paint(current, false);

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const next = valueFromClientX(event.clientX);
    if (next !== current) {
      paint(next, false);
      onChange(current);
    }
  };

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove("noUi-active");
    host.classList.remove("noUi-state-drag");
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
    onCommit(current);
  };

  host.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.preventDefault();

      const onHandle = handle.contains(event.target as Node);
      dragging = true;
      handle.classList.add("noUi-active");
      handle.focus({ preventScroll: true });

      if (onHandle) {
        host.classList.add("noUi-state-drag");
      } else {
        const next = valueFromClientX(event.clientX);
        paint(next, true);
        onChange(current);
      }

      window.addEventListener("pointermove", onPointerMove, { signal });
      window.addEventListener("pointerup", endDrag, { signal });
      window.addEventListener("pointercancel", endDrag, { signal });
    },
    { signal },
  );

  handle.addEventListener(
    "keydown",
    (event) => {
      let next: number | null = null;
      if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = current - STEP;
      else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = current + STEP;
      else if (event.key === "PageDown") next = current - 2;
      else if (event.key === "PageUp") next = current + 2;
      else if (event.key === "Home") next = MIN;
      else if (event.key === "End") next = MAX;
      if (next === null) return;

      event.preventDefault();
      paint(next, true);
      handle.classList.add("noUi-active");
      if (keyTooltipTimer !== null) window.clearTimeout(keyTooltipTimer);
      keyTooltipTimer = window.setTimeout(() => {
        if (!dragging) handle.classList.remove("noUi-active");
        keyTooltipTimer = null;
      }, 900);
      onChange(current);
      onCommit(current);
    },
    { signal },
  );

  document.getElementById("blog_setting_card_radius_to_default")?.addEventListener(
    "click",
    () => {
      paint(defaultRadius, true);
      onReset(current);
    },
    { signal },
  );

  signal?.addEventListener(
    "abort",
    () => {
      if (tapTimer !== null) window.clearTimeout(tapTimer);
      if (keyTooltipTimer !== null) window.clearTimeout(keyTooltipTimer);
      endDrag();
    },
    { once: true },
  );

  return {
    setValue: (value: number, animate = false) => paint(value, animate),
  };
}
