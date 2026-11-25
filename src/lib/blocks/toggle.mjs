export function toggleCollapse(collapsed) {
  const next = !collapsed;
  return { collapsed: next, expanded: String(!next), hidden: next };
}
