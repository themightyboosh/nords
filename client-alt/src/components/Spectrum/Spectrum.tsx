import React from 'react';
import './Spectrum.css';

interface SpectrumProps {
  /** Current value 0–1 (maps to min–max of the semantic range) */
  value: number;
  /** Color of the filled portion */
  color: string;
  /** Optional label shown on hover/tooltip */
  label?: string;
  /** Width in px (default: 48) */
  width?: number;
}

/**
 * Spectrum — A compact, reusable range indicator component.
 * Used by Nords (container size = importance) and Lines (distance = weight).
 * Renders as a thin horizontal bar with a filled portion.
 */
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
      <div className="nords-spectrum__track" />
      <div
        className="nords-spectrum__fill"
        style={{
          width: `${clamped * 100}%`,
          backgroundColor: color,
        }}
      />
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
