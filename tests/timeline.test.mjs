import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { renderTimeline } from "../src/lib/timeline.mjs";

const sample = [
  { title: "Older", href: "/posts/older/", date: "2025-01-02T00:00:00.000Z" },
  { title: "Newer", href: "/posts/newer/", date: "2026-11-11T00:00:00.000Z" },
];

const enHtml = renderTimeline(sample);
assert.match(enHtml, /argon-timeline/);
assert.match(enHtml, /archive-timeline-year/);
assert.match(enHtml, /Nov/);
assert.match(enHtml, /href="\/posts\/newer\/"/);
assert.equal(enHtml.includes("wp-json"), false);

const zhHtml = renderTimeline(sample, true, "/archives/", "zh-CN");
assert.match(zhHtml, /11 月/);
assert.match(zhHtml, /1 月/);
assert.match(zhHtml, /id="month-2026-11"/);

const builtArchives = new URL("../dist/archives/index.html", import.meta.url);
if (existsSync(builtArchives)) {
  const html = readFileSync(builtArchives, "utf8");
  assert.match(html, /id="leftbar_catalog"/);
  assert.match(html, /11 月/);
  assert.match(html, /leftbar-menu-item current/);
}
console.log("timeline ok");
