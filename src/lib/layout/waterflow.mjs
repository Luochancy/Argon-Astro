export function columnCount(mode, width, itemCount) {
  let columns = 1;
  if (mode === "1" || !mode) return 1;
  if (mode === "2and3" || mode === "2,3") columns = width > 1000 ? 3 : 2;
  else columns = Number.parseInt(mode, 10) || 1;
  if (width < 650 && columns === 2) columns = 1;
  if (width < 800 && columns === 3) columns = 1;
  return Math.max(1, Math.min(columns, itemCount || 1));
}

export function placeItems(heights, columns) {
  const slots = Array.from({ length: columns }, () => 0);
  return heights.map((height) => {
    let index = 0;
    for (let i = 1; i < columns; i += 1) {
      if (slots[i] < slots[index]) index = i;
    }
    const top = slots[index];
    slots[index] += height;
    return { index, top, width: "calc(" + (100 / columns) + "% - " + (10 * (columns - 1) / columns) + "px)" };
  });
}
