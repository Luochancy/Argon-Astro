function goSearch(value: string): void {
  const word = value.trim();
  if (!word) return;
  location.href = "/search/?q=" + encodeURIComponent(word);
}

/** Bind navbar mobile drawer, dropdown menus, and smooth-expanding desktop/sidebar search bars. */
export function bindNavbar(signal?: AbortSignal): void {
  const collapse = document.getElementById("navbar_global");

  // Mobile collapse drawer toggles & backdrop mask.
  document.querySelectorAll<HTMLElement>("[data-target='#navbar_global']").forEach((button) => {
    button.addEventListener("click", () => collapse?.classList.toggle("show"), { signal });
  });

  // Auto-close mobile nav menu when clicking a navigation link.
  collapse?.querySelectorAll<HTMLAnchorElement>(".navbar-nav a[href]:not([no-pjax]):not([href^='#'])").forEach((link) => {
    link.addEventListener(
      "click",
      () => {
        collapse.classList.remove("show");
      },
      { signal },
    );
  });

  // Desktop dropdown toggles.
  document.querySelectorAll<HTMLElement>(".dropdown > .nav-link").forEach((link) => {
    link.addEventListener(
      "click",
      (event) => {
        if (window.matchMedia("(max-width: 991px)").matches) return;
        event.preventDefault();
        link.parentElement?.classList.toggle("show");
        link.nextElementSibling?.classList.toggle("show");
      },
      { signal },
    );
  });

  document.querySelectorAll<HTMLElement>(".dropdown-group-toggle").forEach((link) => {
    link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        link.parentElement?.classList.toggle("open");
      },
      { signal },
    );
  });

  // Desktop top-bar expandable search (0 -> 200px via .open class).
  const navSearchContainer = document.getElementById("navbar_search_input_container");
  const navSearchInput = document.getElementById("navbar_search_input") as HTMLInputElement | null;
  if (navSearchContainer && navSearchInput) {
    navSearchContainer.addEventListener(
      "click",
      () => {
        navSearchContainer.classList.add("open");
        navSearchInput.focus();
      },
      { signal },
    );
    navSearchInput.addEventListener(
      "focus",
      () => {
        navSearchContainer.classList.add("open");
      },
      { signal },
    );
    navSearchInput.addEventListener(
      "blur",
      () => {
        navSearchContainer.classList.remove("open");
      },
      { signal },
    );
    navSearchInput.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") return;
        const word = navSearchInput.value.trim();
        if (!word) {
          navSearchInput.blur();
          return;
        }
        goSearch(word);
      },
      { signal },
    );
  }

  // Mobile search input inside collapsed menu.
  const mobileSearchInput = document.getElementById("navbar_search_input_mobile") as HTMLInputElement | null;
  mobileSearchInput?.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter") return;
      collapse?.classList.remove("show");
      goSearch(mobileSearchInput.value);
    },
    { signal },
  );

  // Sidebar expandable search button (30px -> 45px via .leftbar-search-button.open).
  const leftbarSearchWrap = document.querySelector<HTMLElement>(".leftbar-search-button");
  const leftbarSearchContainer = document.getElementById("leftbar_search_container");
  const leftbarSearchInput = document.getElementById("leftbar_search_input") as HTMLInputElement | null;
  if (leftbarSearchWrap && leftbarSearchContainer && leftbarSearchInput) {
    leftbarSearchInput.readOnly = true;

    leftbarSearchContainer.addEventListener(
      "click",
      (event) => {
        event.stopPropagation();
        leftbarSearchWrap.classList.add("open");
        leftbarSearchInput.readOnly = false;
        leftbarSearchInput.focus();
        leftbarSearchInput.select();
      },
      { signal },
    );
    leftbarSearchInput.addEventListener(
      "blur",
      () => {
        leftbarSearchWrap.classList.remove("open");
        leftbarSearchInput.readOnly = true;
      },
      { signal },
    );
    leftbarSearchInput.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") return;
        const word = leftbarSearchInput.value.trim();
        if (!word) {
          leftbarSearchInput.blur();
          return;
        }
        document.documentElement.classList.remove("leftbar-opened");
        goSearch(word);
      },
      { signal },
    );
  }
}
