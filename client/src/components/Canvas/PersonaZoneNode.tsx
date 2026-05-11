/**
 * PersonaZoneNode — Renders a circular bias-indicator zone behind the radial layout.
 *
 * Two instances are placed at the center of the persona layout:
 *   1. Red zone (bottom layer)  — radius covers ALL nords (score -100 to +100)
 *   2. Green zone (top of red)  — radius covers positive-bias nords (score 0 to +100)
 *      The green circle has a 2px white border to clearly delineate the
 *      positive/negative bias boundary.
 *
 * Uses flat solid colors at low opacity — no gradients.
 */

import React, { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

interface PersonaZoneData {
  /** Radius of the circle in px */
  radius: number;
  /** CSS color — should be a dark, muted tone (e.g. '#7f1d1d', '#14532d') */
  color: string;
  /** If true, add a 2px white border (used for the green zone) */
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
        background: data.color,
        opacity: 0.18,
        border: data.showBorder ? '2px solid rgba(255, 255, 255, 0.8)' : 'none',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        transition: 'width 600ms cubic-bezier(0.25,0.46,0.45,0.94), height 600ms cubic-bezier(0.25,0.46,0.45,0.94)',
      }}
    />
  );
});

export default PersonaZoneNode;
