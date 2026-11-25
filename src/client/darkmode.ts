import { shouldUseDark } from "../lib/list-layout.mjs";

const DARK_KEY = "Argon_Enable_Dark_Mode";
const AMOLED_KEY = "Argon_Enable_Amoled_Dark_Mode";

export function bindDarkmode(mode = "system", defaultAmoled = false, signal?: AbortSignal): void {
  const root = document.documentElement;
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  // Restore dark mode preference or resolve from configured policy and local hour.
  const storedDark = sessionStorage.getItem(DARK_KEY);
  if (storedDark === "true" || storedDark === "false") {
    root.classList.toggle("darkmode", storedDark === "true");
  } else {
    root.classList.toggle("darkmode", shouldUseDark(mode, media.matches, new Date().getHours()));
  }

  // Restore AMOLED dark mode independently of regular dark mode.
  const storedAmoled = localStorage.getItem(AMOLED_KEY);
  const amoledOn = storedAmoled === "true" || (storedAmoled === null && defaultAmoled);
  root.classList.toggle("amoled-dark", amoledOn);

  media.addEventListener(
    "change",
    () => {
      const choice = sessionStorage.getItem(DARK_KEY);
      if (choice === "true" || choice === "false") return;
      root.classList.toggle("darkmode", shouldUseDark(mode, media.matches, new Date().getHours()));
    },
    { signal },
  );

  const toggleDark = (event?: Event) => {
    if (event?.target instanceof HTMLInputElement) return;
    const next = !root.classList.contains("darkmode");
    root.classList.toggle("darkmode", next);
    sessionStorage.setItem(DARK_KEY, next ? "true" : "false");
  };

  const toggleAmoled = () => {
    const next = !root.classList.contains("amoled-dark");
    root.classList.toggle("amoled-dark", next);
    localStorage.setItem(AMOLED_KEY, next ? "true" : "false");
  };

  document.getElementById("fabtn_toggle_darkmode")?.addEventListener("click", toggleDark, { signal });
  document.getElementById("blog_setting_darkmode_switch")?.addEventListener("click", toggleDark, { signal });

  document.getElementById("blog_setting_amoled_switch")?.addEventListener("click", toggleAmoled, { signal });
  document
    .getElementById("blog_setting_toggle_darkmode_and_amoledarkmode")
    ?.addEventListener("click", toggleAmoled, { signal });
}
