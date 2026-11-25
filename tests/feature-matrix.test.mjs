import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const matrix = JSON.parse(readFileSync(new URL("../docs/audit/feature-matrix.json", import.meta.url), "utf8"));

test("feature matrix covers the audited option set", () => {
  assert.equal(matrix.counts.options, 128);
  assert.ok(matrix.features.length >= 128);
});

test("every row has an explicit behavior and none are marked done", () => {
  for (const row of matrix.features) {
    assert.ok(row.id, "row missing id");
    assert.ok(row.behavior, row.id + " missing behavior");
    assert.notEqual(row.behavior, "done", row.id + " cannot be marked done before acceptance");
    assert.notEqual(row.behavior, "ported", row.id + " cannot be marked ported before acceptance");
  }
});
