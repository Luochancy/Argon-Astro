import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { snapshotFailed, writeSnapshot } from "../src/lib/wordpress/snapshot.mjs";
import { syncDecision } from "../src/lib/wordpress/sync-decision.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(root, "src/generated/theme-config.json"), "utf8"));
const source = process.env.ARGON_SOURCE || config.source || "local";
const decision = syncDecision(source, process.env);
if (decision.action === "skip") {
  console.log("source=local, skip headless sync");
  process.exit(0);
}
const url = process.env.WP_URL;
const user = process.env.WP_USER;
const password = process.env.WP_APP_PASSWORD;
if (decision.action === "fail") {
  snapshotFailed(root);
  console.error("wordpress source requires WP_URL, WP_USER and WP_APP_PASSWORD");
  process.exit(1);
}
const auth = "Basic " + Buffer.from(user + ":" + password).toString("base64");
const wpOrigin = new URL(url).origin;
const syncUserAgent = "Argon-Astro-Sync/1.0";

const client = {
  origin: wpOrigin,
  concurrency: 6,
  async getJson(path) {
    const response = await fetch(url.replace(/\/$/, "") + "/wp-json/argon-astro/v1" + path, {
      headers: {
        authorization: auth,
        accept: "application/json",
        "user-agent": syncUserAgent,
      },
    });
    if (!response.ok) throw new Error("Headless request failed: " + response.status + " (" + path + ")");
    return response.json();
  },
  async list(kind) {
    const items = [];
    let page = 1;
    let total = 1;
    while (page <= total) {
      const body = await this.getJson("/" + kind + "?page=" + page + "&per_page=50");
      items.push(...body.items);
      total = body.totalPages || 1;
      page += 1;
    }
    return items;
  },
  async download(sourceUrl, target) {
    if (existsSync(target)) return;
    const headers = { "user-agent": syncUserAgent };
    let safeDetail = "";
    try {
      const parsed = new URL(sourceUrl);
      if (parsed.origin === wpOrigin) {
        headers.authorization = auth;
        safeDetail = " (same-origin " + parsed.pathname + ")";
      } else {
        safeDetail = " (external " + parsed.host + parsed.pathname + ")";
      }
    } catch {
      // Ignore malformed URLs; fetch will report the error.
    }
    const response = await fetch(sourceUrl, { headers });
    if (!response.ok) throw new Error("Media download failed: " + response.status + safeDetail);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  },
};
try {
  const result = await writeSnapshot(client, root);
  console.log("snapshot", result);
} catch (error) {
  snapshotFailed(root);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
