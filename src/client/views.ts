/** Sync and increment live WordPress post view counts through the private /api/views proxy. */
export function bindViews(mode: "local" | "private", signal?: AbortSignal): void {
  if (mode !== "private") return;

  const article = document.querySelector<HTMLElement>("article.post-full[data-wp-id]");
  const activeWpId = Number(article?.dataset.wpId || 0);

  if (activeWpId > 0) {
    const targets = [...document.querySelectorAll<HTMLElement>(`[data-views-post-id="${activeWpId}"]`)];
    const sessionKey = `Argon_Viewed_${activeWpId}`;
    const alreadyViewed = (() => {
      try { return sessionStorage.getItem(sessionKey) === "1"; } catch { return false; }
    })();

    void (async () => {
      try {
        const response = alreadyViewed
          ? await fetch(`/api/views?id=${activeWpId}`, { headers: { accept: "application/json" }, signal })
          : await fetch("/api/views", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ id: activeWpId }),
              signal,
            });
        if (!response.ok) return;
        const data = (await response.json()) as { views?: number };
        if (typeof data.views === "number") {
          targets.forEach((el) => { el.textContent = String(data.views); });
          if (!alreadyViewed) {
            try { sessionStorage.setItem(sessionKey, "1"); } catch { /* ignore */ }
          }
        }
      } catch {
        // Ignore network/abort errors; static view count remains visible.
      }
    })();
  }

  // Batch-hydrate view counts for list cards (homepage, archives, tags, categories).
  const listNodes = [...document.querySelectorAll<HTMLElement>("[data-views-post-id]")].filter((el) => {
    const id = Number(el.dataset.viewsPostId || 0);
    return id > 0 && id !== activeWpId;
  });
  const uniqueIds = [...new Set(listNodes.map((el) => el.dataset.viewsPostId || "").filter(Boolean))].slice(0, 50);
  if (!uniqueIds.length) return;

  void (async () => {
    try {
      const response = await fetch(`/api/views?ids=${uniqueIds.join(",")}`, {
        headers: { accept: "application/json" },
        signal,
      });
      if (!response.ok) return;
      const data = (await response.json()) as { views?: Record<string, number> };
      if (!data.views) return;
      for (const node of listNodes) {
        const key = node.dataset.viewsPostId || "";
        if (key && typeof data.views[key] === "number") {
          node.textContent = String(data.views[key]);
        }
      }
    } catch {
      // Ignore network/abort errors; static view counts remain visible.
    }
  })();
}
