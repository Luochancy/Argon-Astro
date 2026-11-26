/** Argon native inline color picker using bundled Pickr styles (never OS <input type="color">). */

const THEME_COLOR_STORAGE = "Argon_Theme_Color";

/** Official 12 Argon theme preset color swatches. */
export const ARGON_COLOR_SWATCHES = [
  "#5e72e4",
  "#fa7298",
  "#009688",
  "#607d8b",
  "#2196f3",
  "#3f51b5",
  "#ff9700",
  "#109d58",
  "#dc4437",
  "#673bb7",
  "#212121",
  "#795547",
] as const;

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsv {
  h: number;
  s: number;
  v: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface ColorPickerOptions {
  defaultColor: string;
  initialColor: string;
  signal?: AbortSignal;
}

export function normalizeHex(value: string): string | null {
  const clean = value.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return (
      "#" +
      clean
        .split("")
        .map((ch) => ch + ch)
        .join("")
        .toLowerCase()
    );
  }
  if (/^[0-9a-f]{6}$/i.test(clean)) {
    return "#" + clean.toLowerCase();
  }
  return null;
}

function hexToRgb(hex: string): Rgb {
  const norm = normalizeHex(hex) ?? "#5e72e4";
  const num = Number.parseInt(norm.slice(1), 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const part = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;

  return { h: Math.round((h / 6) * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hue < 60) [r1, g1, b1] = [c, x, 0];
  else if (hue < 120) [r1, g1, b1] = [x, c, 0];
  else if (hue < 180) [r1, g1, b1] = [0, c, x];
  else if (hue < 240) [r1, g1, b1] = [0, x, c];
  else if (hue < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

/** Apply all 7 Argon theme CSS variables, luminance guard class, meta tag, and optional persistence. */
export function applyThemeColor(hex: string, persist = false): string | null {
  const norm = normalizeHex(hex);
  if (!norm) return null;

  const rgb = hexToRgb(norm);
  const hsl = rgbToHsl(rgb);
  const root = document.documentElement;

  root.style.setProperty("--themecolor", norm);
  root.style.setProperty("--themecolor-R", String(rgb.r));
  root.style.setProperty("--themecolor-G", String(rgb.g));
  root.style.setProperty("--themecolor-B", String(rgb.b));
  root.style.setProperty("--themecolor-rgbstr", `${rgb.r},${rgb.g},${rgb.b}`);
  root.style.setProperty("--themecolor-H", String(hsl.h));
  root.style.setProperty("--themecolor-S", String(hsl.s));
  root.style.setProperty("--themecolor-L", String(hsl.l));

  const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
  root.classList.toggle("themecolor-toodark", luminance < 50);

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", norm);
  if (persist) {
    localStorage.setItem(THEME_COLOR_STORAGE, norm);
  }
  return norm;
}

/** Restore persisted theme color from localStorage and return the active hex color. */
export function restoreThemeColor(fallbackColor: string): string {
  const saved = localStorage.getItem(THEME_COLOR_STORAGE);
  if (saved) {
    const applied = applyThemeColor(saved, false);
    if (applied) return applied;
  }
  return normalizeHex(fallbackColor) ?? "#5e72e4";
}

/** Ensure #theme-color-picker is a div container even if SSR emitted an <input type="color">. */
function ensurePickerHost(): HTMLElement | null {
  const existing = document.getElementById("theme-color-picker");
  if (!existing) return null;
  if (existing.tagName !== "INPUT") return existing;

  const host = document.createElement("div");
  host.id = "theme-color-picker";
  host.className = "ml-3";
  existing.replaceWith(host);
  return host;
}

/** Mount Argon's native Pickr-styled popover inside #theme-color-picker. */
export function mountColorPicker(options: ColorPickerOptions): { close: () => void } | null {
  const host = ensurePickerHost();
  if (!host) return null;

  const defaultHex = normalizeHex(options.defaultColor) ?? "#5e72e4";
  let currentHex = normalizeHex(options.initialColor) ?? defaultHex;
  let hsv = rgbToHsv(hexToRgb(currentHex));
  let isOpen = false;
  const { signal } = options;

  // Remove any stale popover left in body from a previous mount.
  document.querySelectorAll(".pcr-app.theme-color-picker-box").forEach((el) => el.remove());

  host.innerHTML =
    '<div class="pickr">' +
      `<button type="button" class="pcr-button" aria-label="Theme color" aria-expanded="false" style="color: ${currentHex};"></button>` +
    "</div>";
  const triggerBtn = host.querySelector<HTMLButtonElement>(".pcr-button")!;

  const popover = document.createElement("div");
  popover.className = "pcr-app theme-color-picker-box";
  popover.dataset.theme = "monolith";
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-label", "Theme color picker");
  popover.innerHTML =
    '<div class="pcr-selection">' +
      '<div class="pcr-color-palette">' +
        '<div class="pcr-picker"></div>' +
        '<div class="pcr-palette" tabindex="0" aria-label="Color saturation and brightness"></div>' +
      "</div>" +
      '<div class="pcr-color-chooser">' +
        '<div class="pcr-picker"></div>' +
        '<div class="pcr-slider" tabindex="0" aria-label="Hue slider"></div>' +
      "</div>" +
    "</div>" +
    '<div class="pcr-swatches">' +
      ARGON_COLOR_SWATCHES.map(
        (hex) => `<button type="button" data-color="${hex}" style="color: ${hex};" aria-label="${hex}"></button>`,
      ).join("") +
    "</div>" +
    '<div class="pcr-interaction">' +
      '<input class="pcr-result" type="text" maxlength="7" spellcheck="false" aria-label="Hex color value" />' +
      '<input class="pcr-cancel" type="button" value="恢复默认" />' +
      '<input class="pcr-save" type="button" value="确定" />' +
    "</div>";
  document.body.appendChild(popover);

  const paletteBox = popover.querySelector<HTMLElement>(".pcr-color-palette")!;
  const paletteSurface = popover.querySelector<HTMLElement>(".pcr-palette")!;
  const paletteThumb = paletteBox.querySelector<HTMLElement>(".pcr-picker")!;
  const hueBox = popover.querySelector<HTMLElement>(".pcr-color-chooser")!;
  const hueThumb = hueBox.querySelector<HTMLElement>(".pcr-picker")!;
  const hexInput = popover.querySelector<HTMLInputElement>(".pcr-result")!;
  const resetBtn = popover.querySelector<HTMLInputElement>(".pcr-cancel")!;
  const saveBtn = popover.querySelector<HTMLInputElement>(".pcr-save")!;
  const swatchBtns = [...popover.querySelectorAll<HTMLButtonElement>(".pcr-swatches > button")];

  const syncUi = (updateInput = true) => {
    const hueCss = `hsl(${Math.round(hsv.h)}, 100%, 50%)`;
    paletteSurface.style.background =
      `linear-gradient(to top, #000, transparent), linear-gradient(to left, ${hueCss}, #fff)`;
    paletteThumb.style.left = `${hsv.s * 100}%`;
    paletteThumb.style.top = `${(1 - hsv.v) * 100}%`;
    paletteThumb.style.background = currentHex;

    hueThumb.style.left = `${(hsv.h / 360) * 100}%`;
    hueThumb.style.background = hueCss;

    triggerBtn.style.color = currentHex;
    if (updateInput && document.activeElement !== hexInput) {
      hexInput.value = currentHex.toUpperCase();
    }
    swatchBtns.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.color?.toLowerCase() === currentHex.toLowerCase());
    });
  };

  const commitFromHsv = (persist = true) => {
    currentHex = rgbToHex(hsvToRgb(hsv));
    applyThemeColor(currentHex, persist);
    syncUi(true);
  };

  const positionPopover = () => {
    const rect = triggerBtn.getBoundingClientRect();
    const popW = popover.offsetWidth || 248;
    const popH = popover.offsetHeight || 290;
    const margin = 10;

    let top = rect.top - popH - 10;
    if (top < margin) top = rect.bottom + 10;
    top = Math.max(margin, Math.min(window.innerHeight - popH - margin, top));

    let left = rect.right - popW;
    if (left < margin) left = rect.left;
    left = Math.max(margin, Math.min(window.innerWidth - popW - margin, left));

    popover.style.top = `${Math.round(top)}px`;
    popover.style.left = `${Math.round(left)}px`;
  };

  const open = () => {
    isOpen = true;
    syncUi(true);
    positionPopover();
    popover.classList.add("visible");
    triggerBtn.setAttribute("aria-expanded", "true");
  };

  const close = () => {
    if (!isOpen) return;
    isOpen = false;
    popover.classList.remove("visible");
    triggerBtn.setAttribute("aria-expanded", "false");
  };

  syncUi(true);

  triggerBtn.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      if (isOpen) close();
      else open();
    },
    { signal },
  );

  // Interactive 2D saturation/brightness drag on palette.
  const bindDrag = (target: HTMLElement, onPoint: (clientX: number, clientY: number) => void) => {
    target.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0 && event.pointerType === "mouse") return;
        event.preventDefault();
        onPoint(event.clientX, event.clientY);

        const move = (moveEvent: PointerEvent) => onPoint(moveEvent.clientX, moveEvent.clientY);
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
        };
        window.addEventListener("pointermove", move, { signal });
        window.addEventListener("pointerup", up, { signal });
        window.addEventListener("pointercancel", up, { signal });
      },
      { signal },
    );
  };

  bindDrag(paletteBox, (clientX, clientY) => {
    const rect = paletteBox.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    hsv.s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    hsv.v = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    commitFromHsv(true);
  });

  bindDrag(hueBox, (clientX) => {
    const rect = hueBox.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    hsv.h = ratio * 360;
    commitFromHsv(true);
  });

  // 12 preset swatches.
  swatchBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        const hex = btn.dataset.color;
        if (!hex) return;
        const applied = applyThemeColor(hex, true);
        if (!applied) return;
        currentHex = applied;
        hsv = rgbToHsv(hexToRgb(currentHex));
        syncUi(true);
      },
      { signal },
    );
  });

  // Live HEX input editing.
  hexInput.addEventListener(
    "input",
    () => {
      const parsed = normalizeHex(hexInput.value);
      if (!parsed) return;
      currentHex = parsed;
      hsv = rgbToHsv(hexToRgb(currentHex));
      applyThemeColor(currentHex, true);
      syncUi(false);
    },
    { signal },
  );

  hexInput.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        const parsed = normalizeHex(hexInput.value);
        if (parsed) {
          currentHex = parsed;
          applyThemeColor(currentHex, true);
          syncUi(true);
        }
        close();
      }
    },
    { signal },
  );

  // Reset to blog default color.
  resetBtn.addEventListener(
    "click",
    () => {
      localStorage.removeItem(THEME_COLOR_STORAGE);
      currentHex = defaultHex;
      hsv = rgbToHsv(hexToRgb(currentHex));
      applyThemeColor(currentHex, false);
      syncUi(true);
      close();
    },
    { signal },
  );

  // Confirm current color and close popover.
  saveBtn.addEventListener(
    "click",
    () => {
      const parsed = normalizeHex(hexInput.value);
      if (parsed) {
        currentHex = parsed;
        hsv = rgbToHsv(hexToRgb(currentHex));
      }
      applyThemeColor(currentHex, true);
      syncUi(true);
      close();
    },
    { signal },
  );

  // Close on outside click, Escape, or viewport resize reposition.
  document.addEventListener(
    "click",
    (event) => {
      if (!isOpen) return;
      const target = event.target as Node | null;
      if (target && (popover.contains(target) || host.contains(target))) return;
      close();
    },
    { signal },
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (isOpen && event.key === "Escape") close();
    },
    { signal },
  );

  window.addEventListener(
    "resize",
    () => {
      if (isOpen) positionPopover();
    },
    { passive: true, signal },
  );

  signal?.addEventListener("abort", () => popover.remove(), { once: true });

  return { close };
}
