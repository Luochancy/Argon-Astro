// Build-time raster image to WebP conversion using sharp (preserving GIF animations, SVG, ICO, WebP, AVIF).

const RASTER_EXT_RE = /\.(png|jpe?g|bmp|tiff?)$/i;
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

/**
 * Convert a raster image buffer (PNG/JPEG/BMP/TIFF) to WebP with EXIF orientation applied.
 * Returns null if sharp is unavailable or the buffer cannot be decoded (caller falls back to original).
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
