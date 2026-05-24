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

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { useDrawerEntity } from '../../hooks/useDrawerEntity';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';
import { useLens } from '../../context/LensContext';
import { PropertyField } from './PropertyField';

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
    required?: boolean;
  }>>;
  /** Callback when user clicks a connection in the connections tab */
  onSelectConnection?: (connectionId: string) => void;
  /** Callback when user clicks a nord in the nords tab */
  onSelectNord?: (nordId: string) => void;
  /** Raw graph data — used for view-agnostic entity resolution and category list */
  graph?: ProjectGraph | null;
  /** Refetch graph after mutations so both views stay in sync */
  refetchGraph?: () => Promise<void>;
}

// ── Direction Toggle Button Group ──
// 5 directional states for connections:
//   forward (→)  — Source → Target
//   reverse (←)  — Target → Source
//   both    (↔)  — Bidirectional
//   neither (—)  — Generic / verb only
//   none    (·)  — Context only / no connection semantics
const DIRECTIONS = [
  { value: 'forward' as const, label: '→', title: 'Forward' },
  { value: 'reverse' as const, label: '←', title: 'Reverse' },
  { value: 'both' as const, label: '↔', title: 'Bidirectional' },
  { value: 'neither' as const, label: '—', title: 'Generic (verb only)' },
  { value: 'none' as const, label: '·', title: 'Context only' },
];

type DirectionValue = 'forward' | 'reverse' | 'both' | 'neither' | 'none';

function DirectionToggle({
  value,
  color,
  onChange,
}: {
  value: string;
  color: string;
  onChange: (dir: DirectionValue) => void;
}) {
  // Map visual direction back to DB direction
  const dbValue: DirectionValue = value === 'to' ? 'forward'
    : value === 'from' ? 'reverse'
    : value === 'both' ? 'both'
    : value === 'neither' ? 'neither'
    : 'none';

  // When direction is 'none' (context only), directional buttons are disabled
  // because no line exists to direct.
  const isContextOnly = dbValue === 'none';

  return (
    <div className={`nords-direction-toggle ${isContextOnly ? 'nords-direction-toggle--context-only' : ''}`}>
      {DIRECTIONS.map(d => {
        const isActive = dbValue === d.value;
        // In context-only mode, only the · button is interactive
        const isDisabled = isContextOnly && d.value !== 'none';
        return (
          <button
            key={d.value}
            className={`nords-direction-toggle__btn ${isActive ? 'is-active' : ''} ${isDisabled ? 'is-disabled' : ''}`}
            style={isActive ? { borderColor: color, color } : undefined}
            onClick={() => !isDisabled && onChange(d.value)}
            title={isDisabled ? 'Add a line first to set direction' : d.title}
            disabled={isDisabled}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Category List: Groups connections by type ──
function CategoryList({
  nordId,
  graph,
  onSelectConnection,
  onSelectNord,
  onDirectionChange,
  onDeleteConnection,
  onSetActiveLens,
}: {
  nordId: string;
  graph: ProjectGraph;
  onSelectConnection?: (connectionId: string) => void;
  onSelectNord?: (nordId: string) => void;
  onDirectionChange?: (connectionId: string, direction: DirectionValue) => void;
  onDeleteConnection?: (connectionId: string) => void;
  onSetActiveLens?: (typeId: string) => void;
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

      // Resolve spectrum label helper
      const resolveSpectrumLabel = (distanceX: number) => {
        if (!ct.x_stage_labels?.length) return null;
        const labels = ct.x_stage_labels;
        // Find closest label
        let closest: { label: string; position: number } | null = null;
        let minDist = Infinity;
        for (const sl of labels) {
          const item = typeof sl === 'string' ? { label: sl, position: 0 } : sl;
          const d = Math.abs(item.position - distanceX);
          if (d < minDist) { minDist = d; closest = item; }
        }
        return closest?.label || null;
      };

      return {
        typeId: ct.id,
        typeName: ct.name,
        typeColor: ct.accent_color || '#888',
        verb: ct.verb || null,
        prepositions: ct.direction_prepositions || { forward: 'from', reverse: 'to', both: 'together' },
        connections: myConnections.map(c => {
          const otherNordId = c.source_nord_id === nordId ? c.target_nord_id : c.source_nord_id;
          const otherNord = nordMap.get(otherNordId);

          // Map DB direction to visual direction
          const visualDirection =
            c.direction === 'forward' ? 'to' :
            c.direction === 'reverse' ? 'from' :
            c.direction === 'both' ? 'both' :
            c.direction === 'neither' ? 'neither' :
            'none';

          return {
            id: c.id,
            otherNordId,
            otherNordTitle: otherNord?.title || 'Untitled',
            direction: visualDirection,
            dbDirection: c.direction,
            spectrumLabel: resolveSpectrumLabel(c.distance_x),
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
            {cat.connections.map(conn => {
              // Build verb + preposition text
              const verbPrep = (cat.verb && conn.direction !== 'none')
                ? `${cat.verb} ${
                    conn.direction === 'to' ? cat.prepositions.forward
                    : conn.direction === 'from' ? cat.prepositions.reverse
                    : conn.direction === 'both' ? cat.prepositions.both
                    : '' /* neither: verb only, no preposition */
                  }`.trim()
                : null;

              return (
                <div key={conn.id} className="nords-category-row">
                  <div className="nords-category-row__info">
                    <div className="nords-category-row__top">
                      <span className="nords-category-row__dir-icon">
                        {conn.direction === 'to' ? '→'
                          : conn.direction === 'from' ? '←'
                          : conn.direction === 'both' ? '↔'
                          : conn.direction === 'neither' ? '—'
                          : '·'}
                      </span>
                      <button
                        className="nords-category-row__name-link"
                        onClick={() => onSelectNord?.(conn.otherNordId)}
                        title={`Open ${conn.otherNordTitle}`}
                      >
                        {conn.otherNordTitle}
                      </button>
                    </div>
                    {(verbPrep || conn.spectrumLabel) && (
                      <button
                        className="nords-category-row__meta"
                        onClick={() => {
                          onSetActiveLens?.(cat.typeId);
                          onSelectConnection?.(conn.id);
                        }}
                        title="Open connection detail"
                        style={{ color: cat.typeColor }}
                      >
                        {verbPrep && <span className="nords-category-row__verb">{verbPrep}</span>}
                        {conn.spectrumLabel && (
                          <span className="nords-category-row__spectrum" style={{ borderColor: cat.typeColor }}>
                            {conn.spectrumLabel}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                  <DirectionToggle
                    value={conn.direction}
                    color={cat.typeColor}
                    onChange={(dir) => onDirectionChange?.(conn.id, dir)}
                  />
                  <button
                    className="nords-category-row__delete"
                    onClick={() => onDeleteConnection?.(conn.id)}
                    title="Remove this connection"
                  >×</button>
                </div>
              );
            })}
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
  onSelectNord,
  graph,
  refetchGraph,
}) => {
  const { entity, mutations } = useDrawerEntity(entityId, entityType, graph || null, refetchGraph);
  const { setActiveConnectionTypeId } = useLens();
  const [activeTab, setActiveTab] = useState<'properties' | 'connections'>('properties');
  const titleRef = useRef<HTMLHeadingElement>(null);

  // When entity changes, reset tab to properties and sync lens
  useEffect(() => {
    setActiveTab('properties');
    if (entity?.kind === 'connection') {
      setActiveConnectionTypeId(entity.typeId);
    }
  }, [entityId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      required: s.required,
      config: (s as any).config,
    }));
  }, [entity, schema]);

  // All properties as a flat object — needed for computed field evaluation
  const allPropertiesBag = useMemo(() => {
    if (entity?.kind !== 'nord') return {};
    return Object.fromEntries(entity.properties.map(p => [p.key, p.value]));
  }, [entity]);

  // Connection properties
  const connectionProperties = useMemo(() => {
    if (entity?.kind !== 'connection') return [];
    const propsMap = new Map(entity.properties.map(p => [p.key, p.value]));
    return schema.map(s => ({
      name: s.name,
      type: s.type as any,
      value: propsMap.get(s.name) ?? '',
      options: s.options,
      required: s.required,
    }));
  }, [entity, schema]);

  // Resolve closest spectrum label for a connection
  const resolvedSpectrumLabel = useMemo(() => {
    if (entity?.kind !== 'connection') return null;
    const labels = entity.xStageLabels;
    if (!labels || labels.length === 0) return null;
    const dx = entity.distanceX;
    const n = labels.length;

    // Labels may be strings or {label, position} objects — normalize
    let closestLabel = '';
    let minDist = Infinity;
    for (let i = 0; i < n; i++) {
      const item = labels[i];
      const label = typeof item === 'string' ? item : item.label;
      const pos = typeof item === 'string' ? (n === 1 ? 0.5 : i / (n - 1)) : item.position;
      const d = Math.abs(dx - pos);
      if (d < minDist) { minDist = d; closestLabel = label; }
    }
    return closestLabel || null;
  }, [entity]);

  // Handle direction change from CategoryList
  const handleCategoryDirectionChange = useCallback((connectionId: string, direction: DirectionValue) => {
    // Direct API call + refetch (since we're in Nord mode, not connection mode)
    api.put(`/api/connections/${connectionId}`, { direction })
      .then(() => refetchGraph?.())
      .catch((err: unknown) => {
        console.error('Failed to update direction:', err);
        refetchGraph?.();
      });
  }, [refetchGraph]);

  // Handle deleting a connection from a category
  const handleDeleteConnection = useCallback((connectionId: string) => {
    api.delete(`/api/connections/${connectionId}`)
      .then(() => refetchGraph?.())
      .catch((err: unknown) => {
        console.error('Failed to delete connection:', err);
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
          <div className="nords-drawer-type-eyebrow" style={{ color: entity.typeColor }}>
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
          </div>

          {/* Properties Tab — Schema-Driven + Description */}
          {activeTab === 'properties' && (
            <>
              <div className="nords-properties-list">
                {schemaProperties.length > 0 ? (
                  schemaProperties.map((p, i) => (
                    <PropertyField
                      key={`${p.name}-${i}`}
                      name={p.name}
                      type={p.type}
                      value={p.value}
                      options={p.options}
                      color={entity.typeColor}
                      required={p.required}
                      config={p.config}
                      allProperties={allPropertiesBag}
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
            </>
          )}

          {/* Categories Tab — Grouped by connection type */}
          {activeTab === 'connections' && graph && (
            <CategoryList
              nordId={entity.id}
              graph={graph}
              onSelectConnection={onSelectConnection}
              onSelectNord={onSelectNord}
              onDirectionChange={handleCategoryDirectionChange}
              onDeleteConnection={handleDeleteConnection}
              onSetActiveLens={setActiveConnectionTypeId}
            />
          )}
          {activeTab === 'connections' && !graph && (
            <div className="nords-drawer-empty">
              Loading categories…
            </div>
          )}
        </div>
      </FloatingPanel>
    );
  }

  // ── Line Mode (Connection) ──
  if (entity?.kind === 'connection') {
    // Build the connection label based on verb + direction
    // - direction === 'none' → "context only" (no verb, no direction)
    // - direction === 'neither' → just the verb (generic, no preposition)
    // - directional (to/from/both) → "verb preposition"
    const hasVerb = !!entity.verb;
    const directionPrep =
      entity.direction === 'none'
        ? 'context only'
        : hasVerb
          ? (entity.direction === 'neither'
              ? entity.verb!
              : `${entity.verb} ${
                  entity.direction === 'to' ? entity.prepositions.forward
                  : entity.direction === 'from' ? entity.prepositions.reverse
                  : entity.direction === 'both' ? entity.prepositions.both
                  : ''
                }`.trim())
          : 'context only';



    return (
      <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose}>
        <header className="nords-drawer-header">
          <div className="nords-drawer-type-eyebrow" style={{ color: entity.typeColor }}>
            {entity.type}
          </div>
          <div className="nords-drawer-header-actions">
            <button
              className="nords-drawer-delete-btn"
              onClick={() => {
                api.delete(`/api/connections/${entity.id}`)
                  .then(() => {
                    refetchGraph?.();
                    onClose();
                  })
                  .catch((err: unknown) => console.error('Failed to delete connection:', err));
              }}
              title="Delete this connection"
              aria-label="Delete connection"
            >×</button>
            <button className="nords-close-btn" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="nords-drawer-content">
          {/* Interactive sentence: Source → verb (spectrum) → Target */}
          {(() => {
            // When reverse, swap visual order so it reads naturally
            const isReversed = entity.direction === 'from';
            const topName = isReversed ? entity.targetName : entity.sourceName;
            const topId = isReversed ? entity.targetId : entity.sourceId;
            const bottomName = isReversed ? entity.sourceName : entity.targetName;
            const bottomId = isReversed ? entity.sourceId : entity.targetId;

            // Always show → visually (because we swapped the nords for reverse)
            const sentenceArrow =
              entity.direction === 'to' ? '→'
              : entity.direction === 'from' ? '→'  // swapped, so still forward visually
              : entity.direction === 'both' ? '↔'
              : entity.direction === 'neither' ? '—'
              : '·';  // none / context only

            return (
              <div className="nords-connection-sentence">
                <button
                  className="nords-connection-sentence__nord"
                  onClick={() => onSelectNord?.(topId)}
                  title={`Open ${topName}`}
                >
                  {topName}
                </button>
                <span className="nords-connection-sentence__middle" style={{ color: entity.typeColor }}>
                  <span className="nords-connection-sentence__arrow">{sentenceArrow}</span>
                  <span className={`nords-connection-sentence__verb${!hasVerb ? ' nords-connection-sentence__verb--muted' : ''}`}>
                    {directionPrep}
                  </span>
                  {resolvedSpectrumLabel && (
                    <span className="nords-connection-sentence__spectrum" style={{ borderColor: entity.typeColor }}>
                      {resolvedSpectrumLabel}
                    </span>
                  )}
                  <span className="nords-connection-sentence__arrow">{sentenceArrow}</span>
                </span>
                <button
                  className="nords-connection-sentence__nord"
                  onClick={() => onSelectNord?.(bottomId)}
                  title={`Open ${bottomName}`}
                >
                  {bottomName}
                </button>
              </div>
            );
          })()}

          {/* Direction Toggle */}
          <div className="nords-drawer-section">
            <h3 className="nords-drawer-section-title">Direction</h3>
            <DirectionToggle
              value={entity.direction}
              color={entity.typeColor}
              onChange={mutations.updateDirection}
            />
          </div>

          {/* Schema-driven properties */}
          {connectionProperties.length > 0 && (
            <div className="nords-properties-list">
              {connectionProperties.map((p, i) => (
                <PropertyField
                  key={`${p.name}-${i}`}
                  name={p.name}
                  type={p.type}
                  value={p.value}
                  options={p.options}
                  color={entity.typeColor}
                  required={p.required}
                  onChange={(v) => mutations.updateConnectionProperty(p.name, v as string)}
                />
              ))}
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
