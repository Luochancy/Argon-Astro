export function zoomifyTransform(scale, zoomed) {
  const value = Number(scale);
  const safe = Number.isFinite(value) && value > 0 && value < 2 ? value : 0.9;
  return zoomed ? "scale(" + safe + ")" : "none";
}
