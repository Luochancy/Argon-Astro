import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { missingSnapshotFiles } from "../src/lib/wordpress/required.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "src/generated/theme-config.json"), "utf8"));
const source = process.env.ARGON_SOURCE || config.source || "local";
if (source !== "wordpress") {
  console.log("local source: no headless snapshot required");
  process.exit(0);
}
const missing = missingSnapshotFiles((item) => existsSync(join(root, item)));
if (missing.length) {
  console.error("Refusing to build: WordPress snapshot is incomplete.");
  console.error(missing.join("\n"));
  process.exit(1);
}
console.log("wordpress snapshot present");
