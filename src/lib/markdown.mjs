function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeHref(url) {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return "#";
  if (/^(?:https?:|mailto:|\/|#|\.\.?\/)/i.test(trimmed)) return escapeHtml(trimmed);
  return "#";
}

function slug(text) {
  return String(text ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u4e00-\u9fff-]/g, "");
}

function renderInline(text) {
  const slots = [];
  const hold = (html) => {
    const token = `@@MD_INLINE_${slots.length}@@`;
    slots.push(html);
    return token;
  };

  let out = String(text ?? "");
  // Protect inline code first so markdown syntax inside code spans is untouched.
  out = out.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${escapeHtml(code)}</code>`));
  // Escape remaining raw HTML.
  out = escapeHtml(out);
  // Images ![alt](src)
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;([^&]*)&quot;)?\)/g, (_, alt, src, title) => {
    const t = title ? ` title="${title}"` : "";
    return hold(`<img src="${safeHref(src)}" alt="${alt}"${t} loading="lazy" />`);
  });
  // Links [label](href)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    return hold(`<a href="${safeHref(href)}">${label}</a>`);
  });
  // Bold + italic, bold, italic, strikethrough
  out = out.replace(/\*\*\*([^*]+)\*\*\*/g, "<strong><em>$1</em></strong>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  out = out.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>");
  out = out.replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");

  return out.replace(/@@MD_INLINE_(\d+)@@/g, (_, idx) => slots[Number(idx)] ?? "");
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

function renderProse(source) {
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
      html += `<h${level} id="${slug(text)}">${renderInline(text)}</h${level}>`;
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
      const thead = "<thead><tr>" + headers.map((h) => `<th>${renderInline(h)}</th>`).join("") + "</tr></thead>";
      const tbody = rows.length
        ? "<tbody>" + rows.map((r) => "<tr>" + headers.map((_, col) => `<td>${renderInline(r[col] ?? "")}</td>`).join("") + "</tr>").join("") + "</tbody>"
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
      html += `<blockquote>${renderProse(quoteLines.join("\n"))}</blockquote>`;
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
          items.push(`<li class="task-list-item"><input type="checkbox" disabled${checked} /> ${renderInline(task[2])}</li>`);
        } else {
          items.push(`<li>${renderInline(body)}</li>`);
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
        items.push(`<li>${renderInline(body)}</li>`);
        i += 1;
      }
      html += `<ol>${items.join("")}</ol>`;
      continue;
    }

    // Paragraph (merge consecutive plain lines)
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
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
    html += `<p>${renderInline(para.join(" "))}</p>`;
  }

  return html;
}

export function renderMarkdown(source) {
  const normalized = String(source ?? "").replace(/\r\n/g, "\n");
  const blocks = normalized.split("```");
  let html = "";
  blocks.forEach((block, index) => {
    if (index % 2 === 1) {
      const nl = block.indexOf("\n");
      const langRaw = nl === -1 ? "" : block.slice(0, nl).trim();
      const lang = /^[a-zA-Z0-9_+-]+$/.test(langRaw) ? langRaw.toLowerCase() : "";
      const code = (nl === -1 ? block : block.slice(nl + 1)).replace(/\r?\n$/, "");
      const cls = lang ? ` class="language-${lang}"` : "";
      html += `<pre class="line-numbers"><code${cls}>${escapeHtml(code)}</code></pre>`;
      return;
    }
    html += renderProse(block);
  });
  return html;
}
