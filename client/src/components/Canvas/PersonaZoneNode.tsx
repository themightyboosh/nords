/**
 * PersonaZoneNode — Renders a circular bias-indicator zone behind the radial layout.
 *
 * Two instances are placed at the center of the persona layout:
 *   1. Red zone (bottom layer)  — radius covers ALL nords (score -100 to +100)
 *   2. Green zone (top of red)  — radius covers positive-bias nords (score 0 to +100)
 *      The green circle has a 1px gray border to clearly delineate the
 *      positive/negative bias boundary.
 *
 * Uses a soft radial gradient to create a glowing disc effect that's visible
 * against the dark canvas but doesn't overpower the card nodes on top.
 */

import React, { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

interface PersonaZoneData {
  /** Radius of the circle in px */
  radius: number;
  /** CSS color — should be a dark, muted tone (e.g. '#7f1d1d', '#14532d') */
  color: string;
  /** If true, add a 1px gray border (used for the green zone) */
  showBorder?: boolean;
}

export const PersonaZoneNode = memo(({ data }: NodeProps<PersonaZoneData>) => {
  const diameter = data.radius * 2;

  return (
    <div
      className="persona-zone-node"
      style={{
        width: `${diameter}px`,
        height: `${diameter}px`,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${data.color}99 0%, ${data.color}55 50%, ${data.color}22 75%, transparent 100%)`,
        border: data.showBorder ? '1px solid rgba(160, 160, 160, 0.35)' : 'none',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        transition: 'width 600ms cubic-bezier(0.25,0.46,0.45,0.94), height 600ms cubic-bezier(0.25,0.46,0.45,0.94)',
      }}
    />
  );
});

export default PersonaZoneNode;
