// Render admin-authored rich fragments (sidebar announcement, after-post note)
// where Markdown syntax and raw HTML coexist seamlessly.

function escapeAttr(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeCode(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeHref(url) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "#";
  if (/^(?:https?:|mailto:|\/|#|\.\.?\/)/i.test(trimmed)) return escapeAttr(trimmed);
  return "#";
}

function slug(text) {
  return String(text ?? "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "");
}

const RAW_BLOCK_START_RE = /^<(?:!--|\/?(?:div|section|article|aside|header|footer|nav|p|table|thead|tbody|tfoot|tr|th|td|ul|ol|li|dl|dt|dd|figure|figcaption|blockquote|pre|hr|details|summary|style|script|iframe|svg|form|center|h[1-6])(?:\s|>|\/|$))/i;
const RAW_PASSTHROUGH_OPEN_RE = /^<(script|style|pre)\b[^>]*>/i;

function renderInlineRich(text) {
  const slots = [];
  const hold = (html) => {
    const token = `@@RICH_SLOT_${slots.length}@@`;
    slots.push(html);
    return token;
  };

  let out = String(text ?? "");

  // 1. Protect inline code spans first so neither HTML nor Markdown runs inside backticks.
  out = out.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${escapeCode(code)}</code>`));

  // 2. Protect raw HTML comments and inline/opening/closing HTML tags untouched.
  out = out.replace(/<!--[\s\S]*?-->|<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s+(?:"[^"]*"|'[^']*'|[^"'<>])*)?\/?>/g, (tag) => hold(tag));

  // 3. Images ![alt](src "title")
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
    const t = title ? ` title="${escapeAttr(title)}"` : "";
    return hold(`<img src="${safeHref(src)}" alt="${escapeAttr(alt)}"${t} loading="lazy" />`);
  });

  // 4. Links [label](href)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    return hold(`<a href="${safeHref(href)}">${label}</a>`);
  });

  // 5. Bold + italic, bold, italic, strikethrough
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/\*\*([^*]+)\*\*\*/g, "<strong>$1</strong>*");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  out = out.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");

  // Restore protected slots (expand nested slots in reverse order if links wrapped tags).
  for (let pass = 0; pass < 3 && out.includes("@@RICH_SLOT_"); pass += 1) {
    out = out.replace(/@@RICH_SLOT_(\d+)@@/g, (_, idx) => slots[Number(idx)] ?? "");
  }
  return out;
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line) {
  if (!line || !line.includes("|")) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c));
}

function renderRichProse(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Raw passthrough blocks (<script>, <style>, <pre>) stay verbatim.
    const rawOpen = RAW_PASSTHROUGH_OPEN_RE.exec(trimmed);
    if (rawOpen) {
      const tag = rawOpen[1].toLowerCase();
      const closeRe = new RegExp(`</${tag}\\s*>`, "i");
      const rawLines = [];
      while (i < lines.length) {
        rawLines.push(lines[i]);
        const hitClose = closeRe.test(lines[i]);
        i += 1;
        if (hitClose) break;
      }
      html += rawLines.join("\n");
      continue;
    }

    // Raw HTML block lines (e.g. <div>, <p>, <hr>, <!-- ... -->):
    // do not wrap in <p>, while still rendering inline Markdown outside tags.
    if (RAW_BLOCK_START_RE.test(trimmed)) {
      const blockLines = [];
      while (i < lines.length && lines[i].trim()) {
        blockLines.push(renderInlineRich(lines[i]));
        i += 1;
      }
      html += blockLines.join("\n");
      continue;
    }

    // Horizontal rule
    if (/^(?:---+|\*\*\*+|___+)$/.test(trimmed)) {
      html += "<hr />";
      i += 1;
      continue;
    }

    // Headings
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].replace(/\s+#+\s*$/, "");
      html += `<h${level} id="${slug(text)}">${renderInlineRich(text)}</h${level}>`;
      i += 1;
      continue;
    }

    // GFM Table
    if (trimmed.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      const thead = "<thead><tr>" + headers.map((h) => `<th>${renderInlineRich(h)}</th>`).join("") + "</tr></thead>";
      const tbody = rows.length
        ? "<tbody>" + rows.map((r) => "<tr>" + headers.map((_, col) => `<td>${renderInlineRich(r[col] ?? "")}</td>`).join("") + "</tr>").join("") + "</tbody>"
        : "";
      html += `<table>${thead}${tbody}</table>`;
      continue;
    }

    // Blockquote
    if (/^>\s?/.test(trimmed)) {
      const quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      html += `<blockquote>${renderRichProse(quoteLines.join("\n"))}</blockquote>`;
      continue;
    }

    // Unordered list (including task list items)
    if (/^[-*+]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const body = lines[i].trim().replace(/^[-*+]\s+/, "");
        const task = /^\[([ xX])\]\s+(.*)$/.exec(body);
        if (task) {
          const checked = task[1].toLowerCase() === "x" ? " checked" : "";
          items.push(`<li class="task-list-item"><input type="checkbox" disabled${checked} /> ${renderInlineRich(task[2])}</li>`);
        } else {
          items.push(`<li>${renderInlineRich(body)}</li>`);
        }
        i += 1;
      }
      html += `<ul>${items.join("")}</ul>`;
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const body = lines[i].trim().replace(/^\d+\.\s+/, "");
        items.push(`<li>${renderInlineRich(body)}</li>`);
        i += 1;
      }
      html += `<ol>${items.join("")}</ol>`;
      continue;
    }

    // Paragraph: preserve single line breaks as <br /> unless the line already ends with <br>.
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !RAW_BLOCK_START_RE.test(lines[i].trim()) &&
      !RAW_PASSTHROUGH_OPEN_RE.test(lines[i].trim()) &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^(?:---+|\*\*\*+|___+)$/.test(lines[i].trim()) &&
      !/^>\s?/.test(lines[i].trim()) &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1]))
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    const joined = para
      .map((pLine, idx) => {
        const rendered = renderInlineRich(pLine);
        if (idx === para.length - 1 || /<br\s*\/?>$/i.test(pLine)) return rendered;
        return `${rendered}<br />`;
      })
      .join("");
    html += `<p>${joined}</p>`;
  }

  return html;
}

export function renderRichMarkdown(source) {
  const raw = String(source ?? "").trim();
  if (!raw) return "";
  const normalized = raw.replace(/\r\n/g, "\n");
  const blocks = normalized.split("```");
  let html = "";
  blocks.forEach((block, index) => {
    if (index % 2 === 1) {
      const nl = block.indexOf("\n");
      const langRaw = nl === -1 ? "" : block.slice(0, nl).trim();
      const lang = /^[a-zA-Z0-9_+-]+$/.test(langRaw) ? langRaw.toLowerCase() : "";
      const code = (nl === -1 ? block : block.slice(nl + 1)).replace(/\r?\n$/, "");
      const cls = lang ? ` class="language-${lang}"` : "";
      html += `<pre class="line-numbers"><code${cls}>${escapeCode(code)}</code></pre>`;
      return;
    }
    html += renderRichProse(block);
  });
  return html;
}

export function renderAfterPost(template, { url = "", title = "", author = "" } = {}) {
  const raw = String(template ?? "").trim();
  if (!raw) return "";
  const href = safeHref(url);
  const safeTitle = escapeAttr(title);
  const safeAuthor = escapeAttr(author);
  const linkHtml = `<a href="${href}" target="_blank" rel="noopener">${href}</a>`;
  const expanded = raw
    .replace(/%link%/g, linkHtml)
    .replace(/%url%/g, href)
    .replace(/%title%/g, safeTitle)
    .replace(/%author%/g, safeAuthor);
  return renderRichMarkdown(expanded);
}
