/**
 * PersonaAvatar — Shared DiceBear Micah avatar component.
 *
 * Single source of truth for persona avatars across the app:
 *   - ManagePersonas sidebar + editor
 *   - PersonaCenterNode (canvas persona mode)
 *   - PersonaLensDrawer (category drawer)
 *
 * Uses the Micah style exclusively per user preference.
 */

import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { micah } from '@dicebear/collection';

interface PersonaAvatarProps {
  /** Seed string for deterministic avatar generation */
  seed: string;
  /** Render size in px */
  size?: number;
  /** Background color (hex) — defaults to transparent */
  bgColor?: string;
  /** Additional CSS class */
  className?: string;
  /** onClick handler */
  onClick?: () => void;
}

export function PersonaAvatar({
  seed,
  size = 64,
  bgColor,
  className,
  onClick,
}: PersonaAvatarProps) {
  const dataUri = useMemo(() => {
    return createAvatar(micah, {
      seed,
      size,
      backgroundColor: bgColor ? [bgColor.replace('#', '')] : ['transparent'],
    }).toDataUri();
  }, [seed, size, bgColor]);

  return (
    <img
      src={dataUri}
      alt="Persona avatar"
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bgColor || 'transparent',
      }}
      onClick={onClick}
    />
  );
}

/**
 * Generate a data URI for a Micah avatar (for canvas/SVG contexts).
 */
export function generateAvatarUri(seed: string, size = 64, bgColor?: string): string {
  return createAvatar(micah, {
    seed,
    size,
    backgroundColor: bgColor ? [bgColor.replace('#', '')] : ['transparent'],
  }).toDataUri();
}
