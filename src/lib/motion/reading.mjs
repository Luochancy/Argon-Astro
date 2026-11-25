export function readingPercent(scrollTop, scrollHeight, clientHeight) {
  const max = Math.max(1, scrollHeight - clientHeight);
  const value = Math.round((Number(scrollTop) / max) * 100);
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
