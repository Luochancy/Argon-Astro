export function catalogNumbers(levels, enabled) {
  if (!enabled) return levels.map(() => "");
  const counts = [0, 0, 0];
  return levels.map((level) => {
    const index = level === "h4" ? 2 : level === "h3" ? 1 : 0;
    counts[index] += 1;
    for (let i = index + 1; i < counts.length; i += 1) counts[i] = 0;
    return counts.slice(0, index + 1).filter((value) => value > 0).join(".") + " ";
  });
}
