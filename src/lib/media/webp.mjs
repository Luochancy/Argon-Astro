// Build-time responsive multi-size WebP conversion using sharp.
// Preserves GIF animations, SVG, ICO, WebP, and AVIF while generating mobile/tablet/desktop WebP sizes
// and keeping the full-resolution WebP master for lightbox/zoomify high-clarity viewing.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const RASTER_EXT_RE = /\.(png|jpe?g|bmp|tiff?)$/i;
export const DEFAULT_RESPONSIVE_WIDTHS = [480, 960, 1440];
let sharpLoader = null;

async function loadSharp() {
  if (!sharpLoader) {
    sharpLoader = import("sharp")
      .then((mod) => mod.default || mod)
      .catch(() => null);
  }
  return sharpLoader;
}

export function isConvertibleRaster(pathname) {
  const clean = String(pathname || "").split(/[?#]/)[0];
  return RASTER_EXT_RE.test(clean);
}

export function toWebpPath(pathname) {
  const raw = String(pathname || "");
  if (!isConvertibleRaster(raw)) return raw;
  return raw.replace(RASTER_EXT_RE, ".webp");
}

export function toVariantWebpPath(webpPath, width) {
  const raw = String(webpPath || "");
  return raw.replace(/\.webp$/i, `-w${width}.webp`);
}

export function parseResponsiveWidths(raw) {
  if (!raw) return [...DEFAULT_RESPONSIVE_WIDTHS];
  const parsed = String(raw)
    .split(/[,\s]+/)
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 160 && n <= 3840);
  return parsed.length ? [...new Set(parsed)].sort((a, b) => a - b) : [...DEFAULT_RESPONSIVE_WIDTHS];
}

/**
 * Convert a raster image buffer (PNG/JPEG/BMP/TIFF) to WebP with EXIF orientation applied.
 * Returns null if sharp is unavailable or the buffer cannot be decoded.
 */
export async function convertBufferToWebp(buffer, options = {}) {
  const sharp = await loadSharp();
  if (!sharp || !buffer || !buffer.length) return null;
  const quality = Number.isFinite(Number(options.quality)) ? Math.min(100, Math.max(1, Number(options.quality))) : 82;
  const effort = Number.isFinite(Number(options.effort)) ? Math.min(6, Math.max(0, Number(options.effort))) : 4;
  try {
    return await sharp(buffer, { failOn: "none" })
      .rotate()
      .webp({ quality, effort })
      .toBuffer();
  } catch {
    return null;
  }
}

/**
 * Write full-resolution master WebP + strictly-smaller responsive WebP variants for adaptive devices.
 * Returns metadata `{ width, height, variants, masterBytes, variantBytes }` or null on decode failure.
 */
export async function writeResponsiveWebpSet(rawBuffer, masterTarget, masterLocal, options = {}) {
  const sharp = await loadSharp();
  if (!sharp || !rawBuffer || !rawBuffer.length) return null;

  const fullQuality = Number.isFinite(Number(options.fullQuality))
    ? Math.min(100, Math.max(1, Number(options.fullQuality)))
    : Math.min(92, Math.max(1, Number(options.quality || 82) + 3));
  const variantQuality = Number.isFinite(Number(options.quality))
    ? Math.min(100, Math.max(1, Number(options.quality)))
    : 80;
  const effort = Number.isFinite(Number(options.effort)) ? Math.min(6, Math.max(0, Number(options.effort))) : 4;
  const widths = Array.isArray(options.widths) && options.widths.length
    ? [...options.widths].sort((a, b) => a - b)
    : DEFAULT_RESPONSIVE_WIDTHS;

  try {
    const masterOut = await sharp(rawBuffer, { failOn: "none" })
      .rotate()
      .webp({ quality: fullQuality, effort })
      .toBuffer({ resolveWithObject: true });

    const origWidth = Number(masterOut.info?.width || 0);
    const origHeight = Number(masterOut.info?.height || 0);
    mkdirSync(dirname(masterTarget), { recursive: true });
    writeFileSync(masterTarget, masterOut.data);

    const variants = [];
    let variantBytes = 0;

    for (const width of widths) {
      // Only generate strictly smaller variants (skip near-duplicates within 64px of original width).
      if (!origWidth || origWidth <= width + 64) continue;
      const vTarget = toVariantWebpPath(masterTarget, width);
      const vLocal = toVariantWebpPath(masterLocal, width);
      const resized = await sharp(rawBuffer, { failOn: "none" })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: variantQuality, effort })
        .toBuffer({ resolveWithObject: true });
      writeFileSync(vTarget, resized.data);
      variantBytes += resized.data.length;
      variants.push({
        width: Number(resized.info?.width || width),
        height: Number(resized.info?.height || 0),
        local: vLocal,
      });
    }

    return {
      local: masterLocal,
      width: origWidth,
      height: origHeight,
      variants,
      masterBytes: masterOut.data.length,
      variantBytes,
    };
  } catch {
    return null;
  }
}

/** Inspect a cached master WebP on disk and backfill any missing responsive variants without re-downloading. */
export async function inspectCachedWebpSet(masterTarget, masterLocal, widths = DEFAULT_RESPONSIVE_WIDTHS, options = {}) {
  if (!existsSync(masterTarget)) return null;
  const sharp = await loadSharp();
  let width = 0;
  let height = 0;
  const variantQuality = Number.isFinite(Number(options.quality))
    ? Math.min(100, Math.max(1, Number(options.quality)))
    : 80;
  const effort = Number.isFinite(Number(options.effort)) ? Math.min(6, Math.max(0, Number(options.effort))) : 4;
  if (sharp) {
    try {
      const meta = await sharp(masterTarget).metadata();
      width = Number(meta.width || 0);
      height = Number(meta.height || 0);
    } catch {
      // Fall back to unknown dimensions.
    }
  }
  const variants = [];
  let generated = 0;
  for (const w of widths) {
    const vTarget = toVariantWebpPath(masterTarget, w);
    const vLocal = toVariantWebpPath(masterLocal, w);
    if (existsSync(vTarget)) {
      variants.push({ width: w, local: vLocal });
      continue;
    }
    if (sharp && width > w + 64) {
      try {
        const resized = await sharp(masterTarget, { failOn: "none" })
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: variantQuality, effort })
          .toBuffer({ resolveWithObject: true });
        writeFileSync(vTarget, resized.data);
        variants.push({ width: Number(resized.info?.width || w), local: vLocal });
        generated += 1;
      } catch {
        // Skip failed variant generation and fall back to master.
      }
    }
  }
  return { local: masterLocal, width, height, variants, generated };
}
