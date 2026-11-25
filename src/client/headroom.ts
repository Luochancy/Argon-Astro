/** Manage Argon toolbar scroll transparency, headroom pin/unpin, and sticky sidebar state. */
export function bindHeadroom(mode: string | boolean, blur: boolean, signal?: AbortSignal): void {
  const toolbar = document.getElementById("navbar-main");
  const root = document.documentElement;
  const headroomMode = typeof mode === "boolean" ? (mode ? "true" : "false") : String(mode || "false");
  const enabled = headroomMode === "true";
  const isAbsolute = headroomMode === "absolute" || root.classList.contains("navbar-absolute");
  const noBanner = root.classList.contains("no-banner");
  const useBlur = blur || root.classList.contains("toolbar-blur");

  // 1. Toolbar transparency / on-top state.
  if (toolbar) {
    if (noBanner) {
      const updateNoBanner = () => {
        const scrollTop = window.scrollY;
        toolbar.classList.toggle("navbar-no-blur", scrollTop < 30);
      };
      updateNoBanner();
      window.addEventListener("scroll", updateNoBanner, { passive: true, signal });
    } else if (isAbsolute) {
      toolbar.classList.add("navbar-ontop");
    } else {
      const banner = document.getElementById("banner");
      const bannerTitle = document.querySelector<HTMLElement>(".banner-title");
      const content = document.getElementById("content");
      const maxOpacity = useBlur ? 0.65 : 0.85;

      let startHeight = 1;
      let endHeight = 120;

      const measure = () => {
        const scrollTop = window.scrollY;
        const isFullscreenCover = root.classList.contains("banner-as-cover") && root.classList.contains("is-home");
        const anchor = isFullscreenCover ? (bannerTitle || banner) : bannerTitle;
        const rawStart = anchor
          ? anchor.getBoundingClientRect().top + scrollTop - 75
          : 1;
        const rawEnd = content
          ? content.getBoundingClientRect().top + scrollTop - 75
          : banner
            ? banner.getBoundingClientRect().bottom + scrollTop - 75
            : rawStart + 120;
        startHeight = Math.max(1, rawStart);
        endHeight = Math.max(startHeight + 1, rawEnd);
      };

      const updateToolbar = () => {
        const scrollTop = Math.max(0, window.scrollY);
        toolbar.classList.toggle("headroom--top", scrollTop < startHeight);
        toolbar.classList.toggle("headroom--not-top", scrollTop >= startHeight);
        if (scrollTop < startHeight) {
          toolbar.style.setProperty("background-color", "rgba(var(--toolbar-color), 0)", "important");
          toolbar.style.setProperty("box-shadow", "none");
          if (useBlur) toolbar.style.setProperty("backdrop-filter", "blur(0px)");
          toolbar.classList.add("navbar-ontop");
          return;
        }
        if (scrollTop >= endHeight) {
          toolbar.style.setProperty("background-color", `rgba(var(--toolbar-color), ${maxOpacity})`, "important");
          toolbar.style.removeProperty("box-shadow");
          if (useBlur) toolbar.style.setProperty("backdrop-filter", "blur(16px)");
          toolbar.classList.remove("navbar-ontop");
          return;
        }

        const progress = (scrollTop - startHeight) / (endHeight - startHeight);
        const opacity = (progress * maxOpacity).toFixed(4);
        toolbar.style.setProperty("background-color", `rgba(var(--toolbar-color), ${opacity})`, "important");
        toolbar.style.removeProperty("box-shadow");
        if (useBlur) {
          toolbar.style.setProperty("backdrop-filter", progress > 0.3 ? "blur(16px)" : "blur(0px)");
        }
        toolbar.classList.remove("navbar-ontop");
      };

      measure();
      updateToolbar();
      window.addEventListener("scroll", updateToolbar, { passive: true, signal });
      window.addEventListener(
        "resize",
        () => {
          measure();
          updateToolbar();
        },
        { passive: true, signal },
      );
    }
  }

  // 2. Sticky sidebar (#leftbar_part2.sticky) and conditional body.leftbar-can-headroom.
  const leftbar = document.getElementById("leftbar");
  const leftbarPart1 = document.getElementById("leftbar_part1");
  const leftbarPart2 = document.getElementById("leftbar_part2");
  const content = document.getElementById("content");

  if (leftbar && leftbarPart1 && leftbarPart2) {
    let part1Top = 0;
    let part1Height = 0;

    const measureLeftbar = () => {
      part1Top = leftbarPart1.getBoundingClientRect().top + window.scrollY;
      part1Height = leftbarPart1.offsetHeight;
    };

    const updateLeftbar = () => {
      const scrollTop = window.scrollY;
      if (part1Height <= 0) {
        leftbarPart2.classList.remove("sticky");
        document.body.classList.remove("leftbar-can-headroom");
        return;
      }
      const remaining = part1Top + part1Height + 10 - scrollTop;
      const stickyThreshold = isAbsolute ? 18 : 90;
      const isSticky = remaining <= stickyThreshold;
      leftbarPart2.classList.toggle("sticky", isSticky);
      document.body.classList.toggle("leftbar-can-headroom", remaining <= 20);
    };

    measureLeftbar();
    updateLeftbar();
    window.addEventListener("scroll", updateLeftbar, { passive: true, signal });
    window.addEventListener(
      "resize",
      () => {
        measureLeftbar();
        updateLeftbar();
      },
      { passive: true, signal },
    );

    const observer = new MutationObserver(() => {
      measureLeftbar();
      updateLeftbar();
    });
    observer.observe(leftbarPart1, { attributes: true, childList: true, subtree: true });
    signal?.addEventListener("abort", () => observer.disconnect(), { once: true });
  } else if (content) {
    let contentTop = content.getBoundingClientRect().top + window.scrollY;

    const updateNoSidebar = () => {
      const scrollTop = window.scrollY;
      document.body.classList.toggle("leftbar-can-headroom", contentTop - 10 - scrollTop <= 20);
    };

    updateNoSidebar();
    window.addEventListener("scroll", updateNoSidebar, { passive: true, signal });
    window.addEventListener(
      "resize",
      () => {
        contentTop = content.getBoundingClientRect().top + window.scrollY;
        updateNoSidebar();
      },
      { passive: true, signal },
    );
  }

  // 3. Headroom pin/unpin classes on body.
  document.body.classList.toggle("with-headroom", enabled);
  if (!enabled) {
    document.body.classList.remove("headroom---unpinned", "headroom---pinned", "headroom---top", "headroom---not-top");
    return;
  }

  let lastScroll = window.scrollY;
  const updateHeadroom = () => {
    const scrollTop = Math.max(0, window.scrollY);
    const isTop = scrollTop <= 0;
    document.body.classList.toggle("headroom---top", isTop);
    document.body.classList.toggle("headroom---not-top", !isTop);

    if (scrollTop !== lastScroll) {
      const goingDown = scrollTop > lastScroll && scrollTop > 0;
      document.body.classList.toggle("headroom---unpinned", goingDown);
      document.body.classList.toggle("headroom---pinned", !goingDown);
      lastScroll = scrollTop;
    } else if (isTop) {
      document.body.classList.remove("headroom---unpinned");
      document.body.classList.add("headroom---pinned");
    }
  };

  updateHeadroom();
  window.addEventListener("scroll", updateHeadroom, { passive: true, signal });
}
