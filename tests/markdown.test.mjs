import assert from "node:assert/strict";
import { renderMarkdown } from "../src/lib/markdown.mjs";

const md = [
  "# 标题 One",
  "",
  "这是 **粗体**、*斜体*、~~删除线~~ 和 `**原样代码**`。",
  "",
  "![封面](/argon/cover.png) 与 [链接](https://example.com) 及 [拦截](javascript:alert(1))",
  "",
  "> 引用段落",
  "",
  "- [x] 已完成",
  "- [ ] 未完成",
  "",
  "1. 第一项",
  "2. 第二项",
  "",
  "| 列A | 列B |",
  "| --- | --- |",
  "| 1 | 2 |",
  "",
  "---",
  "",
  "```ts",
  "const x = 1 < 2;",
  "```",
].join("\n");

const html = renderMarkdown(md);
assert.match(html, /<h1 id="标题-one">标题 One<\/h1>/);
assert.match(html, /<strong>粗体<\/strong>/);
assert.match(html, /<em>斜体<\/em>/);
assert.match(html, /<del>删除线<\/del>/);
assert.match(html, /<code>\*\*原样代码\*\*<\/code>/);
assert.match(html, /<img src="\/argon\/cover\.png" alt="封面" loading="lazy" \/>/);
assert.match(html, /<a href="https:\/\/example\.com">链接<\/a>/);
assert.match(html, /<a href="#">拦截<\/a>/);
assert.match(html, /<blockquote><p>引用段落<\/p><\/blockquote>/);
assert.match(html, /<li class="task-list-item"><input type="checkbox" disabled checked \/> 已完成<\/li>/);
assert.match(html, /<ol><li>第一项<\/li><li>第二项<\/li><\/ol>/);
assert.match(html, /<table><thead><tr><th>列A<\/th><th>列B<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>2<\/td><\/tr><\/tbody><\/table>/);
assert.match(html, /<hr \/>/);
assert.match(html, /<pre class="line-numbers"><code class="language-ts">const x = 1 &lt; 2;<\/code><\/pre>/);
console.log("markdown ok");
