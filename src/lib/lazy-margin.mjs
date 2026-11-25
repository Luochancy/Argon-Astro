export function lazyloadMargin(threshold) {
  const value = Number(threshold);
  const px = Number.isFinite(value) && value >= 0 && value <= 5000 ? value : 800;
  return px + "px";
}

export function compareRelated(left, right, orderBy, order) {
  const direction = order === "asc" ? 1 : -1;
  if (orderBy === "title") return left.title.localeCompare(right.title) * direction;
  return (left.time - right.time) * direction;
}
