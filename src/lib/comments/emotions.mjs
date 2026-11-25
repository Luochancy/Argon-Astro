export const emotionGroups = [
  {
    name: "颜文字",
    items: [
      { type: "text", text: "(☆ω☆)" },
      { type: "text", text: "╮(╯▽╰)╭" },
      { type: "text", text: "（╯‵□′）╯︵┴─┴" },
    ],
  },
  {
    name: "Emoji",
    items: [
      { type: "text", text: "😀" },
      { type: "text", text: "😅" },
    ],
  },
  {
    name: "贴纸",
    items: [
      { type: "sticker", code: "smile", src: "/argon/emotions/smile.svg", title: "微笑" },
    ],
  },
];

function esc(text) {
  return String(text ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderEmotionKeyboard(groups = emotionGroups) {
  const panes = groups.map((group, index) => {
    const items = group.items.map((item) => {
      if (item.type === "sticker") {
        return "<div class=\"emotion-item emotion-item-sticker\" code=\"" + esc(item.code) + "\" title=\"" + esc(item.title || "") + "\"><img src=\"" + esc(item.src) + "\" alt=\"" + esc(item.title || item.code) + "\"></div>";
      }
      return "<div class=\"emotion-item\" text=\"" + esc(item.text) + "\">" + esc(item.text) + "</div>";
    }).join("");
    return "<div class=\"emotion-group" + (index === 0 ? "" : " d-none") + "\" index=\"" + index + "\">" + items + "</div>";
  }).join("");
  const tabs = groups.map((group, index) => "<button type=\"button\" class=\"emotion-group-name" + (index === 0 ? " active" : "") + "\" data-index=\"" + index + "\">" + esc(group.name) + "</button>").join("");
  return "<div id=\"emotion_keyboard\" class=\"emotion-keyboard card shadow-sm bg-white\"><div class=\"emotion-keyboard-content\">" + panes + "</div><div class=\"emotion-keyboard-bar\">" + tabs + "</div></div>";
}

export function replaceStickers(text, groups = emotionGroups) {
  let next = String(text || "");
  for (const group of groups) {
    for (const item of group.items) {
      if (item.type !== "sticker") continue;
      next = next.split(":" + item.code + ":").join("<img class=\"comment-sticker\" src=\"" + esc(item.src) + "\" alt=\"" + esc(item.title || item.code) + "\">");
    }
  }
  return next;
}

export function insertEmotion(value, start, end, token) {
  const text = String(value || "");
  const from = Math.max(0, Math.min(start, text.length));
  const to = Math.max(from, Math.min(end, text.length));
  const next = text.slice(0, from) + token + text.slice(to);
  return { value: next, caret: from + token.length };
}
