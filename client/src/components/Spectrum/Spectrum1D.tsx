/**
 * Spectrum1D — A 1-dimensional spectrum bar widget.
 *
 * Two modes:
 *   - Read-only: thin 4px bar for NordCard footers
 *   - Interactive: 8px bar with draggable thumb for ManageTypes stage editor
 *
 * Value is always 0.0–1.0.
 */

import React, { useCallback, useRef, useState } from 'react';
import './Spectrum.css';

export interface Spectrum1DProps {
  value: number;            // 0.0–1.0
  color?: string;           // accent color
  stageLabels?: string[];   // e.g. ["To Do", "In Progress", "Done"]
  interactive?: boolean;    // draggable vs read-only
  onChange?: (value: number) => void;
  className?: string;
}

export function Spectrum1D({
  value,
  color = 'var(--nords-color-accent)',
  stageLabels,
  interactive = false,
  onChange,
  className = '',
}: Spectrum1DProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = (v: number) => Math.min(1, Math.max(0, v));

  const getValueFromEvent = useCallback((clientX: number) => {
    if (!barRef.current) return value;
    const rect = barRef.current.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width);
  }, [value]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!interactive) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const newVal = getValueFromEvent(e.clientX);
    onChange?.(newVal);
  }, [interactive, getValueFromEvent, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const newVal = getValueFromEvent(e.clientX);
    onChange?.(newVal);
  }, [dragging, getValueFromEvent, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Compute stage bucket index
  const stageCount = stageLabels?.length || 0;
  const stageIndex = stageCount > 0
    ? Math.min(Math.floor(value * stageCount), stageCount - 1)
    : -1;

  return (
    <div
      className={`spectrum-1d ${interactive ? 'spectrum-1d--interactive' : 'spectrum-1d--readonly'} ${className}`}
      data-testid="spectrum-1d"
    >
      {/* Stage labels (shown above the bar) */}
      {stageLabels && stageLabels.length > 0 && (
        <div className="spectrum-1d__labels">
          {stageLabels.map((label, i) => (
            <span
              key={label}
              className={`spectrum-1d__label ${i === stageIndex ? 'spectrum-1d__label--active' : ''}`}
              style={{ width: `${100 / stageLabels.length}%` }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Bar track */}
      <div
        ref={barRef}
        className={`spectrum-1d__track ${dragging ? 'spectrum-1d__track--dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Fill */}
        <div
          className="spectrum-1d__fill"
          style={{
            width: `${clamp(value) * 100}%`,
            backgroundColor: color,
          }}
        />

        {/* Stage dividers */}
        {stageLabels && stageLabels.length > 1 && (
          stageLabels.slice(1).map((_, i) => (
            <div
              key={i}
              className="spectrum-1d__divider"
              style={{ left: `${((i + 1) / stageLabels.length) * 100}%` }}
            />
          ))
        )}

        {/* Thumb (interactive only) */}
        {interactive && (
          <div
            className="spectrum-1d__thumb"
            style={{
              left: `${clamp(value) * 100}%`,
              borderColor: color,
            }}
          />
        )}
      </div>
    </div>
  );
}
