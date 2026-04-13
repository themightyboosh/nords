import React from 'react';
import { useReactFlow } from '@xyflow/react';
import './DetailDrawer.css';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string | null;
  entityType: 'nord' | 'connection';
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({ isOpen, onClose, entityId, entityType }) => {
  const { getNode, getEdge } = useReactFlow();
  if (!isOpen || !entityId) return null;

  // ── Nord Mode ──
  if (entityType === 'nord') {
    const node = getNode(entityId);
    const title = node?.data?.title as string || 'Unknown Node';
    const type = node?.data?.type as string || 'Task';

    return (
      <div className="nords-drawer nords-glass">
        <header className="nords-drawer-header">
          <div className="nords-drawer-type">🔳 {type}</div>
          <button className="nords-close-btn" onClick={onClose}>×</button>
        </header>

        <div className="nords-drawer-content">
          <h1 className="nords-drawer-title" contentEditable suppressContentEditableWarning>
            {title}
          </h1>
          
          <div className="nords-properties-list">
            {(node?.data?.properties as any[])?.map((p: any) => (
              <div key={p.key} className="nords-property-row">
                <span className="nords-prop-label">{p.key}</span>
                <span className="nords-prop-value nords-pill">{p.value}</span>
              </div>
            ))}
            <div className="nords-property-row nords-add-property">
              <span>+ Add Property</span>
            </div>
          </div>

          <div className="nords-drawer-markdown">
            <p>Description content will be rendered here as markdown.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Line Mode (Connection) ──
  const edge = getEdge(entityId);
  const edgeData = edge?.data || {};
  const typeName = (edgeData as any)?.type || 'Connection';
  const color = (edgeData as any)?.color || '#888';
  const direction = (edgeData as any)?.direction || 'none';

  const sourceNode = edge?.source ? getNode(edge.source) : null;
  const targetNode = edge?.target ? getNode(edge.target) : null;
  const sourceName = (sourceNode?.data?.title as string) || 'Source';
  const targetName = (targetNode?.data?.title as string) || 'Target';

  // Direction display
  const directionLabel = direction === 'to' ? '→'
    : direction === 'from' ? '←'
    : direction === 'both' ? '↔'
    : '—';

  return (
    <div className="nords-drawer nords-glass">
      <header className="nords-drawer-header">
        <div className="nords-drawer-type" style={{ color }}>
          ⟟ {typeName}
        </div>
        <button className="nords-close-btn" onClick={onClose}>×</button>
      </header>

      <div className="nords-drawer-content">
        <div className="nords-drawer-line-header">
          <span className="nords-drawer-endpoint">{sourceName}</span>
          <span className="nords-drawer-direction" style={{ color }}>{directionLabel}</span>
          <span className="nords-drawer-endpoint">{targetName}</span>
        </div>

        <div className="nords-properties-list">
          <div className="nords-property-row">
            <span className="nords-prop-label">Direction</span>
            <span className="nords-prop-value nords-pill">{direction}</span>
          </div>
          <div className="nords-property-row">
            <span className="nords-prop-label">Distance X</span>
            <span className="nords-prop-value nords-pill">{(edgeData as any)?._distanceX?.toFixed(2) || '0.50'}</span>
          </div>
          <div className="nords-property-row">
            <span className="nords-prop-label">Distance Y</span>
            <span className="nords-prop-value nords-pill">{(edgeData as any)?._distanceY?.toFixed(2) || '0.50'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailDrawer;
