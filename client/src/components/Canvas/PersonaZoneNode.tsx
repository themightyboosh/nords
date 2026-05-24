/**
 * PersonaZoneNode — Renders a circular ring behind the persona radial layout.
 *
 * Multiple instances are stacked concentrically (outermost → innermost).
 * Each ring represents a category weight level, colored on a
 * green→blue→red gradient. Inner rings cover the center of outer rings,
 * creating visible color bands.
 *
 * The ring closest to weight=0 gets a 2px white border.
 */

import React, { memo } from 'react';
import type { NodeProps, Node } from '@xyflow/react';

interface PersonaZoneData {
  /** Radius of the circle in px */
  radius: number;
  /** CSS color — hsla() with alpha baked in */
  color: string;
  /** If true, add a 2px white border (weight=0 boundary) */
  showBorder?: boolean;
  [key: string]: unknown;
}

export type PersonaZoneNodeType = Node<PersonaZoneData, 'personaZone'>;

export const PersonaZoneNode = memo(({ data }: NodeProps<PersonaZoneNodeType>) => {
  const diameter = data.radius * 2;

  return (
    <div
      className="persona-zone-node"
      style={{
        width: `${diameter}px`,
        height: `${diameter}px`,
        borderRadius: '50%',
        background: data.color,
        border: data.showBorder ? '2px solid rgba(255, 255, 255, 0.7)' : 'none',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        transition: 'width 600ms cubic-bezier(0.25,0.46,0.45,0.94), height 600ms cubic-bezier(0.25,0.46,0.45,0.94)',
      }}
    />
  );
});

export default PersonaZoneNode;
