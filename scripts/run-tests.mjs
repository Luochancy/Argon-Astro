import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = join(root, "tests");
const files = readdirSync(testsDir)
  .filter((name) => name.endsWith(".mjs"))
  .sort();

let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, [join(testsDir, file)], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`FAIL: tests/${file} (exit ${result.status})`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`${failed} of ${files.length} test files failed.`);
  process.exit(1);
}
console.log(`all ${files.length} test files ok`);
