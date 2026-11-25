const allowed = ["post", "page", "shuoshuo"];

export function enabledSearchKinds(kinds) {
  const selected = (Array.isArray(kinds) && kinds.length ? kinds : allowed).filter((kind) => allowed.includes(kind));
  return selected.length ? selected : ["post"];
}
