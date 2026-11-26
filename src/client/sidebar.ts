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
      if (event.key === "Escape") {
        if (root.classList.contains("leftbar-opened")) close();
        document.querySelectorAll<HTMLElement>(".argon-modal-backdrop.show").forEach((modal) => {
          modal.classList.remove("show");
          modal.setAttribute("aria-hidden", "true");
        });
        document.body.classList.remove("argon-modal-open");
      }
    },
    { signal },
  );

  // Bind upstream Argon #blog_categories / #blog_tags modal dialogs.
  document.querySelectorAll<HTMLElement>("[data-argon-modal]").forEach((trigger) => {
    trigger.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        const id = trigger.dataset.argonModal;
        if (!id) return;
        const modal = document.getElementById(id);
        if (!modal) return;
        close();
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("argon-modal-open");
      },
      { signal },
    );
  });

  document.querySelectorAll<HTMLElement>(".argon-modal-backdrop").forEach((modal) => {
    const closeModal = () => {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("argon-modal-open");
    };
    modal.addEventListener(
      "click",
      (event) => {
        if (event.target === modal) closeModal();
      },
      { signal },
    );
    modal.querySelectorAll<HTMLElement>("[data-argon-modal-close], a[href]").forEach((btn) => {
      btn.addEventListener("click", closeModal, { signal });
    });
  });

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
