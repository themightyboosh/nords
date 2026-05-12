/**
 * HueSlider — Shared hue color picker with preview swatch.
 *
 * Used by ManageTypes, ManagePersonas, and any future panel
 * that needs a color selection control.
 */

import React from 'react';
import { hslToHex, hexToHSL } from '../../utils/color';

interface HueSliderProps {
  /** Current hex color value */
  color: string;
  /** Called with new hex value when hue changes */
  onChange: (hex: string) => void;
  /** HSL saturation (default: 55) */
  saturation?: number;
  /** HSL lightness (default: 35) */
  lightness?: number;
}

export function HueSlider({ color, onChange, saturation = 55, lightness = 35 }: HueSliderProps) {
  const hue = hexToHSL(color || '#3d4f7c').h;
  const s = saturation;
  const l = lightness;

  return (
    <div className="nords-form__color-row">
      <input
        type="range"
        min="0"
        max="360"
        value={hue}
        onChange={(e) => onChange(hslToHex(parseInt(e.target.value), s, l))}
        className="nords-form__hue-slider"
        style={{
          background: `linear-gradient(to right, 
            hsl(0, ${s}%, ${l}%), hsl(60, ${s}%, ${l}%), hsl(120, ${s}%, ${l}%), 
            hsl(180, ${s}%, ${l}%), hsl(240, ${s}%, ${l}%), hsl(300, ${s}%, ${l}%), hsl(360, ${s}%, ${l}%))`,
        }}
      />
      <span className="nords-form__color-preview" style={{ backgroundColor: color || '#3d4f7c' }} />
    </div>
  );
}
