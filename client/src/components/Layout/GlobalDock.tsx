/**
 * GlobalDock.tsx — Floating Bottom Navigation Bar
 *
 * The Global Dock is the primary navigation and tool-switching control.
 * Production version: consumes LensContext instead of props.
 *
 * Structure:
 *   ┌───────────────────────────────────────────────────────┐
 *   │ [Canvas] [Link] [Matrix]  │  {Contextual Tools}      │
 *   └───────────────────────────────────────────────────────┘
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Eye, Link2, LayoutGrid, Users,
  MessageSquare, Camera,
  EyeIcon, EyeOff, ChevronDown, ArrowLeftRight, Unlink, Filter,
  Bug, User, FileText, Target, Lightbulb, Layers, AlertTriangle,
  Square, Settings2, CircleDot,
} from 'lucide-react';
import { useLens } from '../../context/LensContext';

import { useTypeVisibility } from '../../hooks/useTypeVisibility';
import { useTypeRegistryContext } from '../../context/TypeRegistryContext';
import { useBoardSettingsContext } from '../../context/BoardSettingsContext';
import { useConnectionTypeMutations } from '../../hooks/useNordMutations';
import type { ProjectGraph } from '../../hooks/useProjectGraph';
import { resolveIcon } from '../../utils/iconRegistry';
import type { ResolvedNordType } from '../../context/TypeRegistryContext';
import type { Persona } from '../../hooks/usePersonas';
import './GlobalDock.css';

interface GlobalDockProps {
  projectId?: string;
  onOpenManageTypes?: () => void;
  refetchGraph?: () => Promise<void>;
  graph?: ProjectGraph | null;
  personas?: Persona[];
}

export default function GlobalDock({ projectId, onOpenManageTypes, refetchGraph, graph, personas = [] }: GlobalDockProps) {
  const { lens, setLens, activeConnectionTypeId, setActiveConnectionTypeId, activePersonaId, setActivePersonaId, activeLine, setActiveLine, showContext, setShowContext, personaTypeFilter, cyclePersonaTypeFilter } = useLens();
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [snapshotTab, setSnapshotTab] = useState<'take' | 'history'>('take');

  const { visibleNodeTypes, visibleConnectionTypes, toggleNodeType } = useTypeVisibility();
  const { nordTypes, connectionTypes } = useTypeRegistryContext();
  const { isNordTypeVisible, toggleNordTypeFilter, getBoard, toggleOrphans, isNordHidden, toggleNordFilter } = useBoardSettingsContext();
  const { updateConnectionType } = useConnectionTypeMutations();
  const boardSettings = activeConnectionTypeId ? getBoard(activeConnectionTypeId) : null;

  // Full resolved connection type (has directionFilter)
  const activeFullType = connectionTypes.find(ct => ct.id === activeConnectionTypeId) ?? null;

  // Issue 4: Never start on "all categories" — auto-select the first connection type
  // if nothing is persisted from localStorage. This fires once on mount.
  useEffect(() => {
    if (!activeConnectionTypeId && connectionTypes.length > 0) {
      const first = connectionTypes[0];
      setActiveConnectionTypeId(first.id);
      setActiveLine(first.name);
    }
  }, [connectionTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectConnectionType = (typeId: string, typeName: string) => {
    setActiveConnectionTypeId(typeId);
    setActiveLine(typeName);
    setOpenPanel(null);
  };

  const togglePanel = (panel: string) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  // Find active connection type by ID (preferred) or legacy name
  const activeConnectionType = visibleConnectionTypes.find(l => l.id === activeConnectionTypeId)
    || visibleConnectionTypes.find(l => l.name === activeLine);

  // Active persona for persona lens
  const activePersona = personas.find(p => p.id === activePersonaId) || null;

  return (
    <>
      {openPanel && <div className="nords-flyout-scrim" onClick={() => setOpenPanel(null)} />}

      <div className="nords-dock-wrapper">
        <nav className="nords-global-dock nords-glass" data-testid="global-dock" data-active-lens={lens}>

          {/* ═══ Lens Toggle ═══ */}
          <div className="nords-lens-toggle">
            <button
              className={`nords-lens-toggle__btn ${lens === 'board' ? 'is-active' : ''}`}
              onClick={() => {
                setLens('board');
                setOpenPanel(null);
                if (!activeConnectionTypeId && visibleConnectionTypes.length > 0) {
                  setActiveConnectionTypeId(visibleConnectionTypes[0].id);
                  setActiveLine(visibleConnectionTypes[0].name);
                }
              }}
              title="Board — kanban view by connection type"
              data-testid="lens-board"
            >
              <LayoutGrid size={14} strokeWidth={1.6} />
              <span>Board</span>
            </button>
            <button
              className={`nords-lens-toggle__btn ${lens === 'canvas' ? 'is-active' : ''}`}
              onClick={() => { setLens('canvas'); setOpenPanel(null); }}
              title="Graph — spatial graph view"
              data-testid="lens-canvas"
            >
              <Eye size={14} strokeWidth={1.6} />
              <span>Graph</span>
            </button>
            <button
              className={`nords-lens-toggle__btn ${lens === 'persona' ? 'is-active' : ''}`}
              onClick={() => {
                setLens('persona');
                setActiveConnectionTypeId(null); // All lines mode
                setOpenPanel(null);
                // Auto-select first persona if none selected
                if (!activePersonaId && personas.length > 0) {
                  setActivePersonaId(personas[0].id);
                }
              }}
              title="Persona — weighted graph view through a persona's lens"
              data-testid="lens-persona"
            >
              <Users size={14} strokeWidth={1.6} />
              <span>Persona</span>
            </button>
          </div>

          <div className="nords-dock__separator" />

          {/* ═══ SHARED TOOLS (all lens modes) ═══ */}

          {/* Connection Type Switcher OR Persona Switcher */}
          {lens === 'persona' ? (
            <div className="nords-dock__section">
              <button
                className={`nords-dock__item ${openPanel === 'persona' ? 'is-active' : ''}`}
                onClick={() => togglePanel('persona')}
                data-testid="dock-persona-select"
              >
                <Users size={14} strokeWidth={1.6} />
                <span className="nords-dock__label">{activePersona?.name || 'Select Persona'}</span>
                <ChevronDown size={10} className="nords-dock__chevron" />
              </button>
            </div>
          ) : (
            <div className="nords-dock__section">
              <button
                className={`nords-dock__item ${openPanel === 'relationship' ? 'is-active' : ''}`}
                onClick={() => togglePanel('relationship')}
                data-testid="dock-connection-type"
              >
                {activeConnectionType ? (
                  <>
                    <span className="nords-dock__rel-swatch" style={{ backgroundColor: activeConnectionType.color }} />
                    <span className="nords-dock__label">{activeConnectionType.name}</span>
                  </>
                ) : (
                  <>
                    <Link2 size={14} strokeWidth={1.6} />
                    <span className="nords-dock__label">All Lines</span>
                  </>
                )}
                <ChevronDown size={10} className="nords-dock__chevron" />
              </button>
            </div>
          )}

          {/* Show/Hide toggle — graph mode only (not persona or board) */}
          {lens === 'canvas' && (
            <div className="nords-dock__section">
              <button
                className={`nords-dock__item ${showContext ? 'is-active' : ''}`}
                onClick={() => setShowContext(!showContext)}
                data-testid="dock-toggle-context"
                title={activeConnectionTypeId ? 'Show/hide other connection types' : 'Show/hide orphaned nords'}
              >
                {showContext ? <EyeIcon size={15} strokeWidth={1.6} /> : <EyeOff size={15} strokeWidth={1.6} />}
                <span className="nords-dock__label">{activeConnectionTypeId ? 'Others' : 'Orphans'}</span>
              </button>
            </div>
          )}

          {/* Filter button — board mode: opens Nord Viewer flyout */}
          {lens === 'board' && (
            <div className="nords-dock__section">
              <button
                className={`nords-dock__item ${openPanel === 'filter' ? 'is-active' : ''}`}
                onClick={() => togglePanel('filter')}
                data-testid="dock-filter"
                title="Filter visible nord types & orphans"
              >
                <Filter size={15} strokeWidth={1.6} />
                <span className="nords-dock__label">Filter</span>
                <ChevronDown size={10} className="nords-dock__chevron" />
              </button>
            </div>
          )}

          {/* Filter button — persona mode: opens 3-state visibility flyout */}
          {lens === 'persona' && (
            <div className="nords-dock__section">
              <button
                className={`nords-dock__item ${openPanel === 'persona-filter' ? 'is-active' : ''}`}
                onClick={() => togglePanel('persona-filter')}
                data-testid="dock-persona-filter"
                title="Filter visible nord types (show / dim / hide)"
              >
                <Filter size={15} strokeWidth={1.6} />
                <span className="nords-dock__label">Filter</span>
                <ChevronDown size={10} className="nords-dock__chevron" />
              </button>
            </div>
          )}

          {/* Direction filter — board mode only, inline segmented control */}
          {lens === 'board' && activeConnectionTypeId && (
            <>
              <div className="nords-dock__separator" />
              <div className="nords-dock__direction-filter">
                {(['all', 'forward', 'reverse', 'both', 'none'] as const).map(dir => {
                  const isActive = (activeFullType?.directionFilter ?? 'all') === dir;
                  return (
                    <button
                      key={dir}
                      className={`nords-dock__dir-btn ${isActive ? 'is-active' : ''}`}
                      title={dir === 'all' ? 'Show all directions' : `Show ${dir} connections`}
                      onClick={async () => {
                        if (!activeConnectionTypeId) return;
                        await updateConnectionType(activeConnectionTypeId, { direction_filter: dir });
                        // Refetch graph so TypeRegistryContext updates and the active button re-highlights
                        await refetchGraph?.();
                      }}
                    >
                      {dir === 'all' ? 'All'
                        : dir === 'forward' ? '→'
                        : dir === 'reverse' ? '←'
                        : dir === 'both' ? '↔'
                        : '⊘'}
                    </button>
                  );
                })}
              </div>
            </>
          )}

        </nav>

        {/* ═══ FLYOUT PANELS ═══ */}


        {/* Connection Type Switcher Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'relationship' ? 'is-open' : ''}`} data-testid="flyout-connection-type">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Categories</h3>
            <span className="nords-flyout__count">
              {visibleConnectionTypes.filter(t => !t.isSystem).length} types
            </span>
          </div>
          <div className="nords-flyout__list">
            {/* All Lines (Relevance) — commented out per user request */}
            {/* {lens !== 'board' && (
              <div
                className={`nords-flyout__row nords-flyout__row--selectable ${!activeConnectionTypeId ? 'is-active' : ''}`}
                onClick={() => { setActiveConnectionTypeId(null); setActiveLine('All'); setOpenPanel(null); }}
              >
                <div className="nords-flyout__row-left">
                  <Link2 size={14} strokeWidth={1.6} style={{ color: 'var(--nords-color-text-tertiary)', flexShrink: 0 }} />
                  <span className="nords-flyout__row-name">All Lines (Relevance)</span>
                </div>
              </div>
            )} */}
            {visibleConnectionTypes
              .filter(t => !t.isSystem)
              .filter(t => lens !== 'board' || (t.measurementMode !== 'none' && t.xStageLabels.length > 0))
              .map((type) => (
              <div
                key={type.id}
                className={`nords-flyout__row nords-flyout__row--selectable ${activeConnectionTypeId === type.id ? 'is-active' : ''}`}
                onClick={() => handleSelectConnectionType(type.id, type.name)}
              >
                <div className="nords-flyout__row-left">
                  <span className="nords-flyout__line-swatch" style={{ background: type.color }} />
                  <span className="nords-flyout__row-name">{type.name}</span>
                  <span className="nords-flyout__row-count">{type.count}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="nords-flyout__footer">
            <span className="nords-flyout__footer-hint">
              <ArrowLeftRight size={10} />
              Selecting a type focuses the canvas on that relationship
            </span>
          </div>
        </div>

        {/* Nord Filter Flyout (board mode) — shows individual nords in this category */}
        <div className={`nords-flyout nords-glass ${openPanel === 'filter' ? 'is-open' : ''}`} data-testid="flyout-filter">
          <FilterFlyoutContent
            graph={graph || null}
            activeConnectionTypeId={activeConnectionTypeId}
            nordTypes={nordTypes}
            isNordTypeVisible={isNordTypeVisible}
            toggleNordTypeFilter={toggleNordTypeFilter}
          />
        </div>

        {/* Persona Nord Filter Flyout (persona mode) — 3-state: show/dim/hide */}
        <div className={`nords-flyout nords-glass ${openPanel === 'persona-filter' ? 'is-open' : ''}`} data-testid="flyout-persona-filter">
          <PersonaFilterFlyoutContent
            graph={graph || null}
            nordTypes={nordTypes}
            personaTypeFilter={personaTypeFilter}
            cyclePersonaTypeFilter={cyclePersonaTypeFilter}
          />
        </div>

        {/* Persona Switcher Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'persona' ? 'is-open' : ''}`} data-testid="flyout-persona">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Personas</h3>
            <span className="nords-flyout__count">
              {personas.length} defined
            </span>
          </div>
          <div className="nords-flyout__list">
            {personas.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: '12px' }}>
                No personas defined. Create one in Project Settings → Personas.
              </div>
            )}
            {personas.map(p => (
              <div
                key={p.id}
                className={`nords-flyout__row nords-flyout__row--selectable ${activePersonaId === p.id ? 'is-active' : ''}`}
                onClick={() => {
                  setActivePersonaId(p.id);
                  setOpenPanel(null);
                }}
              >
                <div className="nords-flyout__row-left">
                  <Users size={14} strokeWidth={1.6} style={{ color: 'var(--nords-color-text-tertiary)', flexShrink: 0 }} />
                  <span className="nords-flyout__row-name">{p.name}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="nords-flyout__footer">
            <span className="nords-flyout__footer-hint">
              <Users size={10} />
              Select a persona to weight the spatial graph by their priorities
            </span>
          </div>
        </div>

        {/* Snapshot Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'snapshot' ? 'is-open' : ''}`} data-testid="flyout-snapshot">
          <div className="nords-flyout__header">
            <div className="nords-flyout__tabs">
              <button className={`nords-flyout__tab ${snapshotTab === 'take' ? 'is-active' : ''}`} onClick={() => setSnapshotTab('take')}>Take Snapshot</button>
              <button className={`nords-flyout__tab ${snapshotTab === 'history' ? 'is-active' : ''}`} onClick={() => setSnapshotTab('history')}>History</button>
            </div>
          </div>
          {snapshotTab === 'take' && (
            <>
              <div className="nords-flyout__list">
                <div className="nords-flyout__create-section">
                  <h4 className="nords-flyout__create-label">Snapshot Name</h4>
                  <input className="nords-flyout__snapshot-input" placeholder="e.g. Sprint 4 Kickoff" />
                </div>
                <div className="nords-flyout__create-section">
                  <h4 className="nords-flyout__create-label">Description (optional)</h4>
                  <textarea className="nords-flyout__snapshot-textarea" placeholder="Markdown supported..." rows={3} />
                </div>
                <div className="nords-flyout__create-section">
                  <button className="nords-flyout__snapshot-save">
                    <Camera size={13} strokeWidth={2} />
                    Save Snapshot
                  </button>
                </div>
              </div>
              <div className="nords-flyout__footer">
                <span className="nords-flyout__footer-hint">Captures exact positions, values, and metadata at this moment</span>
              </div>
            </>
          )}
          {snapshotTab === 'history' && (
            <div className="nords-flyout__list">
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: 'var(--nords-font-size-sm)' }}>
                No snapshots yet. Take your first one above.
              </div>
            </div>
          )}
        </div>

        {/* Comments Flyout — deferred to Epic 12 */}
        <div className={`nords-flyout nords-glass ${openPanel === 'comments' ? 'is-open' : ''}`} data-testid="flyout-comments">
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Comments</h3>
            <span className="nords-flyout__count">0 threads</span>
          </div>
          <div className="nords-flyout__list">
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: 'var(--nords-font-size-sm)' }}>
              <MessageSquare size={24} strokeWidth={1} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <p>No comments yet.</p>
              <p style={{ fontSize: 'var(--nords-font-size-xs)', marginTop: '4px' }}>Click a Nord to start a discussion.</p>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// FilterFlyoutContent — Shows nord types present in the active category
// ═══════════════════════════════════════════════════════════

interface FilterFlyoutProps {
  graph: ProjectGraph | null;
  activeConnectionTypeId: string | null;
  nordTypes: ResolvedNordType[];
  isNordTypeVisible: (ctId: string, typeId: string) => boolean;
  toggleNordTypeFilter: (ctId: string, typeId: string) => void;
}

function FilterFlyoutContent({ graph, activeConnectionTypeId, nordTypes, isNordTypeVisible, toggleNordTypeFilter }: FilterFlyoutProps) {
  // Build the set of nord type IDs that have nords participating in this category
  const typesInCategory = useMemo(() => {
    if (!graph || !activeConnectionTypeId) return [];

    // Collect all nord IDs connected via this type
    const nordIdsInCategory = new Set<string>();
    for (const conn of graph.connections) {
      if (conn.type_id !== activeConnectionTypeId) continue;
      nordIdsInCategory.add(conn.source_nord_id);
      nordIdsInCategory.add(conn.target_nord_id);
    }

    // Count nords of each type in this category
    const typeCounts = new Map<string, number>();
    for (const n of graph.nords) {
      if (!nordIdsInCategory.has(n.id)) continue;
      typeCounts.set(n.type_id, (typeCounts.get(n.type_id) || 0) + 1);
    }

    // Filter nordTypes to only those present, with counts
    return nordTypes
      .filter(nt => typeCounts.has(nt.id))
      .map(nt => ({ ...nt, categoryCount: typeCounts.get(nt.id) || 0 }));
  }, [graph, activeConnectionTypeId, nordTypes]);

  const hiddenCount = activeConnectionTypeId
    ? typesInCategory.filter(t => !isNordTypeVisible(activeConnectionTypeId, t.id)).length
    : 0;

  return (
    <>
      <div className="nords-flyout__header">
        <h3 className="nords-flyout__title">Nord Visibility</h3>
        <span className="nords-flyout__count">
          {typesInCategory.length} types{hiddenCount > 0 && ` · ${hiddenCount} dimmed`}
        </span>
      </div>
      <div className="nords-flyout__list">
        {typesInCategory.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: '12px' }}>
            No nords connected via this category yet.
          </div>
        )}
        {typesInCategory.map(nt => {
          const visible = activeConnectionTypeId ? isNordTypeVisible(activeConnectionTypeId, nt.id) : true;
          const NtIcon = nt.icon;
          return (
            <div
              key={nt.id}
              className={`nords-flyout__row nords-flyout__row--selectable ${visible ? 'is-active' : ''}`}
              onClick={() => activeConnectionTypeId && toggleNordTypeFilter(activeConnectionTypeId, nt.id)}
            >
              <div className="nords-flyout__row-left">
                <NtIcon size={14} strokeWidth={1.8} style={{ color: nt.color, flexShrink: 0 }} />
                <span className="nords-flyout__row-name">{nt.name}</span>
                <span className="nords-flyout__row-count">{nt.categoryCount}</span>
              </div>
              <div className="nords-flyout__row-right">
                {visible
                  ? <EyeIcon size={13} style={{ color: nt.color }} />
                  : <EyeOff size={13} style={{ opacity: 0.3 }} />
                }
              </div>
            </div>
          );
        })}
      </div>
      <div className="nords-flyout__footer">
        <span className="nords-flyout__footer-hint">
          Toggle visibility of nord types on this board
        </span>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// PersonaFilterFlyoutContent — 3-state nord type visibility
// for persona view: show → dim → hide → show
// ═══════════════════════════════════════════════════════════

import type { PersonaTypeVisibility } from '../../context/LensContext';

interface PersonaFilterFlyoutProps {
  graph: ProjectGraph | null;
  nordTypes: ResolvedNordType[];
  personaTypeFilter: Map<string, PersonaTypeVisibility>;
  cyclePersonaTypeFilter: (typeName: string) => void;
}

function PersonaFilterFlyoutContent({ graph, nordTypes, personaTypeFilter, cyclePersonaTypeFilter }: PersonaFilterFlyoutProps) {
  // Count nords of each type in the graph
  const typesWithCounts = useMemo(() => {
    if (!graph) return [];
    const typeCounts = new Map<string, number>();
    for (const n of graph.nords) {
      typeCounts.set(n.type_id, (typeCounts.get(n.type_id) || 0) + 1);
    }
    return nordTypes
      .filter(nt => typeCounts.has(nt.id))
      .map(nt => ({ ...nt, count: typeCounts.get(nt.id) || 0 }));
  }, [graph, nordTypes]);

  const dimmedCount = typesWithCounts.filter(t => (personaTypeFilter.get(t.name) || 'show') === 'dim').length;
  const hiddenCount = typesWithCounts.filter(t => (personaTypeFilter.get(t.name) || 'show') === 'hide').length;

  const statusLabel = [
    dimmedCount > 0 ? `${dimmedCount} dimmed` : null,
    hiddenCount > 0 ? `${hiddenCount} hidden` : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className="nords-flyout__header">
        <h3 className="nords-flyout__title">Nord Visibility</h3>
        <span className="nords-flyout__count">
          {typesWithCounts.length} types{statusLabel ? ` · ${statusLabel}` : ''}
        </span>
      </div>
      <div className="nords-flyout__list">
        {typesWithCounts.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: '12px' }}>
            No nords in this project yet.
          </div>
        )}
        {typesWithCounts.map(nt => {
          const state = personaTypeFilter.get(nt.name) || 'show';
          const NtIcon = nt.icon;
          return (
            <div
              key={nt.id}
              className={`nords-flyout__row nords-flyout__row--selectable ${state === 'show' ? 'is-active' : ''}`}
              onClick={() => cyclePersonaTypeFilter(nt.name)}
              style={{ opacity: state === 'hide' ? 0.3 : state === 'dim' ? 0.55 : 1 }}
            >
              <div className="nords-flyout__row-left">
                <NtIcon size={14} strokeWidth={1.8} style={{ color: nt.color, flexShrink: 0 }} />
                <span className="nords-flyout__row-name">{nt.name}</span>
                <span className="nords-flyout__row-count">{nt.count}</span>
              </div>
              <div className="nords-flyout__row-right" style={{ gap: '4px', display: 'flex', alignItems: 'center' }}>
                {state === 'show' && <EyeIcon size={13} style={{ color: nt.color }} />}
                {state === 'dim' && <CircleDot size={13} style={{ opacity: 0.5 }} />}
                {state === 'hide' && <EyeOff size={13} style={{ opacity: 0.3 }} />}
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nords-color-text-disabled)', minWidth: '24px' }}>{state}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="nords-flyout__footer">
        <span className="nords-flyout__footer-hint">
          Click to cycle: show → dim → hide
        </span>
      </div>
    </>
  );
}
