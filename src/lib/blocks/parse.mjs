function freeform(html) {
  return { name: "core/freeform", attrs: {}, innerHtml: html, innerBlocks: [] };
}

function normalizeName(namespace, block) {
  return ((namespace || "core/") + block).toLowerCase();
}

function parseOpen(comment) {
  const selfClosing = /\/\s*$/.test(comment);
  const body = comment.replace(/\/\s*$/, "").trim();
  const match = /^wp:([a-z0-9-]+\/)?([a-z0-9-]+)(?:\s+(\{[\s\S]*\}))?$/i.exec(body);
  if (!match) return null;
  const name = normalizeName(match[1], match[2]);
  let attrs = {};
  if (match[3]) {
    try { attrs = JSON.parse(match[3]); } catch { attrs = {}; }
  }
  return { name, attrs, selfClosing };
}

function parseClose(comment) {
  const match = /^\/wp:([a-z0-9-]+\/)?([a-z0-9-]+)$/i.exec(comment);
  if (!match) return null;
  return normalizeName(match[1], match[2]);
}

export function parseBlocks(raw) {
  const parsed = parseRegion(String(raw || ""), null);
  return parsed.blocks;
}

function parseRegion(raw, expectedCloseName) {
  const blocks = [];
  let textStart = 0;
  let scan = 0;

  while (scan < raw.length) {
    const start = raw.indexOf("<!--", scan);
    if (start === -1) {
      if (raw.slice(textStart).trim()) blocks.push(freeform(raw.slice(textStart)));
      break;
    }

    const end = raw.indexOf("-->", start + 4);
    if (end === -1) {
      if (raw.slice(textStart).trim()) blocks.push(freeform(raw.slice(textStart)));
      break;
    }

    const comment = raw.slice(start + 4, end).trim();

    // Handle closing WP block comment.
    const closeName = parseClose(comment);
    if (closeName) {
      if (expectedCloseName && closeName === expectedCloseName) {
        if (start > textStart && raw.slice(textStart, start).trim()) {
          blocks.push(freeform(raw.slice(textStart, start)));
        }
        return { blocks, consumed: end + 3, contentLength: start };
      }
      // Stray or mismatched closing WP comment: flush preceding text and skip it.
      if (start > textStart && raw.slice(textStart, start).trim()) {
        blocks.push(freeform(raw.slice(textStart, start)));
      }
      scan = end + 3;
      textStart = end + 3;
      continue;
    }

    // Handle opening WP block comment.
    const open = comment.startsWith("wp:") ? parseOpen(comment) : null;
    if (!open) {
      // Preserve non-WP HTML comments (e.g. <!-- more -->) intact with surrounding HTML.
      scan = end + 3;
      continue;
    }

    if (start > textStart && raw.slice(textStart, start).trim()) {
      blocks.push(freeform(raw.slice(textStart, start)));
    }

    if (open.selfClosing) {
      blocks.push({ name: open.name, attrs: open.attrs, innerHtml: "", innerBlocks: [] });
      scan = end + 3;
      textStart = end + 3;
      continue;
    }

    const inner = parseRegion(raw.slice(end + 3), open.name);
    const contentLength = inner.contentLength ?? inner.consumed;
    const innerRaw = raw.slice(end + 3, end + 3 + contentLength);
    blocks.push({
      name: open.name,
      attrs: open.attrs,
      innerHtml: stripBlockComments(innerRaw),
      innerBlocks: inner.blocks.filter((block) => block.name !== "core/freeform" || block.innerHtml.trim()),
    });
    scan = end + 3 + inner.consumed;
    textStart = scan;
  }

  return { blocks, consumed: raw.length, contentLength: raw.length };
}

function stripBlockComments(html) {
  return html.replace(/<!--\s*\/?wp:[\s\S]*?-->/g, "");
}
