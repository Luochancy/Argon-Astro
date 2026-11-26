import { mountColorPicker, restoreThemeColor } from "./color-picker";
import { mountRadiusSlider } from "./radius-slider";
import type { ClientConfig } from "./types";

const STORAGE = {
  font: "Argon_Font",
  shadow: "Argon_Shadow",
  filter: "Argon_Filter",
  radius: "Argon_Card_Radius",
  side: "Argon_Fab_Side",
  legacySide: "Argon_fabs_Floating_Status",
} as const;

const FILTER_NAMES = ["off", "sunset", "darkness", "grayscale"] as const;
const FILTER_CLASSES = ["filter-sunset", "filter-darkness", "filter-grayscale"] as const;

function resolveFilterName(raw: string | null | undefined): string {
  const clean = (raw || "off").trim().toLowerCase();
  return (FILTER_NAMES as readonly string[]).includes(clean) ? clean : "off";
}

function getButtonFilterName(button: HTMLElement): string {
  const fromAttr = button.getAttribute("filter-name") || button.dataset.filter;
  if (fromAttr) return resolveFilterName(fromAttr);
  const match = /^blog_setting_filter_(\w+)$/.exec(button.id);
  return resolveFilterName(match?.[1]);
}

function applyFilter(rawName: string): void {
  const name = resolveFilterName(rawName);
  const root = document.documentElement;
  root.classList.remove(...FILTER_CLASSES);
  if (name !== "off") {
    root.classList.add("filter-" + name);
  }

  document.querySelectorAll<HTMLElement>(".blog-setting-filter-btn, [data-filter]").forEach((btn) => {
    btn.classList.toggle("active", getButtonFilterName(btn) === name);
  });
  for (const candidate of FILTER_NAMES) {
    document.getElementById(`blog_setting_filter_${candidate}`)?.classList.toggle("active", candidate === name);
  }
}

function parseSavedRadius(defaultRadius: number): number {
  const raw = localStorage.getItem(STORAGE.radius);
  if (raw === null || raw === "") return defaultRadius;
  const num = Number.parseFloat(raw);
  return Number.isFinite(num) && num >= 0 && num <= 30 ? num : defaultRadius;
}

/** Bind floating action buttons, blog settings popup, radius slider, color picker, and article reading progress. */
export function bindFab(config: ClientConfig, signal?: AbortSignal): void {
  const root = document.documentElement;
  const buttons = document.getElementById("float_action_buttons");
  const popup = document.getElementById("fabtn_blog_settings_popup");

  // Clear any inline opacity so upstream .blog_settings_opened CSS drives the slide+fade transition.
  popup?.style.removeProperty("opacity");

  // Restore persisted theme color (all 7 CSS variables + dark luminance class).
  const activeColor = restoreThemeColor(config.appearance.color);

  // Restore persisted font, shadow, filter, card radius, and FAB side.
  const savedFont = localStorage.getItem(STORAGE.font);
  if (savedFont === "serif" || savedFont === "sans") {
    root.classList.toggle("use-serif", savedFont === "serif");
  }

  const savedShadow = localStorage.getItem(STORAGE.shadow);
  if (savedShadow === "big" || savedShadow === "small") {
    root.classList.toggle("use-big-shadow", savedShadow === "big");
    root.classList.toggle("use-small-shadow", savedShadow === "small");
  }

  applyFilter(localStorage.getItem(STORAGE.filter) || "off");

  const initialRadius = parseSavedRadius(config.appearance.cardRadius);
  if (localStorage.getItem(STORAGE.radius) !== null) {
    root.style.setProperty("--card-radius", `${initialRadius}px`);
  }

  const savedSide = localStorage.getItem(STORAGE.side) || localStorage.getItem(STORAGE.legacySide);
  if (savedSide === "left" || savedSide === "right") {
    buttons?.classList.toggle("fabtns-float-left", savedSide === "left");
  }

  // Mount native Argon noUiSlider for card border radius.
  mountRadiusSlider({
    defaultRadius: config.appearance.cardRadius,
    initialRadius,
    onChange: (value) => {
      root.style.setProperty("--card-radius", `${value}px`);
    },
    onCommit: (value) => {
      root.style.setProperty("--card-radius", `${value}px`);
      localStorage.setItem(STORAGE.radius, String(value));
    },
    onReset: (value) => {
      root.style.setProperty("--card-radius", `${value}px`);
      localStorage.removeItem(STORAGE.radius);
    },
    signal,
  });

  // Mount native Argon Pickr inline color picker.
  const picker = mountColorPicker({
    defaultColor: config.appearance.color,
    initialColor: activeColor,
    signal,
  });

  // Back-to-top click.
  const backToTopBtn = document.getElementById("fabtn_back_to_top");
  backToTopBtn?.addEventListener(
    "click",
    () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    { signal },
  );

  // Go-to-comment button: visible only when a comment target exists on the page.
  const goToCommentBtn = document.getElementById("fabtn_go_to_comment");
  const commentTarget = document.getElementById("post_comment") || document.getElementById("comments");
  if (goToCommentBtn) {
    goToCommentBtn.classList.toggle("d-none", !commentTarget);
    goToCommentBtn.addEventListener(
      "click",
      () => {
        const target = document.getElementById("post_comment") || document.getElementById("comments");
        if (!target) return;
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
        document.getElementById("post_comment_content")?.focus({ preventScroll: true });
      },
      { signal },
    );
  }

  // Settings popup open/close driven purely by .blog_settings_opened CSS class.
  const setPopupOpen = (opened: boolean) => {
    buttons?.classList.toggle("blog_settings_opened", opened);
    popup?.setAttribute("aria-hidden", opened ? "false" : "true");
    if (!opened) picker?.close();
  };

  document.getElementById("fabtn_toggle_blog_settings_popup")?.addEventListener(
    "click",
    () => {
      const next = !(buttons?.classList.contains("blog_settings_opened") ?? false);
      setPopupOpen(next);
    },
    { signal },
  );

  document.getElementById("close_blog_settings")?.addEventListener(
    "click",
    () => setPopupOpen(false),
    { signal },
  );

  // Animated FAB left/right side swap with 300ms fade-out/in.
  let sideTimer: number | null = null;
  document.getElementById("fabtn_toggle_sides")?.addEventListener(
    "click",
    () => {
      if (!buttons) return;
      if (sideTimer !== null) window.clearTimeout(sideTimer);
      picker?.close();
      buttons.classList.add("fabtns-unloaded");
      sideTimer = window.setTimeout(() => {
        const isLeft = buttons.classList.toggle("fabtns-float-left");
        localStorage.setItem(STORAGE.side, isLeft ? "left" : "right");
        buttons.classList.remove("fabtns-unloaded");
        sideTimer = null;
      }, 300);
    },
    { signal },
  );

  signal?.addEventListener(
    "abort",
    () => {
      if (sideTimer !== null) window.clearTimeout(sideTimer);
    },
    { once: true },
  );

  // Font & card shadow toggles.
  document.getElementById("blog_setting_font_serif")?.addEventListener(
    "click",
    () => {
      root.classList.add("use-serif");
      localStorage.setItem(STORAGE.font, "serif");
    },
    { signal },
  );

  document.getElementById("blog_setting_font_sans_serif")?.addEventListener(
    "click",
    () => {
      root.classList.remove("use-serif");
      localStorage.setItem(STORAGE.font, "sans");
    },
    { signal },
  );

  document.getElementById("blog_setting_shadow_big")?.addEventListener(
    "click",
    () => {
      root.classList.remove("use-small-shadow");
      root.classList.add("use-big-shadow");
      localStorage.setItem(STORAGE.shadow, "big");
    },
    { signal },
  );

  document.getElementById("blog_setting_shadow_small")?.addEventListener(
    "click",
    () => {
      root.classList.remove("use-big-shadow");
      root.classList.add("use-small-shadow");
      localStorage.setItem(STORAGE.shadow, "small");
    },
    { signal },
  );

  // Page filter buttons.
  const filterButtons = new Set<HTMLElement>([
    ...document.querySelectorAll<HTMLElement>(".blog-setting-filter-btn, [data-filter]"),
    ...FILTER_NAMES.map((n) => document.getElementById(`blog_setting_filter_${n}`)).filter(
      (el): el is HTMLElement => el !== null,
    ),
  ]);
  filterButtons.forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        const name = getButtonFilterName(button);
        applyFilter(name);
        localStorage.setItem(STORAGE.filter, name);
      },
      { signal },
    );
  });

  // Back-to-top visibility + article-scoped reading progress button.
  const readingBtn = document.getElementById("fabtn_reading_progress");
  const readingBar = document.getElementById("fabtn_reading_progress_bar");
  const readingDetails = document.getElementById("fabtn_reading_progress_details");

  const updateScrollButtons = () => {
    const scrollTop = window.scrollY;
    backToTopBtn?.classList.toggle("fabtn-hidden", scrollTop < 400);

    const article = document.querySelector<HTMLElement>("article.post.post-full");
    if (!article || config.motion.readingProgress === false) {
      readingBtn?.classList.add("fabtn-hidden");
      return;
    }

    const articleTop = article.getBoundingClientRect().top + scrollTop;
    const progressRange = article.offsetHeight + 50 - window.innerHeight;
    if (progressRange <= 0) {
      readingBtn?.classList.add("fabtn-hidden");
      return;
    }

    const ratio = (scrollTop - (articleTop - 80)) / progressRange;
    if (Number.isNaN(ratio) || ratio < 0 || ratio > 1) {
      readingBtn?.classList.add("fabtn-hidden");
      return;
    }

    const pct = `${Math.round(ratio * 100)}%`;
    readingBtn?.classList.remove("fabtn-hidden");
    if (readingBar) readingBar.style.width = pct;
    if (readingDetails) readingDetails.textContent = pct;
  };

  window.addEventListener("scroll", updateScrollButtons, { passive: true, signal });
  window.addEventListener("resize", updateScrollButtons, { passive: true, signal });
  const articleEl = document.querySelector<HTMLElement>("article.post.post-full");
  if (articleEl && typeof ResizeObserver === "function") {
    const ro = new ResizeObserver(() => updateScrollButtons());
    ro.observe(articleEl);
    signal?.addEventListener("abort", () => ro.disconnect(), { once: true });
  }
  updateScrollButtons();
  buttons?.classList.remove("fabtns-unloaded");
}
