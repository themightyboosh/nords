/**
 * NordsLogo.tsx — Standalone SVG Logo
 *
 * Placeholder mark consisting of three connected nodes forming a triangle,
 * representing Nords' graph-native identity. The three circles symbolize
 * the fundamental primitive (Nords/nodes) and the connecting lines
 * represent Connections (relationships).
 *
 * Replace the paths when the final logo is ready.
 *
 * Props:
 *   - `size` defaults to 20px
 *   - Color inherits from CSS `currentColor`
 */

import React from 'react';

interface NordsLogoProps {
  /** Size of the logo in pixels (default: 20) */
  size?: number;
  /** Optional CSS class name */
  className?: string;
}

const NordsLogo: React.FC<NordsLogoProps> = ({ size = 20, className }) => {
  // Original icon was 24x24. The lockup width needs to be roughly 90.
  // We'll compute the width purely to help React sizing, or just let CSS handle it.
  const aspectRatio = 90 / 24;
  const computedWidth = size * aspectRatio;

  return (
    <svg
      width={computedWidth}
      height={size}
      viewBox="0 0 90 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Three connected nodes forming a triangle */}
      <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="19" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Connection lines connecting the three nodes */}
      <line x1="10" y1="7" x2="6.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="14" y1="7" x2="17.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <line x1="7.5" y1="18" x2="16.5" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      
      {/* Wordmark Lockup */}
      <text x="28" y="18" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="18" fill="currentColor" letterSpacing="-0.02em">
        nords
      </text>
    </svg>
  );
};

export default NordsLogo;
