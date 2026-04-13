/**
 * color.ts — HSL color utilities for the Nords type system.
 *
 * Constrains user-chosen hue values to accessible S/L ranges,
 * computes WCAG-compliant text contrast, and provides
 * hex ↔ HSL conversion helpers.
 */

export interface HSL {
  h: number; // 0–360
  s: number; // 0–100
  l: number; // 0–100
}

/**
 * Constrains a hue to an accessible saturation/lightness range.
 * Keeps colors vivid but readable in both light and dark contexts.
 *
 * @param hue - 0-360 hue value
 * @param mode - 'light' | 'dark'
 * @returns fully constrained HSL
 */
export function constrainHSL(hue: number, mode: 'light' | 'dark' = 'dark'): HSL {
  return {
    h: ((hue % 360) + 360) % 360,
    s: mode === 'dark' ? 55 : 50, // vibrant but not neon
    l: mode === 'dark' ? 40 : 50, // readable on both backgrounds
  };
}

/**
 * Returns 'white' or 'dark' label text to ensure WCAG AA contrast
 * against a given background hex color.
 */
export function autoContrast(hexColor: string): '#ffffff' | '#1a1a1a' {
  const rgb = hexToRGB(hexColor);
  // Relative luminance per WCAG 2.0
  const luminance = 0.2126 * sRGBChannel(rgb.r) + 0.7152 * sRGBChannel(rgb.g) + 0.0722 * sRGBChannel(rgb.b);
  return luminance > 0.4 ? '#1a1a1a' : '#ffffff';
}

/**
 * Converts hex (#RRGGBB or #RGB) to HSL.
 */
export function hexToHSL(hex: string): HSL {
  const { r, g, b } = hexToRGB(hex);
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;

  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Converts HSL to hex (#RRGGBB).
 */
export function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;

  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const to255 = (v: number) => Math.round((v + m) * 255);
  const toHex = (v: number) => to255(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ── Internal helpers ──

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function sRGBChannel(c: number): number {
  const cn = c / 255;
  return cn <= 0.03928 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4);
}
