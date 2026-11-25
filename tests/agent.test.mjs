import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { htmlToAgentMarkdown } from "../src/lib/agent/markdown-export.mjs";
import { buildRobotsTxt } from "../src/lib/agent/robots.mjs";

// 0. Unit test robots.txt custom override vs auto generation
assert.equal(
  buildRobotsTxt({ site: { url: "https://example.com" }, agent: { enabled: true, customRobotsTxt: "User-agent: *\nDisallow: /admin/" } }),
  "User-agent: *\nDisallow: /admin/\n",
);
assert.match(
  buildRobotsTxt({ site: { url: "https://example.com" }, agent: { enabled: true, llmsTxt: true, allowTrainingCrawlers: false, customRobotsTxt: "" } }),
  /User-agent: GPTBot\nDisallow: \//,
);

// 1. Unit test HTML -> clean agent Markdown conversion
const md = htmlToAgentMarkdown(
  '<h2>Heading</h2><p>Hello <strong>Agent</strong> and <a href="/about/">About</a>.</p><pre><code class="language-ts">const ok = true;\n</code></pre><script>alert(1)</script>',
);
assert.match(md, /## Heading/);
assert.match(md, /\*\*Agent\*\*/);
assert.match(md, /\[About\]\(\/about\/\)/);
assert.match(md, /```ts\nconst ok = true;\n```/);
assert.equal(md.includes("alert(1)"), false);

// 2. Verify built AI-agent discovery files in dist/
const distPath = (rel) => new URL(`../dist/${rel}`, import.meta.url);
for (const file of [
  "llms.txt",
  "llms-full.txt",
  "agent-index.json",
  "robots.txt",
  "posts/hello-argon.md",
  "posts/locked.md",
  "shuoshuo/morning.md",
  "about.md",
]) {
  assert.equal(existsSync(distPath(file)), true, `Expected built agent file dist/${file}`);
}

const llmsTxt = readFileSync(distPath("llms.txt"), "utf8");
const llmsFull = readFileSync(distPath("llms-full.txt"), "utf8");
const agentIndex = JSON.parse(readFileSync(distPath("agent-index.json"), "utf8"));
const robots = readFileSync(distPath("robots.txt"), "utf8");
const helloMd = readFileSync(distPath("posts/hello-argon.md"), "utf8");
const lockedMd = readFileSync(distPath("posts/locked.md"), "utf8");
const helloHtml = readFileSync(distPath("posts/hello-argon/index.html"), "utf8");
const homeHtml = readFileSync(distPath("index.html"), "utf8");

assert.match(llmsTxt, /## Agent Discovery Endpoints/);
assert.match(llmsTxt, /\/posts\/hello-argon\.md/);
assert.match(llmsFull, /Full Corpus for AI Agents/);
assert.equal(agentIndex.schemaVersion, "1.0");
assert.ok(agentIndex.entries.length >= 6);
assert.match(robots, /Sitemap: https?:\/\/.+\/sitemap\.xml/);
assert.match(robots, /# AI Agent Discovery:/);
assert.equal(/^Llms-Txt:/m.test(robots), false, "robots.txt must stay RFC 9309 compliant without unknown directives");
assert.match(helloMd, /```ts/);
assert.equal(helloHtml.includes('type="text/markdown"'), false, "HTML pages rely on Accept: text/markdown negotiation instead of explicit .md alternate links");
assert.equal(helloHtml.includes("argon-agent-bar"), false, "visible agent bar must not be rendered on pages");
assert.match(helloHtml, /application\/ld\+json/);
assert.match(helloHtml, /"@type":"BlogPosting"/);
assert.match(homeHtml, /"@type":"WebSite"/);
assert.match(homeHtml, /rel="icon"[^>]*favicon\.ico/);
assert.match(homeHtml, /role="presentation"/);
assert.match(homeHtml, /id="leftbar_overview_author_image"[^>]*role="img"/);

// 3. Strict security check: locked post secret and CMS paths must NEVER leak into any agent output!
const secret = "SECRET_BODY_MUST_NOT_SHIP";
for (const [name, content] of [
  ["llms.txt", llmsTxt],
  ["llms-full.txt", llmsFull],
  ["agent-index.json", JSON.stringify(agentIndex)],
  ["posts/locked.md", lockedMd],
]) {
  assert.equal(content.includes(secret), false, `Locked secret leaked into ${name}`);
  assert.equal(content.includes("wp-json"), false, `wp-json leaked into ${name}`);
}
assert.match(lockedMd, /password-protected/i);
console.log("agent browsing ok");
