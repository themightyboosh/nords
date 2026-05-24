/**
 * ColorIcon — Renders a Lucide icon tinted with its assigned color.
 *
 * The canonical "icon in color" primitive used across Nords:
 *   - Type/Category sidebar items
 *   - Selector dropdowns
 *   - Project cards
 *   - Anywhere an icon + color pair represents an entity
 *
 * Replaces the old pattern of a separate color swatch dot + uncolored icon.
 *
 * Usage:
 *   <ColorIcon icon="Bug" color="#e06040" size={16} />
 *   <ColorIcon icon="Heart" color="#e06040" size={24} withBg />
 */

import React from 'react';
import { resolveIcon } from '../../utils/iconRegistry';

interface ColorIconProps {
  /** Lucide icon name (from iconRegistry) */
  icon: string | null | undefined;
  /** Hex color to tint the icon */
  color: string;
  /** Icon size in px (default: 16) */
  size?: number;
  /** Stroke width (default: 1.6) */
  strokeWidth?: number;
  /** If true, renders a subtle tinted background circle behind the icon */
  withBg?: boolean;
  /** Additional className */
  className?: string;
  /** onClick handler */
  onClick?: () => void;
}

export function ColorIcon({
  icon,
  color,
  size = 16,
  strokeWidth = 1.6,
  withBg = false,
  className = '',
  onClick,
}: ColorIconProps) {
  const Icon = resolveIcon(icon);

  if (withBg) {
    const bgSize = Math.round(size * 1.75);
    return (
      <span
        className={`color-icon color-icon--bg ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: bgSize,
          height: bgSize,
          borderRadius: '50%',
          backgroundColor: `${color}20`,
          flexShrink: 0,
        }}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
      >
        <Icon size={size} strokeWidth={strokeWidth} style={{ color }} />
      </span>
    );
  }

  return (
    <Icon
      className={`color-icon ${className}`}
      size={size}
      strokeWidth={strokeWidth}
      style={{ color, flexShrink: 0 }}
      onClick={onClick}
    />
  );
}
