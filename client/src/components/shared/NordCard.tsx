/**
 * NordCard.tsx — Shared visual card for nords.
 *
 * Single source of truth for what a nord looks like. Used by:
 *   - NordNode.tsx (canvas) — wraps with ReactFlow Handles + zoom scaling
 *   - MatrixView.tsx (board) — wraps with <button> + click handler
 *
 * This component is purely presentational. It renders the .nords-node
 * DOM structure and CSS classes from CanvasEngine.css.
 */

import React from 'react';

export interface NordCardProps {
  title: string;
  typeName: string;
  typeColor: string;
  typeIcon?: React.ElementType;
  properties?: Array<{ key: string; value: string; color?: string }>;
  maxProperties?: number;
  isSelected?: boolean;
  isGhosted?: boolean;
  /** Optional extra className on the .nords-node container */
  className?: string;
  /** Override container width (canvas = 225px, board = 100%) */
  style?: React.CSSProperties;
  /** Ref forwarded to the outer div */
  innerRef?: React.Ref<HTMLDivElement>;
  'data-testid'?: string;
}

export const NordCard: React.FC<NordCardProps> = ({
  title,
  typeName,
  typeColor,
  typeIcon: Icon,
  properties = [],
  maxProperties = 3,
  isSelected,
  isGhosted,
  className,
  style,
  innerRef,
  ...rest
}) => {
  const visibleProps = properties.slice(0, maxProperties);
  const hiddenCount = Math.max(0, properties.length - maxProperties);

  const containerClasses = [
    'nords-node',
    isSelected ? 'is-selected' : '',
    isGhosted ? 'nords-node--ghosted' : '',
    className || '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={innerRef}
      className={containerClasses}
      style={{
        backgroundColor: `color-mix(in srgb, ${typeColor || '#fff'} 10%, var(--nords-color-bg-surface))`,
        borderColor: `color-mix(in srgb, ${typeColor || '#fff'} 20%, var(--nords-color-border-default))`,
        ...style,
      }}
      data-testid={rest['data-testid']}
    >
      <div className="nords-node__titlebar">
        <div className="nords-node__header">
          {Icon && <Icon size={14} strokeWidth={2} color={typeColor} />}
          <span className="nords-node__type-label" style={{ color: typeColor }}>
            {typeName}
          </span>
        </div>
      </div>

      <h3 className="nords-node__title">{title}</h3>

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

      <div className="nords-node__footer">
        {hiddenCount > 0 && (
          <span className="nords-node__more">+{hiddenCount} more</span>
        )}
      </div>
    </div>
  );
};
