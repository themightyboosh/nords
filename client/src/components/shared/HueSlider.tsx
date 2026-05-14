/**
 * HueSlider — Shared hue color picker with preview swatch.
 *
 * Used by ManageTypes, ManagePersonas, and any future panel
 * that needs a color selection control.
 *
 * Tracks slider movement locally and only fires `onChange`
 * on mouseup/touchend to avoid flooding the API.
 */

import React, { useState, useCallback } from 'react';
import { hslToHex, hexToHSL } from '../../utils/color';

interface HueSliderProps {
  /** Current hex color value */
  color: string;
  /** Called with new hex value when user releases the slider */
  onChange: (hex: string) => void;
  /** HSL saturation (default: 55) */
  saturation?: number;
  /** HSL lightness (default: 35) */
  lightness?: number;
}

export function HueSlider({ color, onChange, saturation = 55, lightness = 35 }: HueSliderProps) {
  const s = saturation;
  const l = lightness;
  const initialHue = hexToHSL(color || '#3d4f7c').h;
  const [liveHue, setLiveHue] = useState<number>(initialHue);
  const [isDragging, setIsDragging] = useState(false);

  // Local hue tracks slider in real-time; only fire onChange on commit
  const displayHue = isDragging ? liveHue : hexToHSL(color || '#3d4f7c').h;
  const displayColor = isDragging ? hslToHex(liveHue, s, l) : (color || '#3d4f7c');

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hue = parseInt(e.target.value);
    setLiveHue(hue);
    setIsDragging(true);
  }, []);

  const handleCommit = useCallback(() => {
    setIsDragging(false);
    onChange(hslToHex(liveHue, s, l));
  }, [liveHue, s, l, onChange]);

  return (
    <div className="nords-form__color-row" data-testid="hue-slider">
      <input
        type="range"
        min="0"
        max="360"
        value={displayHue}
        onChange={handleInput}
        onMouseUp={handleCommit}
        onTouchEnd={handleCommit}
        className="nords-form__hue-slider"
        style={{
          background: `linear-gradient(to right, 
            hsl(0, ${s}%, ${l}%), hsl(60, ${s}%, ${l}%), hsl(120, ${s}%, ${l}%), 
            hsl(180, ${s}%, ${l}%), hsl(240, ${s}%, ${l}%), hsl(300, ${s}%, ${l}%), hsl(360, ${s}%, ${l}%))`,
        }}
      />
      <span className="nords-form__color-preview" style={{ backgroundColor: displayColor }} />
    </div>
  );
}
