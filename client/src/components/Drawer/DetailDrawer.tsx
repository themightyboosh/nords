/**
 * DetailDrawer — Live-editing panel for Nords and Connections.
 *
 * Uses `useDrawerEntity` for reactive data subscription and
 * optimistic mutations. Wrapped in `FloatingPanel` for unified
 * windowing behavior (escape, responsive bottom sheet, etc.).
 *
 * ARCHITECTURE: View-agnostic — reads from raw graph data, NOT
 * React Flow's useStore. Works identically in graph and board views.
 *
 * Two modes:
 *   - Nord Mode: Title editing, schema-driven properties, category list, description
 *   - Line Mode: Direction toggle, distance display, endpoint display
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { useDrawerEntity } from '../../hooks/useDrawerEntity';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { PropertyField } from './PropertyField';
import { MarkdownEditor } from './MarkdownEditor';
import type { ProjectGraph } from '../../hooks/useProjectGraph';
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
  /** Raw graph data — used for view-agnostic entity resolution and category list */
  graph?: ProjectGraph | null;
  /** Refetch graph after mutations so both views stay in sync */
  refetchGraph?: () => Promise<void>;
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

// ── Category List: Groups connections by type ──
function CategoryList({
  nordId,
  graph,
  onSelectConnection,
  onDirectionChange,
}: {
  nordId: string;
  graph: ProjectGraph;
  onSelectConnection?: (connectionId: string) => void;
  onDirectionChange?: (connectionId: string, direction: 'forward' | 'reverse' | 'both' | 'neither') => void;
}) {
  // Build category groups: one per connection type
  const categories = useMemo(() => {
    const connectionTypes = graph.connection_types || [];
    const connections = graph.connections || [];
    const nords = graph.nords || [];

    // Build a quick lookup for nords by id
    const nordMap = new Map(nords.map(n => [n.id, n]));

    return connectionTypes.map(ct => {
      // Find all connections of this type involving this nord
      const myConnections = connections.filter(
        c => c.type_id === ct.id &&
          (c.source_nord_id === nordId || c.target_nord_id === nordId)
      );

      return {
        typeId: ct.id,
        typeName: ct.name,
        typeColor: ct.accent_color || '#888',
        connections: myConnections.map(c => {
          const otherNordId = c.source_nord_id === nordId ? c.target_nord_id : c.source_nord_id;
          const otherNord = nordMap.get(otherNordId);

          // Map DB direction to visual direction
          const visualDirection =
            c.direction === 'forward' ? 'to' :
            c.direction === 'reverse' ? 'from' :
            c.direction === 'both' ? 'both' :
            'none';

          return {
            id: c.id,
            otherNordId,
            otherNordTitle: otherNord?.title || 'Untitled',
            direction: visualDirection,
            dbDirection: c.direction,
          };
        }),
      };
    });
  }, [nordId, graph]);

  const activeCategories = categories.filter(c => c.connections.length > 0);
  const inactiveCategories = categories.filter(c => c.connections.length === 0);

  if (categories.length === 0) {
    return (
      <div className="nords-drawer-empty">
        No connection types defined.
        <span className="nords-drawer-empty__hint">
          Create connection types in Categories.
        </span>
      </div>
    );
  }

  return (
    <div className="nords-category-list">
      {/* Active categories: expanded with connection rows */}
      {activeCategories.map(cat => (
        <div key={cat.typeId} className="nords-category-group">
          <div className="nords-category-group__header">
            <span
              className="nords-category-group__dot"
              style={{ backgroundColor: cat.typeColor }}
            />
            <span className="nords-category-group__name">{cat.typeName}</span>
            <span className="nords-category-group__count">{cat.connections.length}</span>
          </div>
          <div className="nords-category-group__rows">
            {cat.connections.map(conn => (
              <div key={conn.id} className="nords-category-row">
                <button
                  className="nords-category-row__target"
                  onClick={() => onSelectConnection?.(conn.id)}
                  title={`View connection to ${conn.otherNordTitle}`}
                >
                  <span className="nords-category-row__dir-icon">
                    {conn.direction === 'to' ? '→'
                      : conn.direction === 'from' ? '←'
                      : conn.direction === 'both' ? '↔'
                      : '—'}
                  </span>
                  <span className="nords-category-row__name">{conn.otherNordTitle}</span>
                </button>
                <DirectionToggle
                  value={conn.direction}
                  color={cat.typeColor}
                  onChange={(dir) => onDirectionChange?.(conn.id, dir)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Inactive categories: collapsed, grayed out */}
      {inactiveCategories.map(cat => (
        <div key={cat.typeId} className="nords-category-group nords-category-group--inactive">
          <div className="nords-category-group__header">
            <span
              className="nords-category-group__dot"
              style={{ backgroundColor: cat.typeColor, opacity: 0.4 }}
            />
            <span className="nords-category-group__name">{cat.typeName}</span>
            <span className="nords-category-group__inactive-label">no connections</span>
          </div>
        </div>
      ))}
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
  graph,
  refetchGraph,
}) => {
  const { entity, mutations } = useDrawerEntity(entityId, entityType, graph || null, refetchGraph);
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

  // Handle direction change from CategoryList
  const handleCategoryDirectionChange = useCallback((connectionId: string, direction: 'forward' | 'reverse' | 'both' | 'neither') => {
    // Temporarily switch to the connection entity context for direction update
    const visualDirection =
      direction === 'forward' ? 'to' :
      direction === 'reverse' ? 'from' :
      direction === 'both' ? 'both' :
      'none';

    // Direct API call + refetch (since we're in Nord mode, not connection mode)
    api.put(`/api/connections/${connectionId}`, { direction })
      .then(() => refetchGraph?.())
      .catch((err: unknown) => {
        console.error('Failed to update direction:', err);
        refetchGraph?.();
      });
  }, [refetchGraph]);

  // Category count for the tab badge
  const categoryConnectionCount = useMemo(() => {
    if (!entityId || !graph) return 0;
    return graph.connections.filter(
      c => c.source_nord_id === entityId || c.target_nord_id === entityId
    ).length;
  }, [entityId, graph]);

  if (!entityId) return null;

  // ── Nord Mode ──
  if (entity?.kind === 'nord') {
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
              Categories
              {categoryConnectionCount > 0 && (
                <span className="nords-drawer-tab__count">{categoryConnectionCount}</span>
              )}
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

          {/* Categories Tab — Grouped by connection type */}
          {activeTab === 'connections' && graph && (
            <CategoryList
              nordId={entity.id}
              graph={graph}
              onSelectConnection={onSelectConnection}
              onDirectionChange={handleCategoryDirectionChange}
            />
          )}
          {activeTab === 'connections' && !graph && (
            <div className="nords-drawer-empty">
              Loading categories…
            </div>
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

// Need direct API import for CategoryList direction changes
import { api } from '../../api/client';

export default DetailDrawer;
