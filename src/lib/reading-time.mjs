function codeLines(html) {
  const blocks = String(html || "").match(/<(?:pre|code)[\s\S]*?<\/(?:pre|code)>/gi) || [];
  return blocks.reduce((total, block) => {
    const text = block.replace(/<[^>]+>/g, "");
    return total + text.split(/\r\n|\n|\r/).filter((line) => line.trim()).length;
  }, 0);
}

export function countWords(html) {
  const code = codeLines(html);
  const text = String(html || "")
    .replace(/<(?:pre|code|style|script)[\s\S]*?<\/(?:pre|code|style|script)>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (text.replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9_]+/g) || []).length;
  return { cn, en, code };
}

export function wordCount(html) {
  const words = countWords(html);
  return {
    ...words,
    total: words.cn + words.en + words.code,
  };
}

export function readingTime(html, speeds = { cn: 300, en: 160, code: 20 }) {
  const words = countWords(html);
  const minutes = words.cn / speeds.cn + words.en / speeds.en + words.code / speeds.code;
  if (minutes < 0.3) return "几秒读完";
  if (minutes < 1) return "1 分钟内";
  if (minutes < 60) return Math.ceil(minutes) + " 分钟";
  return Math.round(minutes / 60 * 10) / 10 + " 小时";
}
