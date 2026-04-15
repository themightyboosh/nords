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

import React, { useMemo, useState, useCallback } from 'react';
import { useTypeRegistryContext } from '../../context/TypeRegistryContext';
import { useLens } from '../../context/LensContext';
import { resolveStageLabel } from '../../utils/stageLabels';
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
  const { createConnection, deleteConnection } = useConnectionMutations(projectId);
  const { upsertPosition, removePosition } = useBoardPositionMutations(projectId);

  // Option key + mouse-held state for drag UX
  const [optionHeld, setOptionHeld] = useState(false);
  const [mouseHeld, setMouseHeld] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [isDragCloning, setIsDragCloning] = useState(false);

  // Keyboard listener — also handles Option toggle mid-mousedown
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.altKey) {
        setOptionHeld(true);
        // Toggle clone mode any time Alt is pressed while mouse is held/dragging
        if (mouseHeld || draggingCardId) setIsDragCloning(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (!e.altKey) {
        setOptionHeld(false);
        if (mouseHeld || draggingCardId) setIsDragCloning(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [mouseHeld, draggingCardId]); // re-bind when either changes

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

    // Resolve final position for a nord: explicit override > derived > null (orphan)
    const resolvePosition = (nordId: string): { distance_x: number; distance_y: number } | null => {
      const explicit = explicitPositionByNord.get(nordId);
      if (explicit) return explicit;
      const xAcc = derivedDistX.get(nordId);
      if (!xAcc) return null; // no connections of this type → not on this board
      const yAcc = derivedDistY.get(nordId) ?? { sum: 0.5, count: 1 };
      return {
        distance_x: xAcc.sum / xAcc.count,
        distance_y: yAcc.sum / yAcc.count,
      };
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
        connectionIds: connIds,
        connectionDirection: firstConn?.direction || 'forward',
        properties: Object.entries(nord.properties || {}).slice(0, 3).map(([key, value]) => ({
          key,
          value: String(value),
        })),
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
      cards: (columnMap.get(lbl.label) || []).sort((a, b) => a.distance - b.distance),
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
   * Smart positional drop handler.
   *
   * Reads the drop y-position relative to sibling card wrappers in the column
   * body to determine WHERE in the sorted order the card was dropped, then
   * interpolates a distance_x between the two neighbouring cards.
   *
   * If dropped above all cards → distance slightly below lowest neighbour.
   * If dropped below all cards → distance slightly above highest neighbour.
   * If dropped between two cards → midpoint of their distances.
   * If column is empty → use the column's staged position value.
   */
  const handleCellDrop = useCallback(async (
    e: React.DragEvent,
    columnPosition: number,       // the stage label's 0-1 position
    columnCards: MatrixCard[],    // current sorted cards in this column
    targetPositionY?: number
  ) => {
    e.preventDefault();
    const data = getDragData(e);
    if (!data || !activeType) return;

    let newDistX = columnPosition; // fallback: column's nominal position

    if (columnCards.length > 0) {
      // Find sibling card wrappers by reading their DOM positions
      const colBody = (e.currentTarget as HTMLElement);
      const cardEls = Array.from(colBody.querySelectorAll<HTMLElement>(':scope > .nords-matrix__card-wrapper'));

      if (cardEls.length > 0) {
        const dropY = e.clientY;

        // Map each card element to its centre Y and its distance value
        const sorted = cardEls.map((el, i) => ({
          midY: el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2,
          distance: columnCards[i]?.distance ?? columnPosition,
        }));

        if (dropY < sorted[0].midY) {
          // Dropped above the first card — go slightly lower than it
          newDistX = Math.max(0, sorted[0].distance - 0.05);
        } else if (dropY > sorted[sorted.length - 1].midY) {
          // Dropped below the last card — go slightly higher than it
          newDistX = Math.min(1, sorted[sorted.length - 1].distance + 0.05);
        } else {
          // Find the pair the drop falls between
          for (let i = 0; i < sorted.length - 1; i++) {
            if (dropY >= sorted[i].midY && dropY <= sorted[i + 1].midY) {
              newDistX = (sorted[i].distance + sorted[i + 1].distance) / 2;
              break;
            }
          }
        }
      }
    }

    // Clamp to [0, 1]
    newDistX = Math.max(0, Math.min(1, newDistX));

    await upsertPosition({
      nord_id: data.nordId,
      type_id: activeType.id,
      distance_x: newDistX,
      distance_y: targetPositionY ?? 0.5,
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

  // ── Render helpers ──

  const renderCard = (card: MatrixCard) => {
    const isDraggingThis = draggingCardId === card.id;

    const handleCardMouseDown = () => {
      setMouseHeld(true);
    };

    const handleCardMouseUp = () => {
      setMouseHeld(false);
    };

    const handleCardDragStart = (e: React.DragEvent<HTMLDivElement>) => {
      const isCloning = e.altKey || optionHeld;
      setDraggingCardId(card.id);
      setIsDragCloning(isCloning);
      handleDragStart(e, card);

      // Create a tilted ghost for the drag image
      const cardEl = e.currentTarget.querySelector('.nords-node') as HTMLElement;
      if (cardEl) {
        const ghost = cardEl.cloneNode(true) as HTMLElement;
        ghost.style.transform = 'rotate(-3deg)';
        ghost.style.width = `${cardEl.offsetWidth}px`;
        ghost.style.position = 'absolute';
        ghost.style.top = '-9999px';
        ghost.style.left = '-9999px';
        ghost.style.zIndex = '9999';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.92';

        // If Option key held at drag start, add a stacked card behind
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
    };

    const handleCardDragEnd = () => {
      setDraggingCardId(null);
      setIsDragCloning(false);
      setMouseHeld(false);
    };

    const wrapperClass = [
      'nords-matrix__card-wrapper',
      isDraggingThis ? 'is-dragging' : '',
      isDraggingThis && isDragCloning ? 'is-clone-dragging' : '',
      !isDraggingThis && mouseHeld && draggingCardId === null ? 'is-mouse-held' : '',
    ].filter(Boolean).join(' ');

    return (
      <div
        key={card.id}
        className={wrapperClass}
        draggable
        onMouseDown={handleCardMouseDown}
        onMouseUp={handleCardMouseUp}
        onDragStart={handleCardDragStart}
        onDragEnd={handleCardDragEnd}
        onClick={() => onNordClick(card.id)}
      >
        {/* + COPY badge — visible only when Option is held (is-clone-dragging) */}
        <span className="nords-matrix__clone-badge">+ COPY</span>
        <NordCard
          title={card.title}
          typeName={card.typeName}
          typeColor={card.typeColor}
          typeIcon={card.typeIcon}
          properties={card.properties}
          isSelected={selectedNord === card.id}
          style={{ width: '100%' }}
        />
      </div>
    );
  };

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
              className="nords-matrix__grid-cell"
              onDragOver={handleDragOver}
              onDrop={(e) => handleCellDrop(e, col.position, gridCells.get(cellKey) || [], yl.position)}
            >

                    {cellCards.map(card => renderCard(card))}
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
                    unlinked.map(card => renderCard(card))
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
              className="nords-matrix__column"
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
                onDrop={(e) => handleCellDrop(e, col.position, col.cards)}
              >
                {col.cards.map(card => renderCard(card))}
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
                  unlinked.map(card => renderCard(card))
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

