export function activeHeadingIndex(offsets, scrollY, top = 80) {
  const y = Number(scrollY) + top;
  let index = -1;
  offsets.forEach((offset, i) => {
    if (offset <= y) index = i;
  });
  return index;
}
