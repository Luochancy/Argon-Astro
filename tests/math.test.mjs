import assert from "node:assert/strict";
import { protectMath, restoreMath } from "../src/lib/math.mjs";

const protectedMath = protectMath("Energy $E=mc^2$ and $$a^2+b^2=c^2$$.");
assert.equal(protectedMath.slots.length, 2);
const html = restoreMath("<p>" + protectedMath.source + "</p>", protectedMath.slots);
assert.match(html, /class="katex"/);
assert.equal(html.includes("wp-json"), false);
console.log("math ok");
