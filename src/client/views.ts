/** Sync and increment live WordPress post view counts through the private /api/views proxy. */
export function bindViews(mode: "local" | "private", signal?: AbortSignal): void {
  if (mode !== "private") return;
  const article = document.querySelector<HTMLElement>("article.post-full[data-wp-id]");
  const wpId = Number(article?.dataset.wpId || 0);
  if (!wpId) return;

  const targets = [...document.querySelectorAll<HTMLElement>(`[data-views-post-id="${wpId}"]`)];
  const sessionKey = `Argon_Viewed_${wpId}`;
  const alreadyViewed = (() => {
    try { return sessionStorage.getItem(sessionKey) === "1"; } catch { return false; }
  })();

  const updateNodes = (views: number) => {
    targets.forEach((el) => { el.textContent = String(views); });
  };

  void (async () => {
    try {
      const response = alreadyViewed
        ? await fetch(`/api/views?id=${wpId}`, { headers: { accept: "application/json" }, signal })
        : await fetch("/api/views", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: wpId }),
            signal,
          });
      if (!response.ok) return;
      const data = (await response.json()) as { views?: number };
      if (typeof data.views === "number") {
        updateNodes(data.views);
        if (!alreadyViewed) {
          try { sessionStorage.setItem(sessionKey, "1"); } catch { /* ignore */ }
        }
      }
    } catch {
      // Ignore network/abort errors; static view count remains visible.
    }
  })();
}
