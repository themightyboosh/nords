import React from 'react';

/**
 * Nards Logo — standalone SVG.
 * Replace the <path> / <g> contents when the final logo is ready.
 * Props: size (defaults to 20), color inherits from currentColor.
 */
interface NardsLogoProps {
  size?: number;
  className?: string;
}

const NardsLogo: React.FC<NardsLogoProps> = ({ size = 20, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Placeholder mark — three connected nodes forming a triangle */}
    <circle cx="12" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="5" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="19" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="7" x2="6.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    <line x1="14" y1="7" x2="17.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
    <line x1="7.5" y1="18" x2="16.5" y2="18" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
  </svg>
);

export default NardsLogo;
