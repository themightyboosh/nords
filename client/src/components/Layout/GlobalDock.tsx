/**
 * GlobalDock.tsx — Floating Bottom Navigation Bar
 *
 * Harmonized filter system:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ [Board|Graph|Persona]  │  [Category ▾] [Nord ▾] [Dir ▾]    │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Each mode gets mode-specific filter pills that open consistent flyouts.
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Eye, Link2, LayoutGrid, Users,
  EyeIcon, EyeOff, ChevronDown, ArrowLeftRight, Unlink,
  ArrowRight, ArrowLeft, Minus, Layers, CircleDot,
} from 'lucide-react';
import { useLens } from '../../context/LensContext';
import { useTypeVisibility } from '../../hooks/useTypeVisibility';
import { useTypeRegistryContext } from '../../context/TypeRegistryContext';
import { useBoardSettingsContext } from '../../context/BoardSettingsContext';
import type { ProjectGraph } from '../../hooks/useProjectGraph';
import { resolveIcon } from '../../utils/iconRegistry';
import type { ResolvedNordType } from '../../context/TypeRegistryContext';
import type { Persona } from '../../hooks/usePersonas';
import type { NordVisibility, DirectionKey } from '../../hooks/useBoardSettings';
import './GlobalDock.css';

interface GlobalDockProps {
  projectId?: string;
  onOpenManageTypes?: () => void;
  refetchGraph?: () => Promise<void>;
  graph?: ProjectGraph | null;
  personas?: Persona[];
}

// Direction filter rows — consistent across board and graph
const DIRECTION_ROWS: { key: DirectionKey; label: string; icon: React.ReactNode }[] = [
  { key: 'forward',     label: 'Forward',       icon: <ArrowRight size={13} /> },
  { key: 'reverse',     label: 'Reverse',       icon: <ArrowLeft size={13} /> },
  { key: 'both',        label: 'Bidirectional',  icon: <ArrowLeftRight size={13} /> },
  { key: 'none',        label: 'Undirected',     icon: <Minus size={13} /> },
  { key: 'unconnected', label: 'No Connection',  icon: <Unlink size={13} /> },
];

export default function GlobalDock({ projectId, onOpenManageTypes, refetchGraph, graph, personas = [] }: GlobalDockProps) {
  const { lens, setLens, activeConnectionTypeId, setActiveConnectionTypeId, activePersonaId, setActivePersonaId, activeLine, setActiveLine, showContext, setShowContext, personaTypeFilter, cyclePersonaTypeFilter } = useLens();
  const [openPanel, setOpenPanel] = useState<string | null>(null);

  const { visibleConnectionTypes } = useTypeVisibility();
  const { nordTypes, connectionTypes } = useTypeRegistryContext();
  const {
    isLaneCollapsed, toggleLaneCollapse,
    getNordTypeVisibility, cycleNordTypeVisibility,
    getDirectionFilter, toggleDirectionFilter,
  } = useBoardSettingsContext();

  // Auto-select first connection type for graph mode
  useEffect(() => {
    if (!activeConnectionTypeId && connectionTypes.length > 0 && lens === 'canvas') {
      setActiveConnectionTypeId(connectionTypes[0].id);
      setActiveLine(connectionTypes[0].name);
    }
  }, [connectionTypes, lens]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectConnectionType = (typeId: string, typeName: string) => {
    setActiveConnectionTypeId(typeId);
    setActiveLine(typeName);
    setOpenPanel(null);
  };

  const togglePanel = (panel: string) => {
    setOpenPanel(openPanel === panel ? null : panel);
  };

  const activeConnectionType = visibleConnectionTypes.find(l => l.id === activeConnectionTypeId)
    || visibleConnectionTypes.find(l => l.name === activeLine);
  const activePersona = personas.find(p => p.id === activePersonaId) || null;
  const nonSystemTypes = useMemo(() => visibleConnectionTypes.filter(t => !t.isSystem), [visibleConnectionTypes]);

  // Count hidden lanes / dimmed types for badge display
  const hiddenLaneCount = useMemo(() => nonSystemTypes.filter(t => isLaneCollapsed(t.id)).length, [nonSystemTypes, isLaneCollapsed]);

  // Nord types present in the project (with counts)
  const projectNordTypes = useMemo(() => {
    if (!graph) return [];
    const counts = new Map<string, number>();
    for (const n of graph.nords) counts.set(n.type_id, (counts.get(n.type_id) || 0) + 1);
    return nordTypes.filter(nt => counts.has(nt.id)).map(nt => ({ ...nt, count: counts.get(nt.id) || 0 }));
  }, [graph, nordTypes]);

  return (
    <>
      {openPanel && <div className="nords-flyout-scrim" onClick={() => setOpenPanel(null)} />}

      <div className="nords-dock-wrapper">
        <nav className="nords-global-dock nords-glass" data-testid="global-dock" data-active-lens={lens}>

          {/* ═══ Lens Toggle ═══ */}
          <div className="nords-lens-toggle">
            <button
              className={`nords-lens-toggle__btn ${lens === 'board' ? 'is-active' : ''}`}
              onClick={() => { setLens('board'); setOpenPanel(null); }}
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
                setActiveConnectionTypeId(null);
                setOpenPanel(null);
                if (!activePersonaId && personas.length > 0) setActivePersonaId(personas[0].id);
              }}
              title="Persona — weighted graph view through a persona's lens"
              data-testid="lens-persona"
            >
              <Users size={14} strokeWidth={1.6} />
              <span>Persona</span>
            </button>
          </div>

          <div className="nords-dock__separator" />

          {/* ═══ MODE-SPECIFIC FILTER PILLS ═══ */}

          {lens === 'board' && (
            <>
              {/* Board: Category (show/hide lanes) */}
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'relationship' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('relationship')}
                >
                  <Layers size={14} strokeWidth={1.6} />
                  <span className="nords-dock__label">Category</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>

              {/* Board: Nord (show/dim/hide by type) */}
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'filter' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('filter')}
                >
                  <CircleDot size={14} strokeWidth={1.6} />
                  <span className="nords-dock__label">Nord</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>

              {/* Board: Connection direction filter */}
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'direction' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('direction')}
                >
                  <ArrowLeftRight size={14} strokeWidth={1.6} />
                  <span className="nords-dock__label">Direction</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>
            </>
          )}

          {lens === 'canvas' && (
            <>
              {/* Graph: Category (show/dim/hide) */}
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'relationship' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('relationship')}
                >
                  <Layers size={14} strokeWidth={1.6} />
                  <span className="nords-dock__label">Category</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>

              {/* Graph: Others toggle */}
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${showContext ? 'is-active' : ''}`}
                  onClick={() => setShowContext(!showContext)}
                  title="Show/hide nords not in the selected category"
                >
                  {showContext ? <EyeIcon size={14} strokeWidth={1.6} /> : <EyeOff size={14} strokeWidth={1.6} />}
                  <span className="nords-dock__label">Others</span>
                </button>
              </div>
            </>
          )}

          {lens === 'persona' && (
            <>
              {/* Persona: Persona selector */}
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'persona' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('persona')}
                >
                  <Users size={14} strokeWidth={1.6} />
                  <span className="nords-dock__label">{activePersona?.name || 'Persona'}</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>

              {/* Persona: Nord (3-state show/dim/hide) */}
              <div className="nords-dock__section">
                <button
                  className={`nords-dock__item ${openPanel === 'filter' ? 'is-active' : ''}`}
                  onClick={() => togglePanel('filter')}
                >
                  <CircleDot size={14} strokeWidth={1.6} />
                  <span className="nords-dock__label">Nord</span>
                  <ChevronDown size={10} className="nords-dock__chevron" />
                </button>
              </div>
            </>
          )}

        </nav>

        {/* ═══ FLYOUT PANELS ═══ */}

        {/* Category Flyout — Board: show/hide lanes | Graph: single-select */}
        <div className={`nords-flyout nords-glass ${openPanel === 'relationship' ? 'is-open' : ''}`}>
          {lens === 'board' ? (
            <>
              <div className="nords-flyout__header">
                <h3 className="nords-flyout__title">Category</h3>
                <span className="nords-flyout__count">
                  {nonSystemTypes.length} types{hiddenLaneCount > 0 && ` · ${hiddenLaneCount} hidden`}
                </span>
              </div>
              <div className="nords-flyout__list">
                {nonSystemTypes.map(type => {
                  const hidden = isLaneCollapsed(type.id);
                  return (
                    <div key={type.id} className={`nords-flyout__row nords-flyout__row--selectable ${!hidden ? 'is-active' : ''}`} onClick={() => toggleLaneCollapse(type.id)}>
                      <div className="nords-flyout__row-left">
                        <span className="nords-flyout__line-swatch" style={{ background: type.color }} />
                        <span className="nords-flyout__row-name">{type.name}</span>
                        <span className="nords-flyout__row-count">{type.count}</span>
                      </div>
                      <div className="nords-flyout__row-right">
                        {!hidden ? <EyeIcon size={13} style={{ color: type.color }} /> : <EyeOff size={13} style={{ opacity: 0.3 }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="nords-flyout__footer">
                <span className="nords-flyout__footer-hint"><EyeIcon size={10} /> Show or hide entire swimlanes</span>
              </div>
            </>
          ) : (
            /* Graph mode: 3-state show/dim/hide per category */
            <>
              <div className="nords-flyout__header">
                <h3 className="nords-flyout__title">Category</h3>
                <span className="nords-flyout__count">{nonSystemTypes.length} types</span>
              </div>
              <div className="nords-flyout__list">
                {nonSystemTypes.map(type => {
                  const state = personaTypeFilter.get(type.name) || 'show';
                  return (
                    <div key={type.id} className={`nords-flyout__row nords-flyout__row--selectable ${state === 'show' ? 'is-active' : ''}`}
                      onClick={() => cyclePersonaTypeFilter(type.name)}
                      style={{ opacity: state === 'hide' ? 0.3 : state === 'dim' ? 0.55 : 1 }}
                    >
                      <div className="nords-flyout__row-left">
                        <span className="nords-flyout__line-swatch" style={{ background: type.color }} />
                        <span className="nords-flyout__row-name">{type.name}</span>
                        <span className="nords-flyout__row-count">{type.count}</span>
                      </div>
                      <div className="nords-flyout__row-right" style={{ gap: '4px', display: 'flex', alignItems: 'center' }}>
                        {state === 'show' && <EyeIcon size={13} style={{ color: type.color }} />}
                        {state === 'dim' && <CircleDot size={13} style={{ opacity: 0.5 }} />}
                        {state === 'hide' && <EyeOff size={13} style={{ opacity: 0.3 }} />}
                        <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--nords-color-text-disabled)', minWidth: '24px' }}>{state}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="nords-flyout__footer">
                <span className="nords-flyout__footer-hint">Click to cycle: show → dim → hide</span>
              </div>
            </>
          )}
        </div>

        {/* Nord Filter Flyout (board mode) — 3-state: show → dim → hide */}
        <div className={`nords-flyout nords-glass ${openPanel === 'filter' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Nord Visibility</h3>
            <span className="nords-flyout__count">{projectNordTypes.length} types</span>
          </div>
          <div className="nords-flyout__list">
            {projectNordTypes.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: '12px' }}>
                No nords in this project yet.
              </div>
            )}
            {projectNordTypes.map(nt => {
              // In board mode, use board settings per-lane. We show a global view across all lanes.
              // Use '__global__' key for board-wide nord type visibility.
              const state = getNordTypeVisibility('__global__', nt.id);
              const NtIcon = nt.icon;
              return (
                <div key={nt.id} className={`nords-flyout__row nords-flyout__row--selectable ${state === 'show' ? 'is-active' : ''}`}
                  onClick={() => cycleNordTypeVisibility('__global__', nt.id)}
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
            <span className="nords-flyout__footer-hint">Click to cycle: show → dim → hide</span>
          </div>
        </div>

        {/* Direction Filter Flyout — consistent pattern across board and graph */}
        <div className={`nords-flyout nords-glass ${openPanel === 'direction' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Connection Direction</h3>
            <span className="nords-flyout__count">filter by direction</span>
          </div>
          <div className="nords-flyout__list">
            {DIRECTION_ROWS.map(({ key, label, icon }) => {
              // Use '__global__' for board-wide direction filters
              const ctxId = lens === 'board' ? '__global__' : (activeConnectionTypeId || '__global__');
              const enabled = getDirectionFilter(ctxId, key);
              return (
                <div key={key} className={`nords-flyout__row nords-flyout__row--selectable ${enabled ? 'is-active' : ''}`}
                  onClick={() => toggleDirectionFilter(ctxId, key)}
                  style={{ opacity: enabled ? 1 : 0.35 }}
                >
                  <div className="nords-flyout__row-left">
                    <span style={{ color: enabled ? 'var(--nords-color-accent)' : 'var(--nords-color-text-disabled)', display: 'flex' }}>{icon}</span>
                    <span className="nords-flyout__row-name">{label}</span>
                  </div>
                  <div className="nords-flyout__row-right">
                    {enabled ? <EyeIcon size={13} style={{ color: 'var(--nords-color-accent)' }} /> : <EyeOff size={13} style={{ opacity: 0.3 }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="nords-flyout__footer">
            <span className="nords-flyout__footer-hint">
              <ArrowLeftRight size={10} />
              {lens === 'board' ? '"No Connection" shows nords in the orphan column' : 'Filter which connection directions to display'}
            </span>
          </div>
        </div>

        {/* Persona Switcher Flyout */}
        <div className={`nords-flyout nords-glass ${openPanel === 'persona' ? 'is-open' : ''}`}>
          <div className="nords-flyout__header">
            <h3 className="nords-flyout__title">Personas</h3>
            <span className="nords-flyout__count">{personas.length} defined</span>
          </div>
          <div className="nords-flyout__list">
            {personas.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--nords-color-text-disabled)', fontSize: '12px' }}>
                No personas defined. Create one in Project Settings → Personas.
              </div>
            )}
            {personas.map(p => (
              <div key={p.id} className={`nords-flyout__row nords-flyout__row--selectable ${activePersonaId === p.id ? 'is-active' : ''}`}
                onClick={() => { setActivePersonaId(p.id); setOpenPanel(null); }}
              >
                <div className="nords-flyout__row-left">
                  <Users size={14} strokeWidth={1.6} style={{ color: 'var(--nords-color-text-tertiary)', flexShrink: 0 }} />
                  <span className="nords-flyout__row-name">{p.name}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="nords-flyout__footer">
            <span className="nords-flyout__footer-hint"><Users size={10} /> Select a persona to weight the graph</span>
          </div>
        </div>

      </div>
    </>
  );
}

