import { toggleCollapse } from "../lib/blocks/toggle.mjs";

const DURATION_MS = 300;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const TRANSITION = `height ${DURATION_MS}ms ${EASING}, padding-top ${DURATION_MS}ms ${EASING}, padding-bottom ${DURATION_MS}ms ${EASING}, opacity 240ms ease`;

const activeTimers = new WeakMap<HTMLElement, number>();

function clearAnimation(body: HTMLElement): void {
  const timer = activeTimers.get(body);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    activeTimers.delete(body);
  }
  body.style.removeProperty("transition");
  body.style.removeProperty("height");
  body.style.removeProperty("padding-top");
  body.style.removeProperty("padding-bottom");
  body.style.removeProperty("overflow");
  body.style.removeProperty("opacity");
}

function animateOpen(body: HTMLElement): void {
  clearAnimation(body);
  body.hidden = false;
  body.style.display = "block";
  body.style.overflow = "hidden";

  // Measure natural height and padding before collapsing to 0 for the opening frame.
  const computed = window.getComputedStyle(body);
  const targetHeight = body.scrollHeight;
  const targetPadTop = computed.paddingTop;
  const targetPadBottom = computed.paddingBottom;

  body.style.height = "0px";
  body.style.paddingTop = "0px";
  body.style.paddingBottom = "0px";
  body.style.opacity = "0";
  void body.offsetHeight;

  body.style.transition = TRANSITION;
  body.style.height = `${targetHeight}px`;
  body.style.paddingTop = targetPadTop;
  body.style.paddingBottom = targetPadBottom;
  body.style.opacity = "1";

  const timer = window.setTimeout(() => {
    clearAnimation(body);
    body.style.display = "";
  }, DURATION_MS + 30);
  activeTimers.set(body, timer);
}

function animateClose(body: HTMLElement): void {
  clearAnimation(body);
  const currentHeight = body.offsetHeight;
  const computed = window.getComputedStyle(body);

  body.style.overflow = "hidden";
  body.style.height = `${currentHeight}px`;
  body.style.paddingTop = computed.paddingTop;
  body.style.paddingBottom = computed.paddingBottom;
  body.style.opacity = "1";
  void body.offsetHeight;

  body.style.transition = TRANSITION;
  body.style.height = "0px";
  body.style.paddingTop = "0px";
  body.style.paddingBottom = "0px";
  body.style.opacity = "0";

  const timer = window.setTimeout(() => {
    clearAnimation(body);
    body.style.display = "none";
  }, DURATION_MS + 30);
  activeTimers.set(body, timer);
}

/** Bind smooth height open/close animations on Argon collapse blocks. */
export function bindBlocks(signal?: AbortSignal): void {
  document.querySelectorAll<HTMLElement>(".collapse-block-title").forEach((title) => {
    if (title.dataset.bound === "true") return;
    title.dataset.bound = "true";

    const block = title.closest<HTMLElement>(".collapse-block");
    const body = block?.querySelector<HTMLElement>(".collapse-block-body");
    if (block?.classList.contains("collapsed") && body) {
      body.hidden = false;
      body.style.display = "none";
    }

    title.addEventListener(
      "click",
      () => {
        if (!block) return;
        const next = toggleCollapse(block.classList.contains("collapsed"));
        block.classList.toggle("collapsed", next.collapsed);
        title.setAttribute("aria-expanded", next.expanded);
        if (!body) return;
        if (next.collapsed) animateClose(body);
        else animateOpen(body);
      },
      { signal },
    );
  });
}
