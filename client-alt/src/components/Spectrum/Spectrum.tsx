/**
 * Spectrum.tsx — Universal Range Indicator Widget
 *
 * A compact horizontal bar that visualizes a normalized 0.0–1.0 value.
 * This is the core UI primitive for Nords' distance-as-data paradigm:
 *
 *   ╔══════════════════════════════════════╗
 *   ║  ████████████████░░░░░░░░░░●        ║
 *   ╚══════════════════════════════════════╝
 *   ^── track (full width, muted) ──^
 *        ^── fill (colored) ──^   ^── thumb (circle)
 *
 * Used in:
 *   - Nord cards → shows the node's scale/importance (size property)
 *   - Connection inspector → shows semantic distance value
 *   - Relationship flyout → shows the active connection's distance
 *   - Project Settings → spectrum configuration preview
 *
 * The value is clamped to [0, 1]. The fill and thumb are colored
 * by the `color` prop, typically matching the parent context's accent.
 *
 * @see docs/architecture/02_data_model_and_physics.md — Invariant 1: Distance is Truth
 */

import React from 'react';
import './Spectrum.css';

interface SpectrumProps {
  /** Current value 0–1 (maps to min–max of the semantic range) */
  value: number;
  /** Color of the filled portion and thumb border */
  color: string;
  /** Optional label shown on hover/tooltip */
  label?: string;
  /** Width in px (default: 48) */
  width?: number;
}

const Spectrum: React.FC<SpectrumProps> = ({
  value,
  color,
  label,
  width = 48,
}) => {
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div
      className="nords-spectrum"
      style={{ width }}
      title={label}
    >
      {/* Track — full-width muted background bar */}
      <div className="nords-spectrum__track" />
      {/* Fill — colored portion representing the value */}
      <div
        className="nords-spectrum__fill"
        style={{
          width: `${clamped * 100}%`,
          backgroundColor: color,
        }}
      />
      {/* Thumb — circular indicator at the value position */}
      <div
        className="nords-spectrum__thumb"
        style={{
          left: `${clamped * 100}%`,
          borderColor: color,
        }}
      />
    </div>
  );
};

export default Spectrum;
