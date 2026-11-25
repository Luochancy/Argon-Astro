import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const entries = JSON.parse(readFileSync("src/generated/entries.json", "utf8"));
const generated = entries.find((entry) => entry.id === "gutenberg");
assert.match(generated.html, /wp-block-image/);
assert.equal(generated.html.includes("wp-json"), false);
const gutenberg = readFileSync("dist/posts/gutenberg/index.html", "utf8");
assert.match(gutenberg, /collapse-block/);
assert.equal(gutenberg.includes("wp-json"), false);
assert.equal(gutenberg.includes("admin-ajax.php"), false);
console.log("dist contract ok");
