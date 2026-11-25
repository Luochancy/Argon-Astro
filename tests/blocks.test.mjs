import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { compatibilityReport, createContext, parseBlocks, renderDocument } from "../src/lib/blocks/index.mjs";

const raw = readFileSync(new URL("../src/lib/blocks/fixture.html", import.meta.url), "utf8");
const ctx = createContext({
  rewriteUrl: (url) => url.replace("https://cms.example", "/media/wp"),
  posts: [{ id: "hello", title: "Hello", date: "2026-11-15T00:00:00Z" }],
});
const html = renderDocument(raw, ctx);
assert.match(html, /Hello Gutenberg/);
assert.match(html, /wp-block-heading/);
assert.match(html, /src="\/media\/wp\/photo.jpg"/);
assert.match(html, /alert-success/);
assert.match(html, /collapse-block/);
assert.match(html, /third-party/);
assert.deepEqual(ctx.unknown, ["vendor/unknown"]);

const latest = renderDocument('<!-- wp:latest-posts {"postsToShow":1} /-->', ctx);
assert.match(latest, /hello/);

// Parser: nested same-name blocks and mismatched closing tag resilience.
const nestedRaw = [
  "<!-- wp:group -->",
  "<div class=\"outer\">",
  "<!-- wp:group -->",
  "<p>inner-one</p>",
  "<!-- /wp:group -->",
  "<!-- /wp:paragraph -->",
  "<p>after-stray</p>",
  "</div>",
  "<!-- /wp:group -->",
].join("\n");
const parsedNested = parseBlocks(nestedRaw);
assert.equal(parsedNested.length, 1);
assert.equal(parsedNested[0].name, "core/group");
const nestedHtml = renderDocument(nestedRaw, createContext());
assert.equal(nestedHtml.match(/inner-one/g)?.length, 1);
assert.equal(nestedHtml.match(/after-stray/g)?.length, 1);

// Parser: preserve non-wp HTML comments cleanly without corrupting surrounding HTML.
const commentRaw = [
  "<!-- wp:paragraph --><p>Intro</p><!-- /wp:paragraph -->",
  "<!-- more -->",
  "<div class=\"raw\">before <!-- note --> after</div>",
  "<!-- wp:paragraph --><p>Body</p><!-- /wp:paragraph -->",
].join("\n");
const commentHtml = renderDocument(commentRaw, createContext());
assert.ok(commentHtml.includes("<!-- more -->"));
assert.ok(commentHtml.includes('<div class="raw">before <!-- note --> after</div>'));

// Unknown core/* and third-party self-closing blocks + compatibilityReport export.
const unknownCtx = createContext();
const unknownHtml = renderDocument([
  "<!-- wp:core/unknown-widget /-->",
  "<!-- wp:vendor/self-closed /-->",
].join("\n"), unknownCtx);
assert.deepEqual(unknownCtx.unknown, ["core/unknown-widget", "vendor/self-closed"]);
assert.ok(unknownHtml.includes('<div class="wp-block-unknown" data-block="core/unknown-widget"></div>'));
assert.ok(unknownHtml.includes('<div class="wp-block-unknown" data-block="vendor/self-closed"></div>'));
const report = compatibilityReport(unknownCtx.unknown);
assert.equal(report.length, 2);
assert.equal(report[0].name, "core/unknown-widget");

// Paragraph fallback to attrs.content.
const paraHtml = renderDocument('<!-- wp:paragraph {"content":"Fallback <text>"} /-->', createContext());
assert.equal(paraHtml, "<p>Fallback &lt;text&gt;</p>");

// Heading ID deduplication and preserving existing id attributes.
const headingCtx = createContext();
const headingHtml = renderDocument([
  '<!-- wp:heading --><h2 id="custom-id">Same</h2><!-- /wp:heading -->',
  "<!-- wp:heading --><h2>Same</h2><!-- /wp:heading -->",
  "<!-- wp:heading --><h2>Same</h2><!-- /wp:heading -->",
].join("\n"), headingCtx);
assert.equal(headingHtml.match(/id="custom-id"/g)?.length, 1);
assert.equal(headingHtml.match(/id="same"/g)?.length, 1);
assert.equal(headingHtml.match(/id="same-1"/g)?.length, 1);
assert.equal(/id="[^"]*"[^>]*id="/.test(headingHtml), false);

// Code block preserves escaped content safely and escapes language attribute.
const codeHtml = renderDocument(
  '<!-- wp:code {"language":"js\\" onload=x"} --><pre class="wp-block-code"><code>const ok = a &lt; b &amp;&amp; c &gt; d;</code></pre><!-- /wp:code -->',
  createContext()
);
assert.ok(codeHtml.includes("const ok = a &lt; b &amp;&amp; c &gt; d;"));
assert.ok(codeHtml.includes('class="language-js&quot; onload=x"'));

// Calendar renders 7-column table with weekday headers and weekly rows.
const calHtml = renderDocument("<!-- wp:calendar /-->", ctx);
assert.match(calHtml, /<thead><tr><th scope="col">Sun<\/th>/);
assert.match(calHtml, /<th scope="col">Sat<\/th><\/tr><\/thead>/);
assert.match(calHtml, /<tbody>(<tr>(.*?)<\/tr>){4,6}<\/tbody>/);
assert.ok(calHtml.includes('href="/archives/#year-2026">15</a>'));

console.log("blocks ok");
