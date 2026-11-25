import assert from "node:assert/strict";
import { columnCount, placeItems } from "../src/lib/layout/waterflow.mjs";

assert.equal(columnCount("1", 1400, 6), 1);
assert.equal(columnCount("2and3", 1200, 6), 3);
assert.equal(columnCount("2and3", 700, 6), 2);
assert.equal(columnCount("2and3", 600, 6), 1);
assert.equal(columnCount("3", 500, 6), 1);
const placed = placeItems([100, 40, 80], 2);
assert.equal(placed[0].index, 0);
assert.equal(placed[1].index, 1);
assert.equal(placed[2].index, 1);
assert.equal(placed[2].top, 40);
console.log("waterflow ok");
