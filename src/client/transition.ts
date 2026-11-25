/** Smooth PJAX article-entry and cross-page transition pacing for Astro ClientRouter. */
interface TransitionPreparationEvent extends Event {
  loader?: () => Promise<void>;
  to?: URL;
}

let listenerBound = false;
let pendingArticleEntry = false;
let enablePjaxTransition = true;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function randomDelayMs(minMs: number, maxMs: number): number {
  return minMs + Math.floor(Math.random() * Math.max(1, maxMs - minMs + 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Mark that the next PJAX swap originates from a post preview card so it plays the glide animation. */
export function markArticleEntryTransition(): void {
  pendingArticleEntry = true;
}

/**
 * Pace Astro ClientRouter swaps with a short randomized minimum wait (running in parallel with
 * the actual HTML fetch) so static pages still show Argon's card-into-article glide and fade
 * instead of snapping abruptly in <15ms.
 */
export function bindPageTransition(enabled: boolean): void {
  enablePjaxTransition = enabled;
  if (listenerBound) return;
  listenerBound = true;

  document.addEventListener("astro:before-preparation", (rawEvent) => {
    const event = rawEvent as TransitionPreparationEvent;
    const isArticle = pendingArticleEntry;
    pendingArticleEntry = false;

    if (!enablePjaxTransition || prefersReducedMotion() || typeof event.loader !== "function") {
      return;
    }

    const originalLoader = event.loader;
    const isPostRoute = Boolean(event.to?.pathname?.startsWith("/posts/"));
    const waitMs = isArticle || isPostRoute
      ? randomDelayMs(280, 420)
      : randomDelayMs(110, 180);

    // Run minimum visual transition hold in parallel with the actual page fetch.
    event.loader = async () => {
      await Promise.all([originalLoader(), sleep(waitMs)]);
    };
  });
}
