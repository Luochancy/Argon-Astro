// Rewrite HTML <img> tags and resolve responsive WebP attributes so browsers load right-sized variants
// while preserving the full-resolution master WebP in data-full-src for zoom/lightbox viewing.

const DEFAULT_IMG_SIZES = "(max-width: 600px) 100vw, (max-width: 1024px) 85vw, 900px";

function escapeAttr(val) {
  return String(val ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/**
 * Pick the best responsive display image attributes for a given local asset path.
 * Inline display uses scaled variants (<= 1440w) in srcset; the full-res master is exposed via fullSrc only.
 */
export function resolveResponsiveImage(localPath, variantMap = {}, options = {}) {
  const clean = String(localPath || "").trim();
  const entry = clean && variantMap ? variantMap[clean] : null;
  if (!entry || !Array.isArray(entry.variants) || entry.variants.length === 0) {
    return {
      src: clean,
      fullSrc: clean,
      srcset: "",
      sizes: "",
      width: entry?.width || 0,
      height: entry?.height || 0,
    };
  }

  const sorted = [...entry.variants]
    .filter((v) => v && v.local && Number(v.width) > 0)
    .sort((a, b) => a.width - b.width);

  if (!sorted.length) {
    return { src: clean, fullSrc: clean, srcset: "", sizes: "", width: entry.width || 0, height: entry.height || 0 };
  }

  const preferredMax = Number(options.preferredWidth || 960);
  // Choose the largest variant <= preferredMax (or the smallest available variant) as fallback src.
  const underCap = sorted.filter((v) => v.width <= preferredMax);
  const chosen = underCap.length ? underCap[underCap.length - 1] : sorted[0];
  const srcset = sorted.map((v) => `${v.local} ${v.width}w`).join(", ");

  return {
    src: chosen.local,
    fullSrc: clean,
    srcset,
    sizes: options.sizes || DEFAULT_IMG_SIZES,
    width: entry.width || 0,
    height: entry.height || 0,
  };
}

/**
 * Rewrite <img> tags inside rendered HTML to use responsive WebP variants for normal display
 * and store the max-clarity master WebP in data-full-src for lightbox/zoomify zoom.
 */
export function enhanceResponsiveImages(html, variantMap = {}) {
  if (!html || !variantMap || Object.keys(variantMap).length === 0) return String(html || "");

  return String(html).replace(/<img\b([^>]*?)(\/?)>/gi, (match, rawAttrs, selfClose) => {
    const srcMatch = /\bsrc=(["'])([^"']+)\1/i.exec(rawAttrs);
    const origMatch = /\bdata-original=(["'])([^"']+)\1/i.exec(rawAttrs);
    const lookupSrc = (origMatch ? origMatch[2] : srcMatch ? srcMatch[2] : "").trim();
    if (!lookupSrc || !variantMap[lookupSrc]) return match;

    const info = resolveResponsiveImage(lookupSrc, variantMap);
    if (!info.srcset) return match;

    let attrs = rawAttrs;
    // Strip stale WordPress srcset/sizes so responsive WebP variants take full control.
    attrs = attrs.replace(/\s+\b(?:srcset|data-srcset|sizes|data-full-src)=(["'])[^"']*\1/gi, "");

    if (origMatch) {
      attrs = attrs.replace(/\bdata-original=(["'])[^"']*\1/i, `data-original="${escapeAttr(info.src)}"`);
      attrs += ` data-srcset="${escapeAttr(info.srcset)}"`;
    } else if (srcMatch) {
      attrs = attrs.replace(/\bsrc=(["'])[^"']*\1/i, `src="${escapeAttr(info.src)}"`);
      attrs += ` srcset="${escapeAttr(info.srcset)}"`;
    }

    attrs += ` sizes="${escapeAttr(info.sizes)}" data-full-src="${escapeAttr(info.fullSrc)}"`;
    if (!/\bloading=/i.test(attrs)) attrs += ' loading="lazy"';
    if (!/\bdecoding=/i.test(attrs)) attrs += ' decoding="async"';

    return `<img${attrs}${selfClose}>`;
  });
}
