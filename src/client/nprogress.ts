/** Lightweight Argon NProgress bar driven by Astro ClientRouter lifecycle events. */

let bound = false;
let active = false;
let progress = 0;
let trickleTimer: number | null = null;
let finishTimer: number | null = null;

function clearTimers(): void {
  if (trickleTimer !== null) {
    window.clearInterval(trickleTimer);
    trickleTimer = null;
  }
  if (finishTimer !== null) {
    window.clearTimeout(finishTimer);
    finishTimer = null;
  }
}

function createBar(doc: Document = document): HTMLElement {
  let root = doc.getElementById("nprogress");
  if (!root) {
    root = doc.createElement("div");
    root.id = "nprogress";
    root.innerHTML = '<div class="bar" role="bar"><div class="peg"></div></div>';
    doc.body?.appendChild(root);
  }
  return root;
}

function render(value: number, doc: Document = document): void {
  const root = createBar(doc);
  const bar = root.querySelector<HTMLElement>(".bar");
  if (!bar) return;
  const pct = (-1 + Math.max(0.08, Math.min(1, value))) * 100;
  bar.style.transition = "transform 200ms ease, opacity 200ms ease";
  bar.style.transform = `translate3d(${pct}%, 0, 0)`;
  bar.style.opacity = "1";
}

/** Start the top navigation progress bar and smoothly trickle until completion. */
export function startNProgress(): void {
  clearTimers();
  active = true;
  progress = 0.08;
  const root = createBar();
  const bar = root.querySelector<HTMLElement>(".bar");
  if (bar) {
    bar.style.transition = "none";
    bar.style.transform = "translate3d(-100%, 0, 0)";
    bar.style.opacity = "1";
    void bar.offsetWidth;
  }
  render(progress);

  trickleTimer = window.setInterval(() => {
    if (!active) return;
    const step = progress < 0.2 ? 0.1 : progress < 0.5 ? 0.04 : progress < 0.8 ? 0.02 : 0.005;
    progress = Math.min(0.94, progress + step);
    render(progress);
  }, 200);
}

/** Advance the progress bar to an explicit fraction (0..1). */
export function setNProgress(value: number): void {
  if (!active) active = true;
  progress = Math.max(progress, Math.min(0.98, value));
  render(progress);
}

/** Complete and smoothly fade out the progress bar. */
export function doneNProgress(): void {
  if (!active && !document.getElementById("nprogress")) return;
  clearTimers();
  active = false;
  progress = 1;
  render(1);

  finishTimer = window.setTimeout(() => {
    const root = document.getElementById("nprogress");
    const bar = root?.querySelector<HTMLElement>(".bar");
    if (bar) bar.style.opacity = "0";
    finishTimer = window.setTimeout(() => {
      document.getElementById("nprogress")?.remove();
      progress = 0;
    }, 220);
  }, 160);
}

/** Keep the active NProgress bar visible seamlessly across an Astro document swap. */
export function preserveNProgressOnSwap(newDocument: Document): void {
  if (!active) return;
  render(progress, newDocument);
}

/** Bind global Astro ClientRouter navigation events once per session. */
export function bindNProgress(): void {
  if (bound) return;
  bound = true;

  document.addEventListener("astro:before-preparation", () => {
    startNProgress();
  });
  document.addEventListener("astro:after-swap", () => {
    if (active) setNProgress(0.82);
  });
  document.addEventListener("astro:page-load", () => {
    doneNProgress();
  });
}
