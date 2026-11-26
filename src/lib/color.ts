export interface Rgb { r: number; g: number; b: number }
export interface Hsl { h: number; s: number; l: number }

export function hexToRgb(hex: string): Rgb {
  const raw = hex.trim().replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value) || full.length !== 6) return { r: 94, g: 114, b: 228 };
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHsl(rgb: Rgb): Hsl {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round((h / 6) * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function themeColorStyle(hex: string, radius: number): string {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb);
  return ":root{--themecolor:" + hex
    + ";--themecolor-R:" + rgb.r
    + ";--themecolor-G:" + rgb.g
    + ";--themecolor-B:" + rgb.b
    + ";--themecolor-rgbstr:" + rgb.r + "," + rgb.g + "," + rgb.b
    + ";--themecolor-H:" + hsl.h
    + ";--themecolor-S:" + hsl.s
    + ";--themecolor-L:" + hsl.l
    + ";--card-radius:" + radius + "px;}";
}
