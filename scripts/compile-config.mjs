// Compile argon.config.yml into src/generated/theme-config.json.
// When source is "wordpress" and a synced .cache/wp-theme.json exists,
// merge remote theme options while preserving local build-time comments config.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { parse } = require("yaml");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base, extra) {
  if (!isRecord(extra)) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    if (Array.isArray(value)) {
      out[key] = value;
    } else if (isRecord(value) && isRecord(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

const raw = parse(readFileSync(join(root, "argon.config.yml"), "utf8")) || {};
const source = process.env.ARGON_SOURCE || raw.source || "local";
let compiled = { ...raw, source };

const remotePath = join(root, ".cache/wp-theme.json");
if (source === "wordpress" && existsSync(remotePath)) {
  const remote = JSON.parse(readFileSync(remotePath, "utf8"));
  if (isRecord(remote)) {
    const safeRemote = { ...remote };
    // Comment provider and source mode are build-time decisions; CMS cannot override them.
    delete safeRemote.comments;
    delete safeRemote.source;
    compiled = deepMerge(compiled, safeRemote);
    compiled.source = "wordpress";
    compiled.comments = raw.comments;
  }
}

const outDir = join(root, "src/generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "theme-config.json"), JSON.stringify(compiled, null, 2));
console.log("compiled argon.config.yml (source=" + source + ")");
