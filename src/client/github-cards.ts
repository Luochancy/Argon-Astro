/** Hydrate Argon [github] cards via edge-cached /api/github with sessionStorage caching. */
export function bindGithubCards(signal?: AbortSignal): void {
  const cards = [...document.querySelectorAll<HTMLElement>(".github-info-card[data-author][data-project]")];
  for (const card of cards) {
    if (card.dataset.githubLoaded === "true") continue;
    const author = (card.dataset.author || "").trim();
    const project = (card.dataset.project || "").trim();
    if (!author || !project) continue;

    const descEl = card.querySelector<HTMLElement>(".github-info-card-description");
    const starsEl = card.querySelector<HTMLElement>(".github-info-card-stars");
    const forksEl = card.querySelector<HTMLElement>(".github-info-card-forks");
    if (starsEl?.textContent?.trim() && descEl?.textContent?.trim()) {
      card.dataset.githubLoaded = "true";
      continue;
    }
    card.dataset.githubLoaded = "true";

    const cacheKey = `Argon_GH_${author}/${project}`;
    const apply = (data: { description?: string; stars?: number; forks?: number }) => {
      if (descEl && data.description) descEl.textContent = data.description;
      if (starsEl && typeof data.stars === "number") starsEl.textContent = String(data.stars);
      if (forksEl && typeof data.forks === "number") forksEl.textContent = String(data.forks);
    };

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        apply(JSON.parse(cached) as { description?: string; stars?: number; forks?: number });
        continue;
      }
    } catch { /* ignore */ }

    void (async () => {
      try {
        const res = await fetch(`/api/github?author=${encodeURIComponent(author)}&project=${encodeURIComponent(project)}`, {
          headers: { accept: "application/json" },
          signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { description?: string; stars?: number; forks?: number };
        apply(data);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* ignore */ }
      } catch { /* ignore */ }
    })();
  }
}
