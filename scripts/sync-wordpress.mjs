import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectCachedWebpSet,
  isConvertibleRaster,
  parseResponsiveWidths,
  toWebpPath,
  writeResponsiveWebpSet,
} from "../src/lib/media/webp.mjs";
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
const webpEnabled = process.env.ARGON_IMAGE_WEBP !== "false";
const webpQuality = Number(process.env.ARGON_IMAGE_WEBP_QUALITY || 82);
const responsiveWidths = parseResponsiveWidths(process.env.ARGON_IMAGE_WIDTHS);
const webpStats = { converted: 0, variants: 0, beforeBytes: 0, afterBytes: 0 };

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
  async download(sourceUrl, target, options = {}) {
    const wantWebp = webpEnabled && !options.keepOriginal && isConvertibleRaster(target);
    const webpTarget = wantWebp ? toWebpPath(target) : target;
    const localBase = options.local || "";
    const webpLocal = wantWebp && localBase ? toWebpPath(localBase) : localBase;

    if (wantWebp && existsSync(webpTarget)) {
      const cached = await inspectCachedWebpSet(webpTarget, webpLocal, responsiveWidths, { quality: webpQuality });
      if (cached) {
        if (cached.generated > 0) webpStats.variants += cached.generated;
        return cached;
      }
      return webpLocal;
    }
    if (!wantWebp && existsSync(target)) return localBase;

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
    const rawBuffer = Buffer.from(await response.arrayBuffer());

    if (wantWebp) {
      const set = await writeResponsiveWebpSet(rawBuffer, webpTarget, webpLocal, {
        quality: webpQuality,
        widths: responsiveWidths,
      });
      if (set) {
        webpStats.converted += 1;
        webpStats.variants += set.variants.length;
        webpStats.beforeBytes += rawBuffer.length;
        webpStats.afterBytes += set.masterBytes;
        return {
          local: set.local,
          width: set.width,
          height: set.height,
          variants: set.variants,
        };
      }
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, rawBuffer);
    return localBase;
  },
};
try {
  const result = await writeSnapshot(client, root);
  console.log("snapshot", result);
  if (webpStats.converted > 0 || webpStats.variants > 0) {
    const savedPct = webpStats.beforeBytes > 0
      ? Math.round((1 - webpStats.afterBytes / webpStats.beforeBytes) * 100)
      : 0;
    const sizeNote = webpStats.beforeBytes > 0
      ? ` (${(webpStats.beforeBytes / 1024).toFixed(1)} KB -> ${(webpStats.afterBytes / 1024).toFixed(1)} KB master, ${savedPct >= 0 ? "-" + savedPct : "+" + Math.abs(savedPct)}%)`
      : " (backfilled from cached masters)";
    console.log(
      `webp: converted ${webpStats.converted} images + ${webpStats.variants} responsive variants${sizeNote}`,
    );
  }
} catch (error) {
  snapshotFailed(root);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
