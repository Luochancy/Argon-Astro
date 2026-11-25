const cjk = /[\u4e00-\u9fff]/;
const latin = /[A-Za-z0-9]/;

export function pangu(text) {
  const chars = Array.from(String(text || ""));
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const current = chars[i];
    const previous = chars[i - 1];
    if (previous && ((cjk.test(previous) && latin.test(current)) || (latin.test(previous) && cjk.test(current)))) {
      out += " ";
    }
    out += current;
  }
  return out;
}
