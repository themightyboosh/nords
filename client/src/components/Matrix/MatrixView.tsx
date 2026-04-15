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
import { useConnectionMutations } from '../../hooks/useNordMutations';
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
  const { createConnection, updateConnection, deleteConnection } = useConnectionMutations(projectId);

  // Direction filter: 'all' | 'forward' | 'reverse' | 'both' | 'none'
  const [directionFilter, setDirectionFilter] = useState<string>('all');

  // Find the active connection type
  const activeType = useMemo(() => {
    if (!activeConnectionTypeId) return null;
    return connectionTypes.find(ct => ct.id === activeConnectionTypeId) || null;
  }, [activeConnectionTypeId, connectionTypes]);

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

    // Index connections by source/target for active type
    const connectionsByNord = new Map<string, { connectionId: string; distance_x: number; distance_y: number; direction: string }[]>();
    for (const conn of graph.connections) {
      if (conn.type_id !== activeType.id) continue;
      // Apply direction filter
      if (directionFilter !== 'all' && conn.direction !== directionFilter) continue;
      for (const nordId of [conn.source_nord_id, conn.target_nord_id]) {
        if (!connectionsByNord.has(nordId)) {
          connectionsByNord.set(nordId, []);
        }
        connectionsByNord.get(nordId)!.push({
          connectionId: conn.id,
          distance_x: conn.distance_x,
          distance_y: conn.distance_y ?? 0.5,
          direction: conn.direction,
        });
      }
    }

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

      visibleNordIds.add(nord.id);

      const conns = connectionsByNord.get(nord.id);

      const card: MatrixCard = {
        id: nord.id,
        title: nord.title || 'Untitled',
        typeName: nordType?.name || 'Unknown',
        typeColor: nordType?.accent_color || '#4da6ff',
        typeIcon: resolveIcon(nordType?.icon || null),
        typeId: nord.type_id,
        resolvedLabel: '',
        resolvedYLabel: '',
        distance: 0.5,
        distanceY: 0.5,
        connectionIds: conns?.map(c => c.connectionId) || [],
        connectionDirection: conns?.[0]?.direction || 'forward',
        properties: Object.entries(nord.properties || {}).slice(0, 3).map(([key, value]) => ({
          key,
          value: String(value),
        })),
      };

      if (!conns || conns.length === 0) {
        unlinkedCards.push(card);
        continue;
      }

      const avgDistanceX = conns.reduce((sum, c) => sum + c.distance_x, 0) / conns.length;
      const avgDistanceY = conns.reduce((sum, c) => sum + c.distance_y, 0) / conns.length;
      const resolved = resolveStageLabel(avgDistanceX, labels);
      card.resolvedLabel = resolved || labels[0].label;
      card.distance = avgDistanceX;
      card.distanceY = avgDistanceY;

      if (isQuadrant && yLabels.length > 0) {
        const resolvedY = resolveStageLabel(avgDistanceY, yLabels);
        card.resolvedYLabel = resolvedY || yLabels[0].label;
        const cellKey = `${card.resolvedLabel}|${card.resolvedYLabel}`;
        const cell = cells.get(cellKey);
        if (cell) {
          cell.push(card);
        } else {
          unlinkedCards.push(card);
        }
      }

      const col = columnMap.get(card.resolvedLabel);
      if (col) {
        col.push(card);
      } else if (!isQuadrant) {
        unlinkedCards.push(card);
      }
    }

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

  const handleColumnDrop = useCallback(async (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    const data = getDragData(e);
    if (!data || !activeType) return;

    if (data.sourceConnectionIds.length > 0) {
      // Move within board — update distance_x on ALL connections for this nord
      await Promise.all(
        data.sourceConnectionIds.map(cid =>
          updateConnection(cid, { distance_x: targetPosition })
        )
      );
    }
    await refetchGraph();
  }, [activeType, updateConnection, refetchGraph]);

  const handleConnectionEntryDrop = useCallback(async (e: React.DragEvent, targetTypeId: string) => {
    e.preventDefault();
    const data = getDragData(e);
    if (!data) return;

    const addMode = isAddLinkMode(e);

    if (!addMode && data.sourceConnectionIds.length > 0) {
      // Move mode: delink ALL from source, open target board
      await Promise.all(
        data.sourceConnectionIds.map(cid => deleteConnection(cid))
      );
      await refetchGraph();
      setActiveConnectionTypeId(targetTypeId);
    } else if (addMode) {
      // Add mode: create link to target, stay on current board
      // TODO: create connection on target type at midpoint
      await refetchGraph();
    }
  }, [deleteConnection, refetchGraph, setActiveConnectionTypeId]);

  const handleConnectionEntryDoubleClick = useCallback((typeId: string) => {
    setActiveConnectionTypeId(typeId);
  }, [setActiveConnectionTypeId]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // ── Render helpers ──

  const renderCard = (card: MatrixCard) => {
    const handleCardDragStart = (e: React.DragEvent<HTMLDivElement>) => {
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
        if (e.altKey) {
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

    return (
      <div
        key={card.id}
        className="nords-matrix__card-wrapper"
        draggable
        onDragStart={handleCardDragStart}
        onClick={() => onNordClick(card.id)}
      >
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

  return (
    <div className="nords-matrix">
      {/* Board header — large title + direction filter */}
      <div className="nords-matrix__header">
        <div className="nords-matrix__header-left">
          <h1 className="nords-matrix__title" style={{ color: activeType.color }}>
            {activeType.name}
          </h1>
          {activeType.verb && (
            <span className="nords-matrix__verb">{activeType.verb}</span>
          )}
          <span className="nords-matrix__header-count">{totalCards} nords</span>
        </div>

        <div className="nords-matrix__header-right">
          {/* Direction filter segmented control */}
          <div className="nords-matrix__direction-filter">
            {(['all', 'forward', 'reverse', 'both', 'none'] as const).map(dir => (
              <button
                key={dir}
                className={`nords-matrix__direction-btn ${directionFilter === dir ? 'is-active' : ''}`}
                onClick={() => setDirectionFilter(dir)}
                title={`Show ${dir === 'all' ? 'all directions' : dir + ' connections'}`}
              >
                {dir === 'all' ? 'All' : dir === 'forward' ? '→ From' : dir === 'reverse' ? '← To' : dir === 'both' ? '↔ Both' : '⊘ None'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Render swimlane grid OR flat columns */}
      {isQuadrant ? (
        /* ── Quadrant Mode: CSS Grid with swimlane rows ── */
        <div className="nords-matrix__grid" style={{
          gridTemplateColumns: `80px repeat(${columns.length}, 1fr)`,
          gridTemplateRows: `auto repeat(${yLabels.length}, 1fr)`,
        }}>
          {/* Top-left corner (empty) */}
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

          {/* Row headers + cells */}
          {yLabels.map(yl => (
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
                    onDrop={(e) => handleColumnDrop(e, col.position)}
                  >
                    {cellCards.map(card => renderCard(card))}
                    {cellCards.length === 0 && (
                      <div className="nords-matrix__column-empty">—</div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      ) : (
        /* ── Flat Column Mode ── */
        <div className="nords-matrix__columns">
          {columns.map((col) => (
            <div
              key={col.label}
              className="nords-matrix__column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleColumnDrop(e, col.position)}
            >
              <div className="nords-matrix__column-header">
                <span className="nords-matrix__column-label" style={{ color: activeType.color }}>
                  {col.label}
                </span>
                <span className="nords-matrix__column-count">{col.cards.length}</span>
              </div>
              <div className="nords-matrix__column-body">
                {col.cards.map(card => renderCard(card))}
                {col.cards.length === 0 && (
                  <div className="nords-matrix__column-empty">No nords</div>
                )}
              </div>
            </div>
          ))}

          {/* 👻 Orphans column */}
          {boardSettings?.showOrphans && unlinked.length > 0 && (
            <div className="nords-matrix__column nords-matrix__column--orphans">
              <div className="nords-matrix__column-header">
                <span className="nords-matrix__column-label nords-matrix__column-label--muted">
                  <Unlink size={12} /> Orphans
                </span>
                <span className="nords-matrix__column-count">{unlinked.length}</span>
              </div>
              <div className="nords-matrix__column-body">
                {unlinked.map(card => renderCard(card))}
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
                <span className="nords-matrix__connection-hint">drop card or click to pivot</span>
                {connectionEntries.map(entry => (
                  <div
                    key={entry.typeId}
                    className="nords-matrix__connection-entry"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleConnectionEntryDrop(e, entry.typeId)}
                    onClick={() => handleConnectionEntryDoubleClick(entry.typeId)}
                  >
                    <span className="nords-matrix__connection-swatch" style={{ backgroundColor: entry.typeColor }} />
                    <span className="nords-matrix__connection-name">{entry.typeName}</span>
                    <span className="nords-matrix__connection-count">{entry.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom toolbar: type pills + orphans toggle ── */}
      <div className="nords-matrix__bottom-bar">
        <div className="nords-matrix__type-pills">
          {nordTypes.map(nt => {
            const visible = isNordTypeVisible(activeType.id, nt.id);
            const NtIcon = nt.icon;
            return (
              <button
                key={nt.id}
                className={`nords-matrix__type-pill ${visible ? 'is-active' : ''}`}
                onClick={() => toggleNordTypeFilter(activeType.id, nt.id)}
                title={`${visible ? 'Hide' : 'Show'} ${nt.name}`}
                style={visible ? { borderColor: nt.color, color: nt.color } : undefined}
              >
                <NtIcon size={12} strokeWidth={1.8} />
                <span>{nt.name}</span>
              </button>
            );
          })}
          <button
            className={`nords-matrix__type-pill nords-matrix__type-pill--orphans ${boardSettings?.showOrphans ? 'is-active' : ''}`}
            onClick={() => toggleOrphans(activeType.id)}
            title={boardSettings?.showOrphans ? 'Hide orphans' : 'Show orphans'}
          >
            <Unlink size={12} strokeWidth={1.8} />
            <span>Orphans</span>
          </button>
        </div>
      </div>
    </div>
  );
}

