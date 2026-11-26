import assert from "node:assert/strict";
import { handleCommentUpvote } from "../src/lib/comments/upvote.mjs";
import { zoomifyTransform } from "../src/lib/motion/zoomify.mjs";
import { outdatedNotice } from "../src/lib/outdated.mjs";
import { isConvertibleRaster, toWebpPath } from "../src/lib/media/webp.mjs";
import { enhanceResponsiveImages, resolveResponsiveImage } from "../src/lib/media/responsive.mjs";

assert.equal(isConvertibleRaster("/media/wp/1-photo.jpg"), true);
assert.equal(isConvertibleRaster("/media/wp/1-anim.gif"), false);
assert.equal(isConvertibleRaster("/media/wp/1-logo.svg"), false);
assert.equal(toWebpPath("/media/wp/1-photo.PNG"), "/media/wp/1-photo.webp");

const sampleVariants = {
  "/media/wp/1-photo.webp": {
    width: 2000,
    height: 1200,
    variants: [
      { width: 480, local: "/media/wp/1-photo-w480.webp" },
      { width: 960, local: "/media/wp/1-photo-w960.webp" },
      { width: 1440, local: "/media/wp/1-photo-w1440.webp" },
    ],
  },
};
const resolvedImg = resolveResponsiveImage("/media/wp/1-photo.webp", sampleVariants);
assert.equal(resolvedImg.src, "/media/wp/1-photo-w960.webp");
assert.equal(resolvedImg.fullSrc, "/media/wp/1-photo.webp");
assert.equal(resolvedImg.srcset.includes("/media/wp/1-photo.webp"), false, "full-res master must not be downloaded inline via srcset");
const enhancedHtml = enhanceResponsiveImages('<p><img src="/media/wp/1-photo.webp" alt="Photo"></p>', sampleVariants);
assert.match(enhancedHtml, /src="\/media\/wp\/1-photo-w960\.webp"/);
assert.match(enhancedHtml, /data-full-src="\/media\/wp\/1-photo\.webp"/);

const inpost = outdatedNotice("更新于 %date_delta% 天前", "warning", "relative", "2026-01-01", 42);
assert.equal(inpost, '<div class="post-outdated-info"><i class="fa fa-info-circle" aria-hidden="true"></i>更新于 42 天前</div>');
const toast = outdatedNotice("更新于 %date_delta% 天前", "info", "relative", "2026-01-01", 42);
assert.match(toast, /^<div id="post_outdate_toast" style="display:none;" data-text="更新于 42 天前"><\/div>$/);

assert.equal(zoomifyTransform(0.9, false), "none");
assert.equal(zoomifyTransform(0.9, true), "scale(0.9)");
assert.equal(zoomifyTransform(9, true), "scale(0.9)");

const host = "https://secret-cms.example";
let seen = "";
const ok = await handleCommentUpvote(new Request("https://blog.example/api/comment-upvote", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ id: 8 }),
}), { WP_URL: host, WP_USER: "editor", WP_APP_PASSWORD: "pw" }, async (url) => {
  seen = url;
  return new Response(JSON.stringify({ total: 2, leak: host }));
});
const text = await ok.text();
assert.equal(ok.status, 200);
assert.equal(seen, host + "/wp-json/argon-astro/v1/comment-upvote");
assert.equal(text.includes(host), false);
console.log("motion ok");
