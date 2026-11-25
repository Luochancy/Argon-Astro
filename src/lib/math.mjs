import katex from "katex";

export function protectMath(source) {
  const slots = [];
  const next = String(source || "").replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (full, display, inline) => {
    const html = katex.renderToString(display || inline, { displayMode: Boolean(display), throwOnError: false });
    slots.push(html);
    return "%%MATH" + (slots.length - 1) + "%%";
  });
  return { source: next, slots };
}

export function restoreMath(html, slots) {
  return String(html || "").replace(/%%MATH(\d+)%%/g, (_, index) => slots[Number(index)] || "");
}
