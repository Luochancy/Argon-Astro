// Build minified core Argon CSS (dropping unused vendor CSS + adding font-display:swap)
// and a lightweight 32x32 PNG-inside-ICO favicon.ico for zero-404 browser requests.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { transform } from "esbuild";

const root = resolve(import.meta.dirname, "..");

/** Build minimal valid 32x32 PNG-inside-ICO containing Argon's hexagon emblem. */
function buildFaviconIco() {
  const w = 32;
  const h = 32;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < w; x++) {
      const dx = x - 15.5;
      const dy = y - 15.5;
      const dist = Math.hypot(dx, dy);
      const px = row + 1 + x * 4;
      if (dist <= 14.5) {
        // Soft Argon accent circle with inner white chevron mark.
        const inMark =
          Math.abs(dx) <= 6 &&
          dy >= -5 &&
          dy <= 5 &&
          Math.abs(dy + Math.abs(dx) * 0.7 - 1.5) <= 1.8;
        if (inMark) {
          raw[px] = 255;
          raw[px + 1] = 255;
          raw[px + 2] = 255;
          raw[px + 3] = 255;
        } else {
          raw[px] = 94;
          raw[px + 1] = 114;
          raw[px + 2] = 228;
          raw[px + 3] = dist > 13.5 ? Math.round((14.5 - dist) * 255) : 255;
        }
      }
    }
  }

  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const t = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);

  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(1, 4); // 1 image
  header[6] = w;
  header[7] = h;
  header.writeUInt16LE(1, 10); // color planes
  header.writeUInt16LE(32, 12); // bpp
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // image offset
  return Buffer.concat([header, png]);
}

async function main() {
  const merged = readFileSync(resolve(root, "public/argon/assets/argon_css_merged.css"), "utf8");
  const styleCss = readFileSync(resolve(root, "public/argon/style.css"), "utf8");

  // Extract only the active vendor chunks from argon_css_merged.css (drop unused iziToast, fancybox, tippy.js).
  const lines = merged.split(/\r?\n/);
  const sections = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/argon\.min\.css|font-awesome-min\.css|pickr\/themes\/monolith\.min\.css/.test(line)) {
      const body = lines[i + 1] || "";
      sections.push(body);
    }
  }
  if (sections.length !== 3) {
    throw new Error(`Expected 3 active vendor CSS sections, found ${sections.length}`);
  }

  // Ensure FontAwesome uses font-display: swap to avoid blocking text paint.
  sections[1] = sections[1].replace(
    /(@font-face\{[^}]*)\}/,
    (m, inner) => (inner.includes("font-display") ? m : `${inner};font-display:swap}`),
  );

  // Preserve the @charset rule only at the very top, then minify the combined Argon bundle.
  const cleanedStyle = styleCss.replace(/@charset\s+"utf-8";/gi, "");
  const combined = `@charset "utf-8";\n${sections.join("\n")}\n${cleanedStyle}`;
  const result = await transform(combined, {
    loader: "css",
    minify: true,
    legalComments: "none",
  });

  const outCss = resolve(root, "public/argon/assets/argon-core.min.css");
  writeFileSync(outCss, result.code, "utf8");

  const outIco = resolve(root, "public/favicon.ico");
  const icoBuf = buildFaviconIco();
  writeFileSync(outIco, icoBuf);

  const beforeKB = ((merged.length + styleCss.length) / 1024).toFixed(1);
  const afterKB = (Buffer.byteLength(result.code, "utf8") / 1024).toFixed(1);
  console.log(`argon-core.min.css generated: ${beforeKB} KB -> ${afterKB} KB (saved ${(beforeKB - afterKB).toFixed(1)} KB)`);
  console.log(`favicon.ico generated: ${icoBuf.length} bytes`);
}

await main();
