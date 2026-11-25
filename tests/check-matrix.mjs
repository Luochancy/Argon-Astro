import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const matrix = JSON.parse(readFileSync(new URL("../docs/audit/feature-matrix.json", import.meta.url), "utf8"));
assert.equal(matrix.counts.options, 128);
assert.ok(matrix.features.length >= 128);
for (const row of matrix.features) {
  assert.ok(row.id, "row missing id");
  assert.ok(row.behavior, row.id + " missing behavior");
  assert.notEqual(row.behavior, "done");
  assert.notEqual(row.behavior, "ported");
}
console.log("feature matrix ok:", matrix.features.length, "rows");
