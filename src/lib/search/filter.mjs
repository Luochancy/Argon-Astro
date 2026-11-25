export function filterSearch(entries, query, kinds) {
  const word = String(query || "").trim().toLowerCase();
  const allow = new Set(kinds && kinds.length ? kinds : ["post", "page", "shuoshuo"]);
  return entries.filter((entry) => {
    if (!allow.has(entry.kind || "post")) return false;
    if (!word) return false;
    return (entry.title + " " + (entry.text || "")).toLowerCase().includes(word);
  });
}
