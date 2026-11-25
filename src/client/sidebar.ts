/** Bind mobile sidebar drawer toggles, auto-close on navigation, and cross-fading sidebar tabs. */
export function bindSidebar(signal?: AbortSignal): void {
  const root = document.documentElement;
  const open = () => root.classList.add("leftbar-opened");
  const close = () => root.classList.remove("leftbar-opened");

  document.getElementById("open_sidebar")?.addEventListener("click", open, { signal });
  document.getElementById("fabtn_open_sidebar")?.addEventListener("click", open, { signal });
  document.getElementById("sidebar_mask")?.addEventListener("click", close, { signal });

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && root.classList.contains("leftbar-opened")) {
        close();
      }
    },
    { signal },
  );

  // Auto-close mobile drawer when clicking sidebar navigation links.
  document
    .querySelectorAll<HTMLAnchorElement>("#leftbar a[href]:not([no-pjax]):not([href^='#'])")
    .forEach((link) => {
      link.addEventListener("click", close, { signal });
    });

  // Cross-fade .tab-pane.fade panels cleanly on tab switch.
  const tabTriggers = document.querySelectorAll<HTMLAnchorElement>(
    "[data-toggle='tab'], #leftbar_part2 .nav-pills a[href^='#']",
  );
  const seen = new Set<HTMLElement>();

  tabTriggers.forEach((tab) => {
    if (seen.has(tab)) return;
    seen.add(tab);

    tab.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        const href = tab.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        const target = document.querySelector<HTMLElement>(href);
        if (!target || target.classList.contains("active")) return;

        tab.closest("ul")?.querySelectorAll("a").forEach((item) => {
          item.classList.remove("active", "show");
          item.setAttribute("aria-selected", "false");
        });
        tab.classList.add("active", "show");
        tab.setAttribute("aria-selected", "true");

        const container = target.parentElement ?? tab.closest(".card-body");
        container?.querySelectorAll<HTMLElement>(":scope > .tab-pane, .tab-content > .tab-pane").forEach((pane) => {
          pane.classList.remove("active", "show");
        });

        target.classList.add("active");
        // Trigger CSS opacity transition from 0 -> 1 on the next animation frame.
        window.requestAnimationFrame(() => {
          void target.offsetWidth;
          window.requestAnimationFrame(() => {
            if (target.classList.contains("active")) {
              target.classList.add("show");
            }
          });
        });
      },
      { signal },
    );
  });
}
