import assert from "node:assert/strict";
import { createContext, renderDocument } from "../src/lib/blocks/index.mjs";

const ctx = createContext({
  rewriteUrl: (url) => url.replace("https://cms.example", "/media/wp"),
});
const html = renderDocument([
  '<!-- wp:cover {"url":"https://cms.example/cover.jpg","dimRatio":40} -->\n<div class="wp-block-cover__inner-container"><p>CoverUnique</p></div>\n<!-- /wp:cover -->',
  '<!-- wp:media-text {"mediaUrl":"https://cms.example/side.jpg"} -->\n<div class="wp-block-media-text__content"><p>SideUnique</p></div>\n<!-- /wp:media-text -->',
].join("\n"), ctx);
assert.match(html, /src="\/media\/wp\/cover.jpg"/);
assert.match(html, /src="\/media\/wp\/side.jpg"/);
assert.equal(html.includes("cms.example"), false);
assert.equal(html.match(/CoverUnique/g)?.length, 1);
assert.equal(html.match(/SideUnique/g)?.length, 1);

// Verify container blocks with nested innerBlocks do not duplicate HTML output.
const nestedContainers = renderDocument([
  "<!-- wp:columns -->",
  "<!-- wp:column -->",
  "<!-- wp:group -->",
  "<!-- wp:paragraph --><p>SingleGroupText</p><!-- /wp:paragraph -->",
  "<!-- /wp:group -->",
  "<!-- /wp:column -->",
  "<!-- /wp:columns -->",
  "<!-- wp:list --><ul><!-- wp:list-item --><li>ItemOnce<!-- wp:list --><ul><!-- wp:list-item --><li>SubOnce</li><!-- /wp:list-item --></ul><!-- /wp:list --></li><!-- /wp:list-item --></ul><!-- /wp:list -->",
].join("\n"), ctx);

assert.equal(nestedContainers.match(/SingleGroupText/g)?.length, 1);
assert.equal(nestedContainers.match(/ItemOnce/g)?.length, 1);
assert.equal(nestedContainers.match(/SubOnce/g)?.length, 1);
assert.equal(nestedContainers.includes("<li><li>"), false);

console.log("cover blocks ok");
