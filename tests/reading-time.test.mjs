import assert from "node:assert/strict";
import { readingTime } from "../src/lib/reading-time.mjs";

assert.equal(readingTime("你好"), "几秒读完");
assert.equal(readingTime("字".repeat(300)), "1 分钟");
assert.equal(readingTime("<pre>line</pre>" + "a ".repeat(160)), "2 分钟");
console.log("reading time ok");
