// Verify that the built static site in dist/ never references the headless CMS.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");
const host = process.env.WP_URL ? new URL(process.env.WP_URL).host : "";
const forbidden = ["wp-json", "wp-admin", "admin-ajax.php", host].filter(Boolean);

function statSafe(path: string): boolean {
  try {
    return statSync(path).isDirectory() || statSync(path).isFile();
  } catch {
    return false;
  }
}

function walk(dir: string): string[] {
  if (!statSafe(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path));
    else if (/\.(html|js|css|xml|json|txt|md|webmanifest)$/i.test(name)) out.push(path);
  }
  return out;
}

const files = walk(dist);
if (files.length === 0) {
  console.error("dist/ is missing or empty; run build before verify-no-cms.");
  process.exit(1);
}

const hits: string[] = [];
for (const file of files) {
  const text = readFileSync(file, "utf8");
  let haystack = text;
  if (file.endsWith(".html")) {
    const scripts = [...text.matchAll(/<script[\s\S]*?<\/script>/gi)].map((m) => m[0]);
    const attrs = [...text.matchAll(/(?:src|href|action|srcset|data-[a-z0-9-]+)=["']([^"']+)["']/gi)].map((m) => m[1] ?? "");
    const cssUrls = [...text.matchAll(/url\(([^)]+)\)/gi)].map((m) => m[1] ?? "");
    haystack = [...scripts, ...attrs, ...cssUrls].join("\n");
  }
  for (const token of forbidden) {
    if (token && haystack.includes(token)) {
      hits.push(`${file} contains ${token}`);
    }
  }
}

if (hits.length) {
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log(`static output (${files.length} files) does not call the headless CMS`);
