import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const source = readFileSync(new URL("../src/client/highlight.ts", import.meta.url), "utf8");
assert.match(source, /\/argon\/vendor\/highlight\/highlight\.pack\.js/);
assert.equal(source.includes("wp-json"), false);
assert.equal(source.includes("jsdelivr"), false);
assert.equal(source.includes("http://"), false);
assert.equal(source.includes("https://"), false);
console.log("highlight path ok");
