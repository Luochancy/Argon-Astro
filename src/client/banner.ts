/** Bind Argon banner typing animation (title -> subtitle sequentially) and fullscreen cover scroll-down. */
export function bindBanner(typing: boolean, interval = 100, signal?: AbortSignal): void {
  // Always bind fullscreen cover scroll-down and cover scroll visibility.
  const scrollDownBtn = document.querySelector<HTMLElement>(".cover-scroll-down");
  scrollDownBtn?.addEventListener(
    "click",
    () => {
      const content = document.getElementById("content");
      if (!content) return;
      const top = content.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    },
    { signal },
  );

  if (document.documentElement.classList.contains("banner-as-cover")) {
    const fabs = document.getElementById("float_action_buttons");
    const syncCoverWidgets = () => {
      const scrollTop = window.scrollY;
      const viewportH = window.innerHeight || window.outerHeight;
      fabs?.classList.toggle("hidden", scrollTop < viewportH * 0.2);
      scrollDownBtn?.classList.toggle("hidden", scrollTop >= viewportH * 0.6);
    };
    syncCoverWidgets();
    window.addEventListener("scroll", syncCoverWidgets, { passive: true, signal });
    window.addEventListener("resize", syncCoverWidgets, { passive: true, signal });
  }

  const bannerTitle = document.querySelector<HTMLElement>(".banner-title");
  if (!typing && !bannerTitle?.dataset.interval) return;

  const stepMs = Math.max(20, Number(bannerTitle?.dataset.interval || interval) || 100);
  const titleNode = document.querySelector<HTMLElement>(".banner-title-inner[data-text]");
  const subtitleNode = document.querySelector<HTMLElement>(".banner-subtitle[data-text]");
  if (!titleNode || titleNode.dataset.bound === "true") return;
  titleNode.dataset.bound = "true";
  if (subtitleNode) subtitleNode.dataset.bound = "true";

  const timers: number[] = [];
  const schedule = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  };

  signal?.addEventListener(
    "abort",
    () => {
      timers.forEach((id) => window.clearTimeout(id));
    },
    { once: true },
  );

  const startType = (el: HTMLElement, text: string) => {
    if (!text) return;
    const animCount = Math.max(1, Math.ceil((text.length * stepMs) / 1000));
    el.classList.add("typing-effect");
    el.style.setProperty("--animation-cnt", String(animCount));

    // Start at char 1 immediately so the line box never collapses to empty height.
    let now = 1;
    el.textContent = text.slice(0, now);

    const tick = () => {
      now += 1;
      if (now > text.length) {
        schedule(() => el.classList.remove("typing-effect"), 1000);
        return;
      }
      el.textContent = text.slice(0, now);
      schedule(tick, stepMs);
    };
    schedule(tick, stepMs);
  };

  const titleText = titleNode.dataset.text ?? "";
  startType(titleNode, titleText);

  if (subtitleNode) {
    const subtitleText = subtitleNode.dataset.text ?? "";
    if (subtitleText) {
      const delayMs = Math.ceil((titleText.length * stepMs) / 1000) * 1000;
      schedule(() => startType(subtitleNode, subtitleText), delayMs);
    }
  }
}
