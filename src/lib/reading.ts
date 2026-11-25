export function countWords(text: string, speeds: { zh: number; en: number; code: number }): { words: number; minutes: number } {
  const code = text.match(/```[\s\S]*?```/g)?.join(" ") ?? "";
  const prose = text.replace(/```[\s\S]*?```/g, " ");
  const zh = (prose.match(/[\u4e00-\u9fff]/g) ?? []).length;
  const en = (prose.match(/[A-Za-z0-9]+/g) ?? []).length;
  const codeUnits = code.length;
  const minutes = Math.max(1, Math.ceil(zh / speeds.zh + en / speeds.en + codeUnits / speeds.code));
  return { words: zh + en, minutes };
}

export function excerpt(text: string, limit: number): string {
  const plain = text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_\-`]{1,3}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= limit) return plain;
  return plain.slice(0, limit).trim() + "...";
}
