import { filterSearch } from "../lib/search/filter.mjs";

export function bindSearch(signal?: AbortSignal): void {
  const input = document.getElementById("local-search-input") as HTMLInputElement | null;
  const results = document.getElementById("local-search-results");
  const dataNode = document.getElementById("search-index");
  if (!input || !results || !dataNode?.textContent) return;
  if (input.dataset.bound === "true") return;
  input.dataset.bound = "true";

  const entries = JSON.parse(dataNode.textContent) as { title: string; href: string; text: string; kind: string }[];
  const selected = () =>
    [...document.querySelectorAll<HTMLInputElement>("[data-search-kind]:checked")].map(
      (node) => node.dataset.searchKind || "",
    );

  const snippetFor = (text: string, word: string) => {
    const clean = String(text || "").trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    const pos = word ? lower.indexOf(word.toLowerCase().trim()) : -1;
    if (pos < 0) return clean.slice(0, 120) + (clean.length > 120 ? "…" : "");
    const start = Math.max(0, pos - 30);
    const end = Math.min(clean.length, pos + word.length + 90);
    return (start > 0 ? "…" : "") + clean.slice(start, end) + (end < clean.length ? "…" : "");
  };

  const paint = (word: string) => {
    results.replaceChildren();
    for (const entry of filterSearch(entries, word, selected())) {
      const item = document.createElement("li");
      item.className = "mb-2";
      const link = document.createElement("a");
      link.href = entry.href;
      link.textContent = entry.title;
      item.appendChild(link);
      const excerpt = snippetFor(entry.text, word);
      if (excerpt) {
        const p = document.createElement("div");
        p.className = "small text-muted";
        p.textContent = excerpt;
        item.appendChild(p);
      }
      results.appendChild(item);
    }
  };

  const params = new URLSearchParams(location.search);
  if (params.get("q")) {
    input.value = params.get("q") ?? "";
    paint(input.value);
  }

  input.addEventListener("input", () => paint(input.value), { signal });
  document.querySelectorAll<HTMLElement>("[data-search-kind]").forEach((node) => {
    node.addEventListener("change", () => paint(input.value), { signal });
  });
}
