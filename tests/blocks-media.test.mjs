import assert from "node:assert/strict";
import { createContext, renderDocument } from "../src/lib/blocks/index.mjs";

const ctx = createContext({
  rewriteUrl: (url) => url.replace("https://cms.example", "/media/wp"),
});
const html = renderDocument([
  '<!-- wp:video {"src":"https://cms.example/a.mp4"} /-->',
  '<!-- wp:file {"href":"https://cms.example/a.pdf","fileName":"notes.pdf"} /-->',
  '<!-- wp:table {"head":[{"cells":[{"content":"H1"},{"content":"H2"}]}],"body":[{"cells":[{"content":"A"},{"content":"B"}]}],"foot":[{"cells":[{"content":"F1"},{"content":"F2"}]}]} /-->',
].join("\n"), ctx);
assert.match(html, /src="\/media\/wp\/a.mp4"/);
assert.match(html, /href="\/media\/wp\/a.pdf"/);
assert.match(html, /<thead><tr><th>H1<\/th><th>H2<\/th><\/tr><\/thead>/);
assert.match(html, /<td>A<\/td>/);
assert.match(html, /<tfoot><tr><td>F1<\/td><td>F2<\/td><\/tr><\/tfoot>/);
assert.equal(html.includes("cms.example"), false);

// Table innerHtml URL rewriting.
const tableHtml = renderDocument(
  '<!-- wp:table --><figure class="wp-block-table"><table><tbody><tr><td><a href="https://cms.example/doc.pdf">Doc</a></td></tr></tbody></table></figure><!-- /wp:table -->',
  ctx
);
assert.ok(tableHtml.includes('href="/media/wp/doc.pdf"'));
assert.equal(tableHtml.includes("cms.example"), false);

// WP 5.9+ core/gallery with nested core/image innerBlocks.
const galleryHtml = renderDocument([
  "<!-- wp:gallery -->",
  '<figure class="wp-block-gallery">',
  '<!-- wp:image {"url":"https://cms.example/1.jpg","alt":"One"} /-->',
  '<!-- wp:image {"id":2} --><figure class="wp-block-image"><img src="https://cms.example/2.jpg" alt="Two" /></figure><!-- /wp:image -->',
  "</figure>",
  "<!-- /wp:gallery -->",
].join("\n"), ctx);
assert.ok(galleryHtml.includes('src="/media/wp/1.jpg"'));
assert.ok(galleryHtml.includes('src="/media/wp/2.jpg"'));
assert.equal(galleryHtml.includes("cms.example"), false);

console.log("media blocks ok");
