import { bindAgentTools } from "./agent-tools";
import { bindBanner } from "./banner";
import { bindBlocks } from "./blocks";
import { bindCatalog } from "./catalog";
import { bindComments } from "./comments";
import { bindDarkmode } from "./darkmode";
import { bindDonate } from "./donate";
import { bindFab } from "./fab";
import { bindFold } from "./fold";
import { bindGithubCards } from "./github-cards";
import { bindHeadroom } from "./headroom";
import { bindHighlight } from "./highlight";
import { bindLazyload } from "./lazyload";
import { bindLightbox } from "./lightbox";
import { bindMath } from "./math";
import { bindNavbar } from "./navbar";
import { bindNProgress, preserveNProgressOnSwap } from "./nprogress";
import { bindPasswordPost } from "./password-post";
import { bindReadingProgress } from "./reading";
import { bindSearch } from "./search";
import { bindShare } from "./share";
import { bindSidebar } from "./sidebar";
import { bindPageTransition, markArticleEntryTransition } from "./transition";
import { bindUpvote } from "./upvote";
import { bindViews } from "./views";
import { bindWaterflow } from "./waterflow";
import { bindZoomify } from "./zoomify";
import type { ClientConfig } from "./types";

const PRESERVED_ROOT_CLASSES = [
  "darkmode",
  "amoled-dark",
  "use-serif",
  "use-big-shadow",
  "use-small-shadow",
  "filter-sunset",
  "filter-darkness",
  "filter-grayscale",
  "themecolor-toodark",
] as const;

const PRESERVED_ROOT_VARS = [
  "--themecolor",
  "--themecolor-R",
  "--themecolor-G",
  "--themecolor-B",
  "--themecolor-H",
  "--themecolor-S",
  "--themecolor-L",
  "--card-radius",
] as const;

let pageController: AbortController | null = null;

/** Preserve live root theme classes and CSS variables across Astro ClientRouter swaps. */
export function preserveRootStateOnSwap(event: Event): void {
  const nextDoc = (event as Event & { newDocument?: Document }).newDocument;
  if (!nextDoc) return;

  const currentRoot = document.documentElement;
  const nextRoot = nextDoc.documentElement;
  nextRoot.classList.remove("no-js");

  for (const cls of PRESERVED_ROOT_CLASSES) {
    nextRoot.classList.toggle(cls, currentRoot.classList.contains(cls));
  }

  for (const prop of PRESERVED_ROOT_VARS) {
    const val = currentRoot.style.getPropertyValue(prop);
    if (val) {
      nextRoot.style.setProperty(prop, val);
    }
  }

  const liveColor = currentRoot.style.getPropertyValue("--themecolor").trim();
  if (liveColor) {
    nextDoc.querySelector('meta[name="theme-color"]')?.setAttribute("content", liveColor);
  }

  const currentFab = document.getElementById("float_action_buttons");
  const nextFab = nextDoc.getElementById("float_action_buttons");
  if (currentFab && nextFab) {
    nextFab.classList.toggle("fabtns-float-left", currentFab.classList.contains("fabtns-float-left"));
  }

  preserveNProgressOnSwap(nextDoc);
}

/** Smoothly animate the clicked post card upward while fading sibling cards during navigation. */
function bindIntoArticleAnimation(signal?: AbortSignal): void {
  document.querySelectorAll<HTMLAnchorElement>(".post-preview a.post-title").forEach((link) => {
    if (link.dataset.intoAnimBound === "true") return;
    link.dataset.intoAnimBound = "true";

    link.addEventListener(
      "click",
      (event) => {
        if (event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const card = link.closest<HTMLElement>("article.post-preview");
        const main = document.getElementById("main");
        if (!card || !main || card.classList.contains("post-pjax-loading")) return;

        const waterflowOn = main.classList.contains("waterflow");
        if (waterflowOn) {
          card.style.transition = "all 0.5s ease";
        }

        if (!card.querySelector(".loading-css-animation")) {
          const loader = document.createElement("div");
          loader.className = "loading-css-animation";
          loader.innerHTML = Array.from({ length: 8 }, (_, idx) => `<div class="loading-dot loading-dot-${idx + 1}"></div>`).join("");
          card.appendChild(loader);
        }

        const cardRect = card.getBoundingClientRect();
        const mainRect = main.getBoundingClientRect();
        let offsetTop = cardRect.top - mainRect.top;
        if (
          document.documentElement.classList.contains("is-home") &&
          document.documentElement.classList.contains("banner-as-cover")
        ) {
          offsetTop = cardRect.top + window.scrollY - window.outerHeight * 0.418;
        }

        card.classList.add("post-pjax-loading");
        main.classList.add("post-list-pjax-loading");
        markArticleEntryTransition();
        card.style.transform = `translateY(-${Math.max(0, Math.round(offsetTop))}px)`;
        if (waterflowOn) {
          card.style.left = "10px";
          card.style.width = "calc(100% - 20px)";
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      { signal },
    );
  });
}

/** Initialize or re-bind all client interactions for the current document. */
export function boot(config: ClientConfig): void {
  // Guard against duplicate immediate boot when initial script and astro:page-load fire back-to-back.
  if (document.body.dataset.argonBooted === "true") return;
  document.body.dataset.argonBooted = "true";

  // Tear down listeners from the previous PJAX page before binding the new DOM.
  pageController?.abort();
  pageController = new AbortController();
  const { signal } = pageController;

  bindNProgress();
  bindPageTransition(config.motion.pjax && config.motion.pjaxAnimation);
  bindDarkmode(config.appearance.darkmode, config.appearance.amoledDark, signal);
  bindNavbar(signal);
  bindSidebar(signal);
  bindFab(config, signal);
  bindCatalog(signal);
  bindSearch(signal);
  bindShare(signal);
  bindDonate(signal);
  bindBlocks(signal);
  bindHeadroom(config.toolbar.headroom, config.toolbar.blur, signal);
  bindReadingProgress(config.motion.readingProgress, signal);
  bindLazyload(
    config.motion.lazyload,
    config.motion.lazyloadThreshold,
    config.motion.lazyloadEffect,
    config.motion.lazyloadLoadingStyle,
    signal,
  );
  bindWaterflow(config.motion.waterflow, signal);
  bindIntoArticleAnimation(signal);

  // Prevent lightbox and zoomify from fighting over the same article images.
  if (config.motion.fancybox) {
    bindLightbox(signal);
  } else if (config.motion.zoomify) {
    bindZoomify(
      true,
      config.motion.zoomifyScale,
      config.motion.zoomifyDuration,
      config.motion.zoomifyEasing,
      signal,
    );
  }

  void bindHighlight(
    {
      enable: config.motion.codeHighlight,
      hideLineNumber: config.motion.codeHideLineNumber,
      breakLine: config.motion.codeBreakLine,
      transparentLineNumber: config.motion.codeTransparentLineNumber,
      theme: config.motion.codeTheme,
    },
    signal,
  );

  bindUpvote(config.upvote.mode, signal);
  bindViews(config.upvote.mode, signal);
  bindGithubCards(signal);
  bindAgentTools(config.agent, signal);
  bindFold(config.motion.foldLongComments, config.motion.foldLongShuoshuo, signal);
  bindBanner(config.banner.typing, config.banner.typingInterval, signal);

  bindPasswordPost(() => {
    bindBlocks(signal);
    bindCatalog(signal);
    bindGithubCards(signal);
    if (config.motion.fancybox) bindLightbox(signal);
    void bindHighlight(
      {
        enable: config.motion.codeHighlight,
        hideLineNumber: config.motion.codeHideLineNumber,
        breakLine: config.motion.codeBreakLine,
        transparentLineNumber: config.motion.codeTransparentLineNumber,
        theme: config.motion.codeTheme,
      },
      signal,
    );
    bindMath(config.motion.math);
  }, signal);

  if (config.comments.provider === "wordpress") {
    bindComments(config.comments, signal, config.motion.foldLongComments);
  }
  bindMath(config.motion.math);
}
