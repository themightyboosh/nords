/**
 * color.test.ts — Unit tests for color utility functions.
 *
 * Validates HSL↔Hex conversion, contrast computation, and HSL constraints.
 */

import { describe, it, expect } from 'vitest';
import { hexToHSL, hslToHex, autoContrast, constrainHSL } from './color';

describe('hexToHSL', () => {
  it('converts pure red', () => {
    const { h, s, l } = hexToHSL('#ff0000');
    expect(h).toBe(0);
    expect(s).toBe(100);
    expect(l).toBe(50);
  });

  it('converts pure green', () => {
    const { h } = hexToHSL('#00ff00');
    expect(h).toBe(120);
  });

  it('converts pure blue', () => {
    const { h } = hexToHSL('#0000ff');
    expect(h).toBe(240);
  });

  it('converts white', () => {
    const { s, l } = hexToHSL('#ffffff');
    expect(s).toBe(0);
    expect(l).toBe(100);
  });

  it('converts black', () => {
    const { s, l } = hexToHSL('#000000');
    expect(s).toBe(0);
    expect(l).toBe(0);
  });

  it('handles 3-char shorthand', () => {
    const result = hexToHSL('#f00');
    expect(result.h).toBe(0);
    expect(result.s).toBe(100);
  });
});

describe('hslToHex', () => {
  it('converts hue 0 / red', () => {
    const hex = hslToHex(0, 100, 50);
    expect(hex).toBe('#ff0000');
  });

  it('converts hue 120 / green', () => {
    const hex = hslToHex(120, 100, 50);
    expect(hex).toBe('#00ff00');
  });

  it('converts hue 240 / blue', () => {
    const hex = hslToHex(240, 100, 50);
    expect(hex).toBe('#0000ff');
  });

  it('round-trips through hexToHSL', () => {
    const original = '#3d7c4f';
    const { h, s, l } = hexToHSL(original);
    const roundTripped = hslToHex(h, s, l);
    // Allow ±1 per channel due to rounding
    const diff = (a: string, b: string) => {
      const parse = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
      const [ar, ag, ab] = parse(a);
      const [br, bg, bb] = parse(b);
      return Math.abs(ar - br) <= 1 && Math.abs(ag - bg) <= 1 && Math.abs(ab - bb) <= 1;
    };
    expect(diff(roundTripped, original)).toBe(true);
  });
});

describe('autoContrast', () => {
  it('returns white text for dark backgrounds', () => {
    expect(autoContrast('#000000')).toBe('#ffffff');
    expect(autoContrast('#1a1a2e')).toBe('#ffffff');
    expect(autoContrast('#333333')).toBe('#ffffff');
  });

  it('returns dark text for light backgrounds', () => {
    expect(autoContrast('#ffffff')).toBe('#1a1a1a');
    expect(autoContrast('#f0f0f0')).toBe('#1a1a1a');
  });
});

describe('constrainHSL', () => {
  it('wraps hue to 0-360', () => {
    expect(constrainHSL(400).h).toBe(40);
    expect(constrainHSL(-30).h).toBe(330);
  });

  it('uses correct saturation/lightness for dark mode', () => {
    const result = constrainHSL(180, 'dark');
    expect(result.s).toBe(55);
    expect(result.l).toBe(40);
  });

  it('uses correct saturation/lightness for light mode', () => {
    const result = constrainHSL(180, 'light');
    expect(result.s).toBe(50);
    expect(result.l).toBe(50);
  });
});
