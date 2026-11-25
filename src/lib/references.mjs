function clean(content) {
  return String(content || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/wp-json|admin-ajax\.php/gi, "")
    .replace(/<(?!\/?(?:a|em|strong|b|br|sup|sub|small)\b)[^>]*>/gi, "");
}

export function applyReferences(source, title = "参考") {
  const refs = [];
  const keys = new Map();
  const html = String(source || "").replace(/\[ref(?:\s+id=([^\s\]]+))?\]([\s\S]*?)\[\/ref\]/g, (_, id, content) => {
    const text = clean(content);
    const key = id || text;
    let index = keys.get(key);
    if (index == null) {
      index = refs.length;
      refs.push({ content: text, count: 0 });
      keys.set(key, index);
    }
    refs[index].count += 1;
    const number = index + 1;
    return "<sup class=\"reference\" id=\"ref_" + number + "_" + refs[index].count + "\"><a class=\"reference-link\" href=\"#ref_" + number + "\">[" + number + "]</a></sup>";
  });
  if (!refs.length) return { html, list: "" };
  const heading = String(title || "参考").replace(/[<>]/g, "");
  const items = refs.map((ref, index) => {
    const number = index + 1;
    let back = "<a class=\"reference-list-backlink\" href=\"#ref_" + number + "_1\">^</a>";
    if (ref.count > 1) {
      back = "<span class=\"reference-list-backlink\">^</span>";
      for (let i = 1; i <= ref.count; i += 1) {
        const letter = String.fromCharCode(96 + i);
        back += "<sup><a class=\"reference-list-backlink\" href=\"#ref_" + number + "_" + i + "\">" + letter + "</a></sup>";
      }
    }
    return "<li id=\"ref_" + number + "\">" + back + "<span>" + ref.content + "</span></li>";
  }).join("");
  return {
    html,
    list: "<div class=\"reference-list-container\"><h3>" + heading + "</h3><ol class=\"reference-list\">" + items + "</ol></div>",
  };
}
