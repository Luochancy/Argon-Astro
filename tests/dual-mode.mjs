import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const local = readFileSync("dist/shuoshuo/index.html", "utf8");
assert.match(local, /shuoshuo-upvote/);
assert.equal(local.includes("wp-json"), false);
assert.equal(local.includes("admin-ajax.php"), false);
const gutenberg = readFileSync("dist/posts/gutenberg/index.html", "utf8");
assert.match(gutenberg, /collapse-block/);
assert.equal(gutenberg.includes("<!-- wp:"), false);
assert.equal(existsSync("dist/index.html"), true);
const config = readFileSync("dist/index.html", "utf8");
assert.equal(config.includes("WP_URL"), false);
console.log("dual-mode pages ok");
