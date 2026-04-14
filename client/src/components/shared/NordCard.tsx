/**
 * NordCard.tsx — Shared presentational card used by NordNode (canvas) and MatrixView.
 *
 * Renders the same visual structure everywhere a nord appears:
 *   - Type header (icon + colored label)
 *   - Title
 *   - Property key:value rows (up to 3)
 *   - Footer slot ("+N more", jump badges, etc.)
 *
 * The canvas wraps this in ReactFlow Handles; the matrix wraps it in a <button>.
 * This component is purely presentational — no interaction logic.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface NordCardProps {
  title: string;
  typeName: string;
  typeColor: string;
  typeIcon?: LucideIcon | React.ElementType;
  properties?: Array<{ key: string; value: string; color?: string }>;
  maxProperties?: number;
  isSelected?: boolean;
  isGhosted?: boolean;
  /** Extra content rendered below properties (badges, distance, etc.) */
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const NordCard = React.memo<NordCardProps>(({
  title,
  typeName,
  typeColor,
  typeIcon: Icon,
  properties = [],
  maxProperties = 3,
  isSelected,
  isGhosted,
  footer,
  className = '',
  style,
}) => {
  const visibleProps = properties.slice(0, maxProperties);
  const hiddenCount = Math.max(0, properties.length - maxProperties);

  const containerClasses = [
    'nords-node',
    isSelected ? 'is-selected' : '',
    isGhosted ? 'nords-node--ghosted' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      style={{
        backgroundColor: `color-mix(in srgb, ${typeColor || '#fff'} 10%, var(--nords-color-bg-surface))`,
        borderColor: `color-mix(in srgb, ${typeColor || '#fff'} 20%, var(--nords-color-border-default))`,
        ...style,
      }}
    >
      {/* Type header */}
      <div className="nords-node__titlebar">
        <div className="nords-node__header">
          {Icon && <Icon size={14} strokeWidth={2} color={typeColor} />}
          <span className="nords-node__type-label" style={{ color: typeColor }}>
            {typeName}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="nords-node__title">{title}</h3>

      {/* Properties */}
      {visibleProps.length > 0 && (
        <div className="nords-node__props">
          {visibleProps.map((p) => (
            <div key={p.key} className="nords-node__prop">
              <span className="nords-node__prop-key">{p.key}</span>
              <span
                className="nords-node__prop-value"
                style={p.color ? { color: p.color } : undefined}
              >
                {p.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="nords-node__footer">
        {hiddenCount > 0 && (
          <span className="nords-node__more">+{hiddenCount} more</span>
        )}
        {footer}
      </div>
    </div>
  );
});

NordCard.displayName = 'NordCard';
