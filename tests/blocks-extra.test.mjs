import assert from "node:assert/strict";
import { createContext, renderDocument } from "../src/lib/blocks/index.mjs";
import { renderShortcodes } from "../src/lib/shortcodes/render.mjs";

const ctx = createContext({
  rewriteUrl: (url) => url.replace("https://cms.example", "/media/wp"),
  friendLinks: [
    { name: "Argon", url: "https://cms.example/argon", description: "Theme", avatar: "https://cms.example/a.png" },
  ],
  date: "2026-11-20T08:00:00Z",
  modifiedDate: "2026-11-22T09:00:00Z",
});

const html = renderDocument([
  "<!-- wp:separator /-->",
  '<!-- wp:spacer {"height":48} /-->',
  '<!-- wp:quote {"value":"Keep going","citation":"Argon"} /-->',
  '<!-- wp:gallery {"images":[{"url":"https://cms.example/g.jpg","alt":"g"}]} /-->',
  '<!-- wp:button {"text":"Read","url":"/posts/hello-argon/"} /-->',
  "<!-- wp:row --><!-- wp:paragraph --><p>RowChild</p><!-- /wp:paragraph --><!-- /wp:row -->",
  "<!-- wp:stack --><!-- wp:paragraph --><p>StackChild</p><!-- /wp:paragraph --><!-- /wp:stack -->",
].join("\n"), ctx);
assert.match(html, /wp-block-separator/);
assert.match(html, /height:48px/);
assert.match(html, /Keep going/);
assert.match(html, /src="\/media\/wp\/g.jpg"/);
assert.match(html, /wp-block-button__link/);
assert.match(html, /<div class="wp-block-row"><p>RowChild<\/p><\/div>/);
assert.match(html, /<div class="wp-block-stack"><p>StackChild<\/p><\/div>/);

// Complete Argon blocks + HTML escaping on attrs.*
const argonHtml = renderDocument([
  '<!-- wp:argon/alert {"color":"#123\\"x","title":"<b>T</b>","content":"<script>1</script>"} /-->',
  '<!-- wp:argon/admonition {"color":"green","title":"Note","content":"Body <em>x</em>"} /-->',
  '<!-- wp:argon/collapse {"title":"Toggle <1>","content":"Inside","collapsed":false} /-->',
  '<!-- wp:argon/github {"author":"solstice23","project":"argon-theme","size":"mini"} /-->',
  '<!-- wp:argon/progressbar {"progress":75,"label":"Done"} /-->',
  '<!-- wp:argon/timeline {"items":[{"time":"2026","title":"Launch","content":"Live"}]} /-->',
  '<!-- wp:argon/label {"color":"green","shape":"round","content":"New"} /-->',
  '<!-- wp:argon/checkbox {"checked":true,"disabled":true,"content":"Ship"} /-->',
  '<!-- wp:argon/hidden {"tip":"Hover <tip>","content":"Secret"} /-->',
  '<!-- wp:argon/spoiler {"tip":"Reveal","content":"Spoiler"} /-->',
  "<!-- wp:argon/friendlinks /-->",
  '<!-- wp:argon/video {"src":"https://cms.example/v.mp4","poster":"https://cms.example/p.jpg","width":"640","height":"360","autoplay":true,"loop":true} /-->',
].join("\n"), ctx);

assert.ok(argonHtml.includes("&lt;script&gt;1&lt;/script&gt;"));
assert.ok(argonHtml.includes("background-color:#123&quot;x"));
assert.ok(argonHtml.includes("admonition-title"));
assert.ok(argonHtml.includes('aria-expanded="true"'));
assert.ok(argonHtml.includes('<span class="collapse-block-title-inner">Toggle &lt;1&gt;</span>'));
assert.ok(argonHtml.includes("github-info-card-mini"));
assert.ok(argonHtml.includes('data-author="solstice23"'));
assert.ok(argonHtml.includes("width:75%"));
assert.ok(argonHtml.includes("argon-timeline-node"));
assert.ok(argonHtml.includes("badge-success badge-pill"));
assert.ok(argonHtml.includes("checked disabled"));
assert.ok(argonHtml.includes("argon-hidden-text argon-hidden-text-blur"));
assert.ok(argonHtml.includes('title="Hover &lt;tip&gt;"'));
assert.ok(argonHtml.includes('title="Reveal"'));
assert.ok(argonHtml.includes("friend-links-style1"));
assert.ok(argonHtml.includes("friend-link-container"));
assert.ok(argonHtml.includes('src="/media/wp/v.mp4"'));
assert.ok(argonHtml.includes('poster="/media/wp/p.jpg"'));
assert.ok(argonHtml.includes('width="640" height="360"'));
assert.ok(argonHtml.includes("autoplay loop"));

// Shortcodes: empty-quote attr(), noshortcode protection, nested shortcodes, full feature set.
const emptyTitleAlert = renderShortcodes('[alert title=""]hello[/alert]', ctx);
assert.equal(emptyTitleAlert.includes('<strong>"</strong>'), false);
assert.ok(emptyTitleAlert.includes('<span class="alert-inner--text">hello</span>'));

const noShortcodeCtx = createContext();
const noShortcodeOut = renderShortcodes(
  '[alert][noshortcode][label color="red"]raw[/label][hide_reading_time][/noshortcode][/alert]',
  noShortcodeCtx
);
assert.ok(noShortcodeOut.includes('[label color="red"]raw[/label][hide_reading_time]'));
assert.equal(noShortcodeCtx.hideReadingTime, false);

const nestedCollapse = renderShortcodes(
  '[collapse title="Outer" color="green" icon="star" showborder="false"][collapse title="Inner"]Leaf[/collapse][/collapse]',
  ctx
);
assert.ok(nestedCollapse.includes("collapse-block-noborder"));
assert.ok(nestedCollapse.includes("collapse-block-success"));
assert.ok(nestedCollapse.includes('<i class="fa fa-star"></i> <span class="collapse-block-title-inner">Outer</span>'));
assert.ok(nestedCollapse.includes("Inner"));
assert.ok(nestedCollapse.includes("Leaf"));
assert.equal(nestedCollapse.includes("[/collapse]"), false);

const timelineShortcode = renderShortcodes("[timeline]\n2026-01 | Start | Hello\n2026-02 | Done\n[/timeline]", ctx);
assert.ok(timelineShortcode.includes("argon-timeline-node"));
assert.ok(timelineShortcode.includes("argon-timeline-time"));
assert.ok(timelineShortcode.includes("argon-timeline-card"));
assert.ok(timelineShortcode.includes("Start"));

const metaCtx = createContext({ date: "2026-11-20T00:00:00Z", modifiedDate: "2026-11-21T00:00:00Z" });
const metaOut = renderShortcodes("[post_time] / [post_modified_time][hide_reading_time]", metaCtx);
assert.ok(metaOut.includes("2026-11-20"));
assert.ok(metaOut.includes("2026-11-21"));
assert.equal(metaCtx.hideReadingTime, true);

const friendOut = renderShortcodes("[friendlinks][sfriendlinks]", ctx);
assert.ok(friendOut.includes("friend-links-style1"));
assert.ok(friendOut.includes("friend-link-title"));
assert.ok(friendOut.includes("friend-links-simple"));

const noAvatarFriendOut = renderShortcodes("[friendlinks]", createContext({
  friendLinks: [{ name: "Plain", url: "https://example.com", description: "No img", avatar: "" }],
}));
assert.ok(noAvatarFriendOut.includes("friend-link-container no-avatar"));

const spoilerOut = renderShortcodes('[hidden tip="hint"]secret[/hidden][checkbox checked="true" disabled="true"]done[/checkbox]', ctx);
assert.ok(spoilerOut.includes("argon-hidden-text argon-hidden-text-blur"));
assert.ok(spoilerOut.includes('title="hint"'));
assert.ok(spoilerOut.includes("checked disabled"));

// Video shortcode works even when ctx is omitted.
const videoOut = renderShortcodes('[video src="https://example.com/v.mp4" width="320" height="240" poster="https://example.com/p.jpg" autoplay="true" loop="true"]');
assert.ok(videoOut.includes('src="https://example.com/v.mp4"'));
assert.ok(videoOut.includes('width="320"'));
assert.ok(videoOut.includes('height="240"'));
assert.ok(videoOut.includes('poster="https://example.com/p.jpg"'));
assert.ok(videoOut.includes("autoplay loop"));

console.log("extra blocks ok");
