import assert from "node:assert/strict";
import { insertEmotion, renderEmotionKeyboard, replaceStickers } from "../src/lib/comments/emotions.mjs";

const html = renderEmotionKeyboard();
assert.match(html, /id="emotion_keyboard"/);
assert.match(html, /emotion-item-sticker/);
assert.equal(html.includes("admin-ajax.php"), false);
assert.match(replaceStickers("你好 :smile:"), /class="comment-sticker"/);
assert.equal(replaceStickers("你好 :smile:").includes("wp-json"), false);
const inserted = insertEmotion("ab", 1, 1, "(☆ω☆)");
assert.equal(inserted.value, "a(☆ω☆)b");
assert.equal(inserted.caret, 6);
console.log("emotions ok");
