export function qqNumber(value) {
  const text = String(value || "").trim();
  return /^[1-9][0-9]{4,10}$/.test(text) ? text : "";
}

export function qqAvatarUrl(value) {
  const qq = qqNumber(value);
  return qq ? "https://q1.qlogo.cn/g?b=qq&s=640&nk=" + qq : "";
}

export function pageComments(items, page, perPage) {
  const size = Math.max(1, Number(perPage) || 10);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(pages, Math.max(1, Number(page) || 1));
  const start = (current - 1) * size;
  return { page: current, pages, items: items.slice(start, start + size) };
}
