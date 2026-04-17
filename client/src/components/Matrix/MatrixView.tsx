/**
 * MatrixView.tsx — Full-screen kanban board for one connection type.
 *
 * DATA MODEL:
 *   One board fills the screen. The active connection type (from the dock)
 *   determines which board is shown. Columns = x-axis stage labels.
 *   Swimlane rows = y-axis stage labels (quadrant mode only).
 *
 * FEATURES:
 *   - Cards use shared NordCard component (same as canvas)
 *   - Per-board nord type filter dropdown (persisted per connection type)
 *   - 👻 Orphans pseudo-column (nords with no connections of this type)
 *   - 🔗 Connections pseudo-column (other board-capable types)
 *   - Drag cards between columns → updates distance_x
 *   - Drag cards onto 🔗 entries → re-link (⌥ Option = add-link)
 *   - Double-click 🔗 entry → switch to that board
 *
 * INTERACTION:
 *   - Click a card → opens drawer (same as canvas)
 *   - Connection type switching via dock OR 🔗 double-click
 */

import React, { useMemo, useState, useCallback, memo } from 'react';
import { useTypeRegistryContext } from '../../context/TypeRegistryContext';
import { useLens } from '../../context/LensContext';
import { resolveStageLabel, getColumnBounds } from '../../utils/stageLabels';
import type { ProjectGraph } from '../../hooks/useProjectGraph';
import { resolveIcon } from '../../utils/iconRegistry';
import { useBoardSettings } from '../../hooks/useBoardSettings';
import { setDragData, getDragData, isAddLinkMode, type BoardDragData } from '../../hooks/useBoardDragDrop';
import { useConnectionMutations, useBoardPositionMutations } from '../../hooks/useNordMutations';
import { NordCard } from '../shared/NordCard';
import { Link2, Unlink } from 'lucide-react';
import '../Canvas/CanvasEngine.css';
import './MatrixView.css';

interface MatrixViewProps {
  graph: ProjectGraph | null;
  onNordClick: (id: string) => void;
  selectedNord: string | null;
  projectId: string;
  refetchGraph: () => Promise<void>;
}

interface MatrixCard {
  id: string;
  title: string;
  typeName: string;
  typeColor: string;
  typeIcon: any;
  typeId: string;
  resolvedLabel: string;
  resolvedYLabel: string;
  distance: number;
  distanceY: number;
  sortOrder: number;
  connectionIds: string[];
  connectionDirection: string;
  properties: Array<{ key: string; value: string; color?: string }>;
}

interface ConnectionEntry {
  typeId: string;
  typeName: string;
  typeColor: string;
  count: number;
}

export function MatrixView({ graph, onNordClick, selectedNord, projectId, refetchGraph }: MatrixViewProps) {
  const { activeConnectionTypeId, setActiveConnectionTypeId } = useLens();
  const { connectionTypes, nordTypes } = useTypeRegistryContext();
  const { isNordTypeVisible, toggleNordTypeFilter, getBoard, toggleOrphans, ensureNordTypeVisible } = useBoardSettings(projectId);
  const { createConnection, updateConnection, deleteConnection } = useConnectionMutations(projectId);
  const { upsertPosition, removePosition } = useBoardPositionMutations(projectId);

  // ── Drag interaction state ──
  const [optionHeld, setOptionHeld] = useState(false);
  const [mouseHeldCardId, setMouseHeldCardId] = useState<string | null>(null); // Phase 1: track WHICH card is held
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [isDragCloning, setIsDragCloning] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null); // Phase 3: visual drop target

  // Keyboard listener — also handles Option toggle mid-drag
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.altKey) {
        setOptionHeld(true);
        if (mouseHeldCardId || draggingCardId) setIsDragCloning(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (!e.altKey) {
        setOptionHeld(false);
        if (mouseHeldCardId || draggingCardId) setIsDragCloning(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [mouseHeldCardId, draggingCardId]);

  // Find the active connection type
  const activeType = useMemo(() => {
    if (!activeConnectionTypeId) return null;
    return connectionTypes.find(ct => ct.id === activeConnectionTypeId) || null;
  }, [activeConnectionTypeId, connectionTypes]);

  // Direction filter: read from the connection type (type-level DB setting)
  const directionFilter = activeType?.directionFilter || 'all';

  // setDirectionFilter is no longer needed in MatrixView — handled by GlobalDock
  // Listen for refetch events dispatched by GlobalDock when filter changes
  React.useEffect(() => {
    const handler = () => { refetchGraph(); };
    window.addEventListener('nords:refetch', handler);
    return () => window.removeEventListener('nords:refetch', handler);
  }, [refetchGraph]);

  const boardSettings = activeType ? getBoard(activeType.id) : null;

  // Board-capable connection types (for 🔗 column)
  const boardCapableTypes = useMemo(() => {
    return connectionTypes.filter(ct =>
      ct.id !== activeConnectionTypeId &&
      ct.measurementMode !== 'none' &&
      ct.xStageLabels.length > 0
    );
  }, [connectionTypes, activeConnectionTypeId]);

  // Build columns + cards (+ swimlane grid for quadrant mode)
  const isQuadrant = activeType?.yStageLabels && activeType.yStageLabels.length > 0;
  const yLabels = isQuadrant ? activeType!.yStageLabels : [];

  const { columns, unlinked, connectionEntries, gridCells } = useMemo(() => {
    if (!graph || !activeType || activeType.xStageLabels.length === 0) {
      return { columns: [], unlinked: [], connectionEntries: [], gridCells: new Map<string, MatrixCard[]>() };
    }

    const labels = activeType.xStageLabels;
    const typeMap = new Map(graph.nord_types.map(t => [t.id, t]));

    // Explicit board positions (user drag overrides): nord_id → position
    const explicitPositionByNord = new Map<string, { distance_x: number; distance_y: number }>();
    for (const pos of (graph.board_positions || [])) {
      if (pos.type_id === activeType.id) {
        explicitPositionByNord.set(pos.nord_id, { distance_x: pos.distance_x, distance_y: pos.distance_y });
      }
    }

    // True orphans: nords with ZERO connections of ANY kind
    const nordsWithAnyConnection = new Set<string>();
    for (const conn of graph.connections) {
      nordsWithAnyConnection.add(conn.source_nord_id);
      nordsWithAnyConnection.add(conn.target_nord_id);
    }

    // Auto-derive board position from connection distances for this type.
    // Accumulate sum of distance_x and count per nord, then average.
    const derivedDistX = new Map<string, { sum: number; count: number }>();
    const derivedDistY = new Map<string, { sum: number; count: number }>();
    const connectionsByNord = new Map<string, string[]>();

    for (const conn of graph.connections) {
      if (conn.type_id !== activeType.id) continue;
      if (directionFilter !== 'all' && conn.direction !== directionFilter) continue;

      for (const nordId of [conn.source_nord_id, conn.target_nord_id]) {
        // Track connection IDs per nord
        if (!connectionsByNord.has(nordId)) connectionsByNord.set(nordId, []);
        if (!connectionsByNord.get(nordId)!.includes(conn.id)) {
          connectionsByNord.get(nordId)!.push(conn.id);
        }
        // Accumulate distance_x
        const xAcc = derivedDistX.get(nordId) ?? { sum: 0, count: 0 };
        xAcc.sum += conn.distance_x ?? 0.5;
        xAcc.count++;
        derivedDistX.set(nordId, xAcc);
        // Accumulate distance_y
        const yAcc = derivedDistY.get(nordId) ?? { sum: 0, count: 0 };
        yAcc.sum += conn.distance_y ?? 0.5;
        yAcc.count++;
        derivedDistY.set(nordId, yAcc);
      }
    }

    // Resolve final position for a nord:
    //   1. Explicit board_position (user-placed override from board drag)
    //   2. Derived from connection distances (auto-placement)
    //   3. null → not on this board
    const resolvePosition = (nordId: string): { distance_x: number; distance_y: number } | null => {
      // Prefer explicit board position — board drag writes here, NOT to connections
      const explicit = explicitPositionByNord.get(nordId);
      if (explicit) return explicit;
      // Fall back to derived from connection distances
      const xAcc = derivedDistX.get(nordId);
      if (xAcc) {
        const yAcc = derivedDistY.get(nordId) ?? { sum: 0.5, count: 1 };
        return {
          distance_x: xAcc.sum / xAcc.count,
          distance_y: yAcc.sum / yAcc.count,
        };
      }
      return null; // not on this board
    };

    // Build column buckets
    const columnMap = new Map<string, MatrixCard[]>();
    for (const lbl of labels) {
      columnMap.set(lbl.label, []);
    }
    const unlinkedCards: MatrixCard[] = [];

    // Grid cells for quadrant mode: key = "xLabel|yLabel"
    const cells = new Map<string, MatrixCard[]>();
    if (isQuadrant) {
      for (const xl of labels) {
        for (const yl of yLabels) {
          cells.set(`${xl.label}|${yl.label}`, []);
        }
      }
    }

    // Track visible nord IDs for scoping 🔗 column
    const visibleNordIds = new Set<string>();

    for (const nord of graph.nords) {
      const nordType = typeMap.get(nord.type_id);

      // Apply nord type filter
      if (!isNordTypeVisible(activeType.id, nord.type_id)) continue;

      const isOrphan = !nordsWithAnyConnection.has(nord.id);
      const pos = resolvePosition(nord.id);

      // Nord has no connections of this type AND is not a true orphan → skip (belongs only on other boards)
      if (!isOrphan && !pos) continue;

      visibleNordIds.add(nord.id);

      const connIds = connectionsByNord.get(nord.id) || [];
      const firstConn = graph.connections.find(c =>
        c.type_id === activeType.id &&
        (c.source_nord_id === nord.id || c.target_nord_id === nord.id)
      );

      const card: MatrixCard = {
        id: nord.id,
        title: nord.title || 'Untitled',
        typeName: nordType?.name || 'Unknown',
        typeColor: nordType?.accent_color || '#4da6ff',
        typeIcon: resolveIcon(nordType?.icon || null),
        typeId: nord.type_id,
        resolvedLabel: '',
        resolvedYLabel: '',
        distance: pos?.distance_x ?? 0.5,
        distanceY: pos?.distance_y ?? 0.5,
        sortOrder: (() => {
          // Min sort_order across this nord's connections of this type
          if (connIds.length === 0) return 0;
          const orders = connIds.map(cid => {
            const c = graph.connections.find(cc => cc.id === cid);
            return c?.sort_order ?? 0;
          });
          return Math.min(...orders);
        })(),
        connectionIds: connIds,
        connectionDirection: firstConn?.direction || 'forward',
        properties: (() => {
          // Schema-ordered card preview: same logic as graphToReactFlow.
          // Show only properties with card_row 1 or 2, sorted by row.
          const schema = nordType?.properties_schema || [];
          const propsObj = nord.properties || {};
          return schema
            .filter((s: any) => s.card_row === 1 || s.card_row === 2)
            .sort((a: any, b: any) => (a.card_row || 999) - (b.card_row || 999))
            .map((s: any) => ({ key: s.name, value: String((propsObj as any)[s.name] ?? '') }))
            .filter(p => p.value !== '');
        })(),
      };

      if (isOrphan) {
        // True orphan: no connections anywhere — show in orphan section on every board
        unlinkedCards.push(card);
        continue;
      }

      // Place card: use resolved position (derived or explicit override)
      const distX = pos!.distance_x;
      const distY = pos!.distance_y;
      const resolved = resolveStageLabel(distX, labels);
      card.resolvedLabel = resolved || labels[0].label;
      card.distance = distX;
      card.distanceY = distY;

      if (isQuadrant && yLabels.length > 0) {
        const resolvedY = resolveStageLabel(distY, yLabels);
        card.resolvedYLabel = resolvedY || yLabels[0].label;
        const cellKey = `${card.resolvedLabel}|${card.resolvedYLabel}`;
        const cell = cells.get(cellKey);
        if (cell) {
          cell.push(card);
        } else {
          unlinkedCards.push(card);
        }
        const col = columnMap.get(card.resolvedLabel);
        if (col) col.push(card);
      } else {
        const col = columnMap.get(card.resolvedLabel);
        if (col) {
          col.push(card);
        } else {
          unlinkedCards.push(card);
        }
      }
    } // end for nord

    // Build 🔗 connection entries scoped to visible nords
    const entries: ConnectionEntry[] = [];
    for (const ct of boardCapableTypes) {
      let count = 0;
      for (const conn of graph.connections) {
        if (conn.type_id !== ct.id) continue;
        if (visibleNordIds.has(conn.source_nord_id) || visibleNordIds.has(conn.target_nord_id)) {
          count++;
        }
      }
      if (count > 0) {
        entries.push({
          typeId: ct.id,
          typeName: ct.name,
          typeColor: ct.color || '#888',
          count,
        });
      }
    }

    const columns = labels.map(lbl => ({
      label: lbl.label,
      position: lbl.position,
      cards: (columnMap.get(lbl.label) || []).sort((a, b) => {
        // Primary: sort_order (Trello-style), secondary: title
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.title.localeCompare(b.title);
      }),
    }));

    return { columns, unlinked: unlinkedCards, connectionEntries: entries, gridCells: cells };
  }, [graph, activeType, boardCapableTypes, isNordTypeVisible, isQuadrant, yLabels, directionFilter]);

  // ── Drag handlers ──

  const handleDragStart = useCallback((e: React.DragEvent, card: MatrixCard) => {
    setDragData(e, {
      nordId: card.id,
      nordTitle: card.title,
      sourceConnectionIds: card.connectionIds,
      sourceConnectionTypeId: activeType?.id || '',
      sourceDirection: card.connectionDirection,
    });
  }, [activeType]);

  /**
   * Board drop handler — cosmetic only.
   *
   * Board drag writes ONLY to board_positions (per-nord),
   * NEVER to connections.distance_x (shared between two nords).
   * This prevents moving one card from dragging connected cards along.
   */
  const handleCellDrop = useCallback(async (
    e: React.DragEvent,
    columnPosition: number,       // the stage label's 0-1 position
    columnCards: MatrixCard[],    // current sorted cards in this column
    targetPositionY?: number
  ) => {
    e.preventDefault();
    setDragOverColumn(null);
    const data = getDragData(e);
    if (!data || !activeType) {
      console.warn('[Board] Drop ignored — no drag data or no active type');
      return;
    }

    const labels = activeType.xStageLabels;
    const targetLabel = resolveStageLabel(columnPosition, labels) || labels[0]?.label || '';
    const bounds = getColumnBounds(targetLabel, labels);
    const newDistY = targetPositionY ?? 0.5;

    // Write ONLY to board_positions — per-nord, never shared
    await upsertPosition({
      nord_id: data.nordId,
      type_id: activeType.id,
      distance_x: bounds.center,
      distance_y: newDistY,
    });

    await refetchGraph();
  }, [activeType, upsertPosition, refetchGraph]);

  const handleConnectionEntryDrop = useCallback(async (e: React.DragEvent, targetTypeId: string) => {
    e.preventDefault();
    const data = getDragData(e);
    if (!data) return;

    const addMode = isAddLinkMode(e);

    if (!addMode) {
      // MOVE mode: remove position from current board, create position on target, switch board
      await removePosition(data.nordId, activeType?.id || '');
      await upsertPosition({
        nord_id: data.nordId,
        type_id: targetTypeId,
        distance_x: 0.5,
        distance_y: 0.5,
      });
      await refetchGraph();
      setActiveConnectionTypeId(targetTypeId);
    } else {
      // CLONE mode (Option held): create position on target type, STAY on current board
      await upsertPosition({
        nord_id: data.nordId,
        type_id: targetTypeId,
        distance_x: 0.5,
        distance_y: 0.5,
      });
      await refetchGraph();
    }
  }, [upsertPosition, removePosition, activeType, refetchGraph, setActiveConnectionTypeId]);

  const handleConnectionEntryDoubleClick = useCallback((typeId: string) => {
    setActiveConnectionTypeId(typeId);
  }, [setActiveConnectionTypeId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleColumnDragEnter = useCallback((columnLabel: string) => {
    setDragOverColumn(columnLabel);
  }, []);

  const handleColumnDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we actually left the column (not entering a child)
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      setDragOverColumn(null);
    }
  }, []);

  // ── Render ──
  // BoardCard is defined below as a React.memo component to prevent N² re-renders.

  // ── No active type state ──
  if (!activeType) {
    return (
      <div className="nords-matrix-empty">
        <div className="nords-matrix-empty__icon">⊞</div>
        <h2 className="nords-matrix-empty__title">Board View</h2>
        <p className="nords-matrix-empty__desc">
          Select a connection type from the dock to view a kanban board organized by stage labels.
        </p>
      </div>
    );
  }

  if (activeType.xStageLabels.length === 0) {
    return (
      <div className="nords-matrix-empty">
        <div className="nords-matrix-empty__icon">⊞</div>
        <h2 className="nords-matrix-empty__title">No stage labels defined</h2>
        <p className="nords-matrix-empty__desc">
          Add stage labels to "{activeType.name}" in Manage Types → Spectrum Editor to use Board View.
        </p>
      </div>
    );
  }

  const totalCards = columns.reduce((sum, col) => sum + col.cards.length, 0) + unlinked.length;

  // Count hidden nords (those filtering out by type visibility)
  const hiddenCount = graph ? graph.nords.filter(n => !isNordTypeVisible(activeType.id, n.type_id)).length : 0;

  return (
    <div className="nords-matrix">
      <div className="nords-matrix__header">
        <div className="nords-matrix__header-left">
          <h1 className="nords-matrix__title">
            <span style={{ color: activeType.color }}>{activeType.name}</span>
            {activeType.verb && (
              <span className="nords-matrix__title-verb">
                <span className="nords-matrix__title-sep">:</span>
                {activeType.verb}
              </span>
            )}
          </h1>
          <span className="nords-matrix__header-count">
            {totalCards} nords{hiddenCount > 0 && <span className="nords-matrix__hidden-count"> ({hiddenCount} hidden)</span>}
          </span>
        </div>
      </div>

      {/* Render swimlane grid OR flat columns */}
      {isQuadrant ? (() => {
        const hasOrphans = boardSettings?.showOrphans;
        const hasConnections = connectionEntries.length > 0;
        const totalRows = yLabels.length;
        return (
        /* ── Quadrant Mode: CSS Grid with swimlane rows ── */
        <div className="nords-matrix__grid" style={{
          gridTemplateColumns: `80px repeat(${columns.length}, 1fr)${hasOrphans ? ' minmax(200px, 260px)' : ''}${hasConnections ? ' minmax(180px, 220px)' : ''}`,
          gridTemplateRows: `auto repeat(${totalRows}, minmax(80px, auto))`,
        }}>
          {/* Top-left corner */}
          <div className="nords-matrix__grid-corner" />

          {/* Column headers (x-axis) */}
          {columns.map(col => (
            <div key={col.label} className="nords-matrix__grid-col-header" style={{ color: activeType.color }}>
              {col.label}
              <span className="nords-matrix__column-count">
                {col.cards.length}
              </span>
            </div>
          ))}

          {/* Orphans column header */}
          {hasOrphans && (
            <div className="nords-matrix__grid-col-header nords-matrix__grid-col-header--muted">
              <Unlink size={12} /> Orphans
              <span className="nords-matrix__column-count">{unlinked.length}</span>
            </div>
          )}

          {/* Connections column header */}
          {hasConnections && (
            <div className="nords-matrix__grid-col-header nords-matrix__grid-col-header--muted">
              <Link2 size={12} /> Connections
              <span className="nords-matrix__column-count">{connectionEntries.length}</span>
            </div>
          )}

          {/* Row headers + cells */}
          {yLabels.map((yl, rowIdx) => (
            <React.Fragment key={yl.label}>
              <div className="nords-matrix__grid-row-header" style={{ color: activeType.color }}>
                {yl.label}
              </div>
              {columns.map(col => {
                const cellKey = `${col.label}|${yl.label}`;
                const cellCards = gridCells.get(cellKey) || [];
                return (
                  <div
              key={cellKey}
              className={`nords-matrix__grid-cell ${dragOverColumn === cellKey ? 'is-drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragEnter={() => handleColumnDragEnter(cellKey)}
              onDragLeave={handleColumnDragLeave}
              onDrop={(e) => handleCellDrop(e, col.position, gridCells.get(cellKey) || [], yl.position)}
            >

                    {cellCards.map(card => (
                      <BoardCard
                        key={card.id}
                        card={card}
                        isSelected={selectedNord === card.id}
                        isDragging={draggingCardId === card.id}
                        isCloneDragging={draggingCardId === card.id && isDragCloning}
                        isMouseHeld={mouseHeldCardId === card.id}
                        optionHeld={optionHeld}
                        onMouseDown={setMouseHeldCardId}
                        onMouseUp={() => setMouseHeldCardId(null)}
                        onDragStart={(e, c) => {
                          setDraggingCardId(c.id);
                          setIsDragCloning(e.altKey || optionHeld);
                          handleDragStart(e, c);
                        }}
                        onDragEnd={() => {
                          setDraggingCardId(null);
                          setIsDragCloning(false);
                          setMouseHeldCardId(null);
                          setDragOverColumn(null);
                        }}
                        onClick={onNordClick}
                      />
                    ))}
                    {cellCards.length === 0 && (
                      <div className="nords-matrix__column-empty">—</div>
                    )}
                  </div>
                );
              })}

              {/* Orphans: only render content in the FIRST row, with row span */}
              {hasOrphans && rowIdx === 0 && (
                <div
                  className="nords-matrix__grid-cell nords-matrix__grid-cell--span"
                  style={{ gridRow: `2 / ${totalRows + 2}` }}
                >
                  {unlinked.length > 0 ? (
                    unlinked.map(card => (
                      <BoardCard
                        key={card.id}
                        card={card}
                        isSelected={selectedNord === card.id}
                        isDragging={draggingCardId === card.id}
                        isCloneDragging={draggingCardId === card.id && isDragCloning}
                        isMouseHeld={mouseHeldCardId === card.id}
                        optionHeld={optionHeld}
                        onMouseDown={setMouseHeldCardId}
                        onMouseUp={() => setMouseHeldCardId(null)}
                        onDragStart={(e, c) => {
                          setDraggingCardId(c.id);
                          setIsDragCloning(e.altKey || optionHeld);
                          handleDragStart(e, c);
                        }}
                        onDragEnd={() => {
                          setDraggingCardId(null);
                          setIsDragCloning(false);
                          setMouseHeldCardId(null);
                        }}
                        onClick={onNordClick}
                      />
                    ))
                  ) : (
                    <div className="nords-matrix__column-empty">No orphans</div>
                  )}
                </div>
              )}

              {/* Connections: only render content in the FIRST row, with row span */}
              {hasConnections && rowIdx === 0 && (
                <div
                  className="nords-matrix__grid-cell nords-matrix__grid-cell--span nords-matrix__grid-cell--connections"
                  style={{ gridRow: `2 / ${totalRows + 2}` }}
                >
                  <span className={`nords-matrix__connection-hint ${optionHeld ? 'is-clone' : ''}`}>
                    {optionHeld ? '⌥ Clone + stay on board' : 'Drop to swap board'}
                  </span>
                  {connectionEntries.map(entry => (
                    <div
                      key={entry.typeId}
                      className={`nords-matrix__connection-entry ${optionHeld ? 'is-clone-mode' : ''}`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleConnectionEntryDrop(e, entry.typeId)}
                      onClick={() => handleConnectionEntryDoubleClick(entry.typeId)}
                    >
                      <span className="nords-matrix__connection-swatch" style={{ backgroundColor: entry.typeColor }} />
                      <span className="nords-matrix__connection-name">{entry.typeName}</span>
                      <span className="nords-matrix__connection-count">{entry.count}</span>
                      <span className={`nords-matrix__connection-mode ${optionHeld ? 'is-clone' : ''}`}>
                        {optionHeld ? '+ clone' : '→ move'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        );
      })() : (
        /* ── Flat Column Mode ── */
        <div className="nords-matrix__columns">
          {columns.map((col) => (
            <div
              key={col.label}
              className={`nords-matrix__column ${dragOverColumn === col.label ? 'is-drag-over' : ''}`}
            >
              <div className="nords-matrix__column-header">
                <span className="nords-matrix__column-label" style={{ color: activeType.color }}>
                  {col.label}
                </span>
                <span className="nords-matrix__column-count">{col.cards.length}</span>
              </div>
              <div
                className="nords-matrix__column-body"
                onDragOver={handleDragOver}
                onDragEnter={() => handleColumnDragEnter(col.label)}
                onDragLeave={handleColumnDragLeave}
                onDrop={(e) => handleCellDrop(e, col.position, col.cards)}
              >
                {col.cards.map(card => (
                  <BoardCard
                    key={card.id}
                    card={card}
                    isSelected={selectedNord === card.id}
                    isDragging={draggingCardId === card.id}
                    isCloneDragging={draggingCardId === card.id && isDragCloning}
                    isMouseHeld={mouseHeldCardId === card.id}
                    optionHeld={optionHeld}
                    onMouseDown={setMouseHeldCardId}
                    onMouseUp={() => setMouseHeldCardId(null)}
                    onDragStart={(e, c) => {
                      setDraggingCardId(c.id);
                      setIsDragCloning(e.altKey || optionHeld);
                      handleDragStart(e, c);
                    }}
                    onDragEnd={() => {
                      setDraggingCardId(null);
                      setIsDragCloning(false);
                      setMouseHeldCardId(null);
                      setDragOverColumn(null);
                    }}
                    onClick={onNordClick}
                  />
                ))}
                {col.cards.length === 0 && (
                  <div className="nords-matrix__column-empty">No nords</div>
                )}
              </div>
            </div>
          ))}

          {/* 👻 Orphans column — always present in flat mode */}
          {boardSettings?.showOrphans && (
            <div className="nords-matrix__column nords-matrix__column--orphans">
              <div className="nords-matrix__column-header">
                <span className="nords-matrix__column-label nords-matrix__column-label--muted">
                  <Unlink size={12} /> Orphans
                </span>
                <span className="nords-matrix__column-count">{unlinked.length}</span>
              </div>
              <div className="nords-matrix__column-body">
                {unlinked.length > 0 ? (
                  unlinked.map(card => (
                    <BoardCard
                      key={card.id}
                      card={card}
                      isSelected={selectedNord === card.id}
                      isDragging={draggingCardId === card.id}
                      isCloneDragging={draggingCardId === card.id && isDragCloning}
                      isMouseHeld={mouseHeldCardId === card.id}
                      optionHeld={optionHeld}
                      onMouseDown={setMouseHeldCardId}
                      onMouseUp={() => setMouseHeldCardId(null)}
                      onDragStart={(e, c) => {
                        setDraggingCardId(c.id);
                        setIsDragCloning(e.altKey || optionHeld);
                        handleDragStart(e, c);
                      }}
                      onDragEnd={() => {
                        setDraggingCardId(null);
                        setIsDragCloning(false);
                        setMouseHeldCardId(null);
                      }}
                      onClick={onNordClick}
                    />
                  ))
                ) : (
                  <div className="nords-matrix__column-empty">No orphans</div>
                )}
              </div>
            </div>
          )}

          {/* 🔗 Connections column */}
          {connectionEntries.length > 0 && (
            <div className="nords-matrix__column nords-matrix__column--connections">
              <div className="nords-matrix__column-header">
                <span className="nords-matrix__column-label nords-matrix__column-label--muted">
                  <Link2 size={12} /> Connections
                </span>
                <span className="nords-matrix__column-count">{connectionEntries.length}</span>
              </div>
              <div className="nords-matrix__column-body">
                <span className={`nords-matrix__connection-hint ${optionHeld ? 'is-clone' : ''}`}>
                  {optionHeld ? '⌥ Clone + stay on board' : 'Drop to swap board'}
                </span>
                {connectionEntries.map(entry => (
                  <div
                    key={entry.typeId}
                    className={`nords-matrix__connection-entry ${optionHeld ? 'is-clone-mode' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleConnectionEntryDrop(e, entry.typeId)}
                    onClick={() => handleConnectionEntryDoubleClick(entry.typeId)}
                  >
                    <span className="nords-matrix__connection-swatch" style={{ backgroundColor: entry.typeColor }} />
                    <span className="nords-matrix__connection-name">{entry.typeName}</span>
                    <span className="nords-matrix__connection-count">{entry.count}</span>
                    <span className={`nords-matrix__connection-mode ${optionHeld ? 'is-clone' : ''}`}>
                      {optionHeld ? '+ clone' : '→ move'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// BoardCard — Memoized card wrapper for the board view.
//
// Extracted from the inline `renderCard` to prevent N² re-renders.
// Each card only re-renders when its own prop values change.
// ═══════════════════════════════════════════════════════════

interface BoardCardProps {
  card: MatrixCard;
  isSelected: boolean;
  isDragging: boolean;
  isCloneDragging: boolean;
  isMouseHeld: boolean;
  optionHeld: boolean;
  onMouseDown: (cardId: string) => void;
  onMouseUp: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, card: MatrixCard) => void;
  onDragEnd: () => void;
  onClick: (cardId: string) => void;
}

const BoardCard = memo(function BoardCard({
  card,
  isSelected,
  isDragging,
  isCloneDragging,
  isMouseHeld,
  optionHeld,
  onMouseDown,
  onMouseUp,
  onDragStart,
  onDragEnd,
  onClick,
}: BoardCardProps) {

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    onDragStart(e, card);

    // Create a tilted ghost for the drag image
    const cardEl = e.currentTarget.querySelector('.nords-node') as HTMLElement;
    if (cardEl) {
      const isCloning = e.altKey || optionHeld;
      const ghost = cardEl.cloneNode(true) as HTMLElement;
      ghost.style.transform = 'rotate(-3deg)';
      ghost.style.width = `${cardEl.offsetWidth}px`;
      ghost.style.position = 'absolute';
      ghost.style.top = '-9999px';
      ghost.style.left = '-9999px';
      ghost.style.zIndex = '9999';
      ghost.style.pointerEvents = 'none';
      ghost.style.opacity = '0.92';

      if (isCloning) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.top = '-9999px';
        wrapper.style.left = '-9999px';

        const bgCard = cardEl.cloneNode(true) as HTMLElement;
        bgCard.style.position = 'absolute';
        bgCard.style.top = '6px';
        bgCard.style.left = '6px';
        bgCard.style.transform = 'rotate(-1deg)';
        bgCard.style.opacity = '0.5';
        bgCard.style.width = `${cardEl.offsetWidth}px`;

        ghost.style.position = 'relative';
        ghost.style.top = '0';
        ghost.style.left = '0';

        wrapper.style.width = `${cardEl.offsetWidth + 10}px`;
        wrapper.style.height = `${cardEl.offsetHeight + 10}px`;
        wrapper.appendChild(bgCard);
        wrapper.appendChild(ghost);
        document.body.appendChild(wrapper);
        e.dataTransfer.setDragImage(wrapper, cardEl.offsetWidth / 2, 20);
        requestAnimationFrame(() => document.body.removeChild(wrapper));
      } else {
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, cardEl.offsetWidth / 2, 20);
        requestAnimationFrame(() => document.body.removeChild(ghost));
      }
    }
  }, [card, optionHeld, onDragStart]);

  const wrapperClass = [
    'nords-matrix__card-wrapper',
    isDragging ? 'is-dragging' : '',
    isCloneDragging ? 'is-clone-dragging' : '',
    isMouseHeld ? 'is-mouse-held' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={wrapperClass}
      draggable
      onMouseDown={() => onMouseDown(card.id)}
      onMouseUp={onMouseUp}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onClick(card.id)}
    >
      <span className="nords-matrix__clone-badge">+ COPY</span>
      <NordCard
        title={card.title}
        typeName={card.typeName}
        typeColor={card.typeColor}
        typeIcon={card.typeIcon}
        properties={card.properties}
        isSelected={isSelected}
        style={{ width: '100%' }}
      />
    </div>
  );
});
