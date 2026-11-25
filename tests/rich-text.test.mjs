import assert from "node:assert/strict";
import { renderRichMarkdown, renderAfterPost } from "../src/lib/rich-text.mjs";

// Pure Markdown with inline formatting, links, and line breaks.
const md = renderRichMarkdown("**通知**：查看 [归档](/archives/)\n第二行 `code`");
assert.equal(md, '<p><strong>通知</strong>：查看 <a href="/archives/">归档</a><br />第二行 <code>code</code></p>');

// Pure HTML preserved untouched (no extra <p> wrapper around block HTML).
const html = renderRichMarkdown('<div class="box"><a href="https://example.com?a=1&b=2" target="_blank">示例</a></div>');
assert.equal(html, '<div class="box"><a href="https://example.com?a=1&b=2" target="_blank">示例</a></div>');

// Markdown + HTML coexisting in the same block and inline.
const mixed = renderRichMarkdown('<div class="note">**重要** <span class="badge">NEW</span> [详情](/about/)</div>');
assert.equal(mixed, '<div class="note"><strong>重要</strong> <span class="badge">NEW</span> <a href="/about/">详情</a></div>');

// Lists & headings alongside HTML.
const listMixed = renderRichMarkdown("- **第一项** <small>备注</small>\n- [第二项](/links/)");
assert.equal(listMixed, '<ul><li><strong>第一项</strong> <small>备注</small></li><li><a href="/links/">第二项</a></li></ul>');

// After-post placeholders work in both Markdown and HTML.
const afterMd = renderAfterPost("**版权声明**：作者 %author%，原文 [%title%](%url%)\n直链：%link%", {
  url: "https://example.com/posts/hello/",
  title: "你好 Argon",
  author: "Argon",
});
assert.match(afterMd, /<strong>版权声明<\/strong>：作者 Argon/);
assert.match(afterMd, /<a href="https:\/\/example\.com\/posts\/hello\/">你好 Argon<\/a>/);
assert.match(afterMd, /<a href="https:\/\/example\.com\/posts\/hello\/" target="_blank" rel="noopener">https:\/\/example\.com\/posts\/hello\/<\/a>/);

const afterHtml = renderAfterPost('<p>出处：<a href="%url%">%title%</a>（%author%）</p>', {
  url: "https://example.com/posts/hello/",
  title: "你好 Argon",
  author: "Argon",
});
assert.equal(afterHtml, '<p>出处：<a href="https://example.com/posts/hello/">你好 Argon</a>（Argon）</p>');

console.log("rich text ok");
