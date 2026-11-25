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

  const paint = (word: string) => {
    results.replaceChildren();
    for (const entry of filterSearch(entries, word, selected())) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = entry.href;
      link.textContent = entry.title;
      item.appendChild(link);
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
