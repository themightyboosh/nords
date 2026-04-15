/**
 * DetailDrawer — Live-editing panel for Nords and Connections.
 *
 * Uses `useDrawerEntity` for reactive data subscription and
 * optimistic mutations. Wrapped in `FloatingPanel` for unified
 * windowing behavior (escape, responsive bottom sheet, etc.).
 *
 * Two modes:
 *   - Nord Mode: Title editing, schema-driven properties, connections list, description
 *   - Line Mode: Direction toggle, distance display, endpoint display
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { useDrawerEntity } from '../../hooks/useDrawerEntity';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { PropertyField } from './PropertyField';
import { MarkdownEditor } from './MarkdownEditor';
import { useStore } from '@xyflow/react';
import './DetailDrawer.css';
import './PropertyField.css';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string | null;
  entityType: 'nord' | 'connection';
  /** Schema lookup: typeId → PropertySchema[] */
  typeSchemas?: Map<string, Array<{
    name: string;
    type: string;
    options?: string[];
    card_row?: number;
  }>>;
  /** Callback when user clicks a connection in the connections tab */
  onSelectConnection?: (connectionId: string) => void;
}

// ── Direction Toggle Button Group ──
const DIRECTIONS = [
  { value: 'forward' as const, label: '→', title: 'Forward' },
  { value: 'reverse' as const, label: '←', title: 'Reverse' },
  { value: 'both' as const, label: '↔', title: 'Bidirectional' },
  { value: 'neither' as const, label: '—', title: 'None' },
];

function DirectionToggle({
  value,
  color,
  onChange,
}: {
  value: string;
  color: string;
  onChange: (dir: 'forward' | 'reverse' | 'both' | 'neither') => void;
}) {
  // Map visual direction back to DB direction
  const dbValue = value === 'to' ? 'forward'
    : value === 'from' ? 'reverse'
    : value === 'both' ? 'both'
    : 'neither';

  return (
    <div className="nords-direction-toggle">
      {DIRECTIONS.map(d => (
        <button
          key={d.value}
          className={`nords-direction-toggle__btn ${dbValue === d.value ? 'is-active' : ''}`}
          style={dbValue === d.value ? { borderColor: color, color } : undefined}
          onClick={() => onChange(d.value)}
          title={d.title}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

// ── Connections Tab: List all edges for this nord ──
function ConnectionsList({
  nordId,
  color,
  onSelectConnection,
}: {
  nordId: string;
  color: string;
  onSelectConnection?: (connectionId: string) => void;
}) {
  // Subscribe to all edges that reference this nord
  const connectedEdges = useStore(
    (s) => s.edges.filter(e => e.source === nordId || e.target === nordId),
    (a, b) => a.length === b.length && a.every((e, i) => e.id === b[i]?.id)
  );

  // Lookup node names
  const nodeNames = useStore(
    (s) => {
      const names: Record<string, string> = {};
      connectedEdges.forEach(e => {
        const src = s.nodeLookup.get(e.source);
        const tgt = s.nodeLookup.get(e.target);
        if (src) names[e.source] = (src.data?.title as string) || 'Untitled';
        if (tgt) names[e.target] = (tgt.data?.title as string) || 'Untitled';
      });
      return names;
    },
    (a, b) => JSON.stringify(a) === JSON.stringify(b)
  );

  if (connectedEdges.length === 0) {
    return (
      <div className="nords-drawer-empty">
        No connections yet. Draw a line from this nord to another.
      </div>
    );
  }

  return (
    <div className="nords-connections-list">
      {connectedEdges.map(edge => {
        const data = edge.data as any;
        const isSource = edge.source === nordId;
        const otherName = isSource ? nodeNames[edge.target] : nodeNames[edge.source];
        const dirIcon = data?.direction === 'to' ? '→'
          : data?.direction === 'from' ? '←'
          : data?.direction === 'both' ? '↔'
          : '—';

        return (
          <button
            key={edge.id}
            className="nords-connection-row"
            onClick={() => onSelectConnection?.(edge.id)}
          >
            <span
              className="nords-connection-row__type-dot"
              style={{ backgroundColor: data?.color || '#888' }}
            />
            <span className="nords-connection-row__type">{data?.type || 'Connection'}</span>
            <span className="nords-connection-row__dir">{dirIcon}</span>
            <span className="nords-connection-row__target">{otherName || '…'}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Component ──
const DetailDrawer: React.FC<DetailDrawerProps> = ({
  isOpen,
  onClose,
  entityId,
  entityType,
  typeSchemas,
  onSelectConnection,
}) => {
  const { entity, mutations } = useDrawerEntity(entityId, entityType);
  const [activeTab, setActiveTab] = useState<'properties' | 'connections' | 'comments'>('properties');
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Debounced title update
  const debouncedTitleUpdate = useDebouncedCallback((text: string) => {
    if (text) mutations.updateTitle(text);
  }, 500);

  const handleTitleInput = useCallback(() => {
    const text = titleRef.current?.textContent?.trim() || '';
    debouncedTitleUpdate(text);
  }, [debouncedTitleUpdate]);

  // Get the schema for this entity's type (works for both nord and connection)
  const schema = useMemo(() => {
    if (!typeSchemas || !entity) return [];
    return typeSchemas.get(entity.typeId) || [];
  }, [entity, typeSchemas]);

  // Nord properties
  const schemaProperties = useMemo(() => {
    if (entity?.kind !== 'nord') return [];
    const propsMap = new Map(entity.properties.map(p => [p.key, p.value]));
    return schema.map(s => ({
      name: s.name,
      type: s.type as any,
      value: propsMap.get(s.name) ?? '',
      options: s.options,
      cardRow: s.card_row,
    }));
  }, [entity, schema]);

  // Connection properties
  const connectionProperties = useMemo(() => {
    if (entity?.kind !== 'connection') return [];
    const propsMap = new Map(entity.properties.map(p => [p.key, p.value]));
    return schema.map(s => ({
      name: s.name,
      type: s.type as any,
      value: propsMap.get(s.name) ?? '',
      options: s.options,
    }));
  }, [entity, schema]);

  // Resolve closest spectrum label for a connection
  const resolvedSpectrumLabel = useMemo(() => {
    if (entity?.kind !== 'connection') return null;
    const labels = entity.xStageLabels;
    if (!labels || labels.length === 0) return null;
    const dx = entity.distanceX;
    let closest = labels[0];
    let minDist = Math.abs(dx - labels[0].position);
    for (const l of labels) {
      const d = Math.abs(dx - l.position);
      if (d < minDist) { minDist = d; closest = l; }
    }
    return closest.label;
  }, [entity]);

  // Handle description update
  const handleDescriptionChange = useCallback((text: string) => {
    if (!entityId) return;
    mutations.updateProperty('_description', text);
  }, [entityId, mutations]);

  if (!entityId) return null;

  // ── Nord Mode ──
  if (entity?.kind === 'nord') {
    const connectionCount = 0; // Will be derived from edges

    return (
      <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose}>
        {/* Header */}
        <header className="nords-drawer-header">
          <div className="nords-drawer-type-badge" style={{
            color: entity.typeColor,
            borderColor: entity.typeColor,
          }}>
            {entity.type}
          </div>
          <button className="nords-close-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="nords-drawer-content">
          {/* Editable Title */}
          <h1
            ref={titleRef}
            className="nords-drawer-title"
            contentEditable
            suppressContentEditableWarning
            onInput={handleTitleInput}
          >
            {entity.title}
          </h1>

          {/* Tab Bar */}
          <div className="nords-drawer-tabs">
            <button
              className={`nords-drawer-tab ${activeTab === 'properties' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              Properties
              {schemaProperties.length > 0 && (
                <span className="nords-drawer-tab__count">{schemaProperties.length}</span>
              )}
            </button>
            <button
              className={`nords-drawer-tab ${activeTab === 'connections' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('connections')}
            >
              Connections
            </button>
            <button
              className={`nords-drawer-tab ${activeTab === 'comments' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('comments')}
            >
              Comments
            </button>
          </div>

          {/* Properties Tab — Schema-Driven */}
          {activeTab === 'properties' && (
            <div className="nords-properties-list">
              {schemaProperties.length > 0 ? (
                schemaProperties.map((p) => (
                  <PropertyField
                    key={p.name}
                    name={p.name}
                    type={p.type}
                    value={p.value}
                    options={p.options}
                    color={entity.typeColor}
                    onChange={(v) => mutations.updateProperty(p.name, v as string)}
                  />
                ))
              ) : (
                <div className="nords-drawer-empty">
                  No properties defined for this type.
                  <span className="nords-drawer-empty__hint">
                    Add properties in Manage Types.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Connections Tab — Live Edge List */}
          {activeTab === 'connections' && (
            <ConnectionsList
              nordId={entity.id}
              color={entity.typeColor}
              onSelectConnection={onSelectConnection}
            />
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="nords-drawer-comments">
              <div className="nords-drawer-empty">
                Comments coming soon.
              </div>
            </div>
          )}

          {/* Description — Always visible below tabs */}
          <MarkdownEditor
            value={entity.properties.find(p => p.key === '_description')?.value || ''}
            onChange={handleDescriptionChange}
            placeholder="Write a description for this nord…"
          />
        </div>
      </FloatingPanel>
    );
  }

  // ── Line Mode (Connection) ──
  if (entity?.kind === 'connection') {
    const headerLabel = entity.verb
      ? `${entity.type.toUpperCase()}: ${entity.verb}`
      : entity.type.toUpperCase();

    return (
      <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose}>
        <header className="nords-drawer-header">
          <div className="nords-drawer-type-badge" style={{
            color: entity.typeColor,
            borderColor: entity.typeColor,
          }}>
            {headerLabel}
          </div>
          <button className="nords-close-btn" onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className="nords-drawer-content">
          {/* Endpoints + verb sentence */}
          <div className="nords-drawer-line-header">
            <span className="nords-drawer-endpoint">{entity.sourceName}</span>
            <span className="nords-drawer-direction" style={{ color: entity.typeColor }}>
              {entity.direction === 'to' ? '→' : entity.direction === 'from' ? '←' : entity.direction === 'both' ? '↔' : '—'}
            </span>
            <span className="nords-drawer-endpoint">{entity.targetName}</span>
          </div>
          {entity.verb && (
            <div className="nords-drawer-relationship" style={{ color: entity.typeColor }}>
              {entity.sourceName}{' '}
              <em>{entity.verb}</em>{' '}
              {entity.direction === 'to' ? entity.prepositions.forward
                : entity.direction === 'from' ? entity.prepositions.reverse
                : entity.direction === 'both' ? entity.prepositions.both
                : 'related to'}{' '}
              {entity.targetName}
            </div>
          )}

          {/* Direction Toggle */}
          <div className="nords-drawer-section">
            <h3 className="nords-drawer-section-title">Direction</h3>
            <DirectionToggle
              value={entity.direction}
              color={entity.typeColor}
              onChange={mutations.updateDirection}
            />
          </div>

          {/* Spectrum Position — closest label, read-only */}
          {resolvedSpectrumLabel && (
            <div className="nords-drawer-section">
              <h3 className="nords-drawer-section-title">Position</h3>
              <div className="nords-spectrum-label" style={{ borderColor: entity.typeColor }}>
                <span className="nords-spectrum-label__value" style={{ color: entity.typeColor }}>
                  {resolvedSpectrumLabel}
                </span>
                <span className="nords-spectrum-label__hint">
                  Drag on the board to reposition
                </span>
              </div>
            </div>
          )}

          {/* Properties — schema-driven values (schema defined at type level) */}
          {connectionProperties.length > 0 && (
            <div className="nords-drawer-section">
              <h3 className="nords-drawer-section-title">Properties</h3>
              <div className="nords-properties-list">
                {connectionProperties.map((p) => (
                  <PropertyField
                    key={p.name}
                    name={p.name}
                    type={p.type}
                    value={p.value}
                    options={p.options}
                    color={entity.typeColor}
                    onChange={(v) => mutations.updateConnectionProperty(p.name, v as string)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </FloatingPanel>
    );
  }


  // Entity not found (loading or stale ID)
  return (
    <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose}>
      <header className="nords-drawer-header">
        <div className="nords-drawer-type">Loading…</div>
        <button className="nords-close-btn" onClick={onClose} aria-label="Close">×</button>
      </header>
      <div className="nords-drawer-content">
        <div className="nords-drawer-empty">Select a nord or connection to view details.</div>
      </div>
    </FloatingPanel>
  );
};

export default DetailDrawer;
