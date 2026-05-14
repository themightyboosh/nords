/**
 * MatrixView.tsx — Multi-swimlane board view.
 *
 * DATA MODEL:
 *   Every connection type with connections in this project gets its own
 *   collapsible swimlane row. Columns = x-axis stage labels for that type.
 *   Types with no spectrum get a single "All" column.
 *
 * INTERACTIONS:
 *   - Click card → opens drawer (same as canvas)
 *   - Drag within lane → updates distance_x on existing connection
 *   - Drag cross-lane → creates new connection under target category (duplicate)
 *   - Shift+drag cross-lane → breaks old connection + creates new
 *   - Option+drag → explicit duplicate (keep both connections)
 *   - Delete/Backspace on selected card → deletes that connection (with undo toast)
 *   - Click lane header → collapse/expand (persisted in localStorage)
 */

import React, { useMemo, useState, useCallback, useEffect, useRef, memo } from 'react';
import { useTypeRegistryContext, type ResolvedConnectionType } from '../../context/TypeRegistryContext';
import { resolveStageLabel, getColumnBounds } from '../../utils/stageLabels';
import type { ProjectGraph, Connection } from '../../hooks/useProjectGraph';
import { resolveIcon } from '../../utils/iconRegistry';
import { useBoardSettingsContext } from '../../context/BoardSettingsContext';
import { setDragData, getDragData, type BoardDragData } from '../../hooks/useBoardDragDrop';
import { useConnectionMutations, useBoardPositionMutations } from '../../hooks/useNordMutations';
import { NordCard } from '../shared/NordCard';
import { ChevronDown, ChevronRight, Unlink } from 'lucide-react';
import '../Canvas/CanvasEngine.css';
import './MatrixView.css';

interface MatrixViewProps {
  graph: ProjectGraph | null;
  onNordClick: (id: string) => void;
  selectedNord: string | null;
  projectId: string;
  refetchGraph: () => Promise<void>;
}

interface SwimCard {
  id: string;            // nordId
  title: string;
  typeName: string;
  typeColor: string;
  typeIcon: any;
  typeId: string;
  connectionId: string;  // the specific connection placing this card
  connectionTypeId: string;
  resolvedLabel: string;
  distance: number;
  sortOrder: number;
  direction: string;
  isDimmed: boolean;
  properties: Array<{ key: string; value: string; color?: string }>;
}

interface LaneColumn {
  label: string;
  position: number;
  cards: SwimCard[];
}

interface Swimlane {
  connectionType: ResolvedConnectionType;
  columns: LaneColumn[];
  cardCount: number;
}

// ── Component ──

export function MatrixView({ graph, onNordClick, selectedNord, projectId, refetchGraph }: MatrixViewProps) {
  const { connectionTypes, nordTypes } = useTypeRegistryContext();
  const { isNordTypeVisible, isLaneCollapsed, toggleLaneCollapse } = useBoardSettingsContext();
  const { createConnection, deleteConnection } = useConnectionMutations(projectId);
  const { upsertPosition } = useBoardPositionMutations(projectId);

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<{ message: string; undoFn: () => Promise<void> } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Keyboard: Delete selected card's connection ──
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only act if no input is focused
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (!selectedNord || !graph) return;

        // Find the first connection involving this nord (pick from any lane)
        const conn = graph.connections.find(
          c => (c.source_nord_id === selectedNord || c.target_nord_id === selectedNord) && !c.deleted_at
        );
        if (!conn) return;

        e.preventDefault();
        const nord = graph.nords.find(n => n.id === selectedNord);
        const ct = connectionTypes.find(t => t.id === conn.type_id);

        // Save for undo
        const savedConn = { ...conn };
        await deleteConnection(conn.id);
        await refetchGraph();

        showUndoToast(
          `Removed "${nord?.title || 'Nord'}" from ${ct?.name || 'category'}`,
          async () => {
            await createConnection({
              type_id: savedConn.type_id,
              source_nord_id: savedConn.source_nord_id,
              target_nord_id: savedConn.target_nord_id,
              direction: savedConn.direction as any,
              distance_x: savedConn.distance_x,
              distance_y: savedConn.distance_y,
            });
            await refetchGraph();
          }
        );
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNord, graph, connectionTypes, deleteConnection, createConnection, refetchGraph]);

  function showUndoToast(message: string, undoFn: () => Promise<void>) {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoToast({ message, undoFn });
    undoTimer.current = setTimeout(() => setUndoToast(null), 5000);
  }

  // ── Build swimlanes ──
  const swimlanes = useMemo<Swimlane[]>(() => {
    if (!graph) return [];

    const typeMap = new Map(graph.nord_types.map(t => [t.id, t]));

    // Index board_positions by "nordId|typeId" for O(1) lookup
    const posKey = (nordId: string, typeId: string) => `${nordId}|${typeId}`;
    const boardPosMap = new Map<string, { distance_x: number; distance_y: number }>();
    for (const bp of (graph.board_positions || [])) {
      boardPosMap.set(posKey(bp.nord_id, bp.type_id), { distance_x: bp.distance_x, distance_y: bp.distance_y });
    }

    const lanes: Swimlane[] = [];

    for (const ct of connectionTypes) {
      const conns = graph.connections.filter(c => c.type_id === ct.id);
      if (conns.length === 0 && ct.count === 0) continue;

      const hasSpectrum = ct.xStageLabels.length > 0;
      const labels = hasSpectrum ? ct.xStageLabels : [{ label: 'All', position: 0.5 }];

      // Gather per-nord data: which nords appear in this lane, their connection IDs,
      // and their average connection distance_x (used as seed if no board_position exists)
      const nordInfo = new Map<string, { connIds: string[]; avgDistX: number; count: number }>();

      for (const conn of conns) {
        for (const nordId of [conn.source_nord_id, conn.target_nord_id]) {
          const info = nordInfo.get(nordId) || { connIds: [], avgDistX: 0, count: 0 };
          if (!info.connIds.includes(conn.id)) info.connIds.push(conn.id);
          info.avgDistX += (conn.distance_x ?? 0.5);
          info.count++;
          nordInfo.set(nordId, info);
        }
      }

      // Build one card per nord (deduped)
      const columnMap = new Map<string, SwimCard[]>();
      for (const lbl of labels) columnMap.set(lbl.label, []);

      for (const [nordId, info] of nordInfo) {
        const nord = graph.nords.find(n => n.id === nordId);
        if (!nord) continue;

        const nordType = typeMap.get(nord.type_id);
        const isDimmed = !isNordTypeVisible(ct.id, nord.type_id);

        // Position: board_position wins, then average connection distance_x as seed
        const bp = boardPosMap.get(posKey(nordId, ct.id));
        const distX = bp ? bp.distance_x : (info.avgDistX / info.count);

        const resolved = hasSpectrum
          ? (resolveStageLabel(distX, ct.xStageLabels) || labels[0].label)
          : 'All';

        const card: SwimCard = {
          id: nord.id,
          title: nord.title || 'Untitled',
          typeName: nordType?.name || 'Unknown',
          typeColor: nordType?.accent_color || '#4da6ff',
          typeIcon: resolveIcon(nordType?.icon || null),
          typeId: nord.type_id,
          connectionId: info.connIds[0],   // primary connection (for cross-lane ops)
          connectionTypeId: ct.id,
          resolvedLabel: resolved,
          distance: distX,
          sortOrder: 0,
          direction: 'forward',
          isDimmed,
          properties: (() => {
            const schema = nordType?.properties_schema || [];
            const propsObj = nord.properties || {};
            return schema
              .filter((s: any) => s.card_row === 1 || s.card_row === 2)
              .sort((a: any, b: any) => (a.card_row || 999) - (b.card_row || 999))
              .map((s: any) => ({ key: s.name, value: String((propsObj as any)[s.name] ?? '') }))
              .filter(p => p.value !== '');
          })(),
        };

        const col = columnMap.get(resolved);
        if (col) col.push(card);
      }

      const columns: LaneColumn[] = labels.map(lbl => ({
        label: lbl.label,
        position: lbl.position,
        cards: (columnMap.get(lbl.label) || []).sort((a, b) => a.title.localeCompare(b.title)),
      }));

      const cardCount = columns.reduce((sum, col) => sum + col.cards.length, 0);
      lanes.push({ connectionType: ct, columns, cardCount });
    }

    return lanes;
  }, [graph, connectionTypes, isNordTypeVisible]);

  const handleDragStart = useCallback((e: React.DragEvent, card: SwimCard) => {
    setDragData(e, {
      nordId: card.id,
      nordTitle: card.title,
      sourceConnectionIds: [card.connectionId],
      sourceConnectionTypeId: card.connectionTypeId,
      sourceDirection: card.direction,
    });
    setDraggingCardId(card.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingCardId(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleColumnDrop = useCallback(async (
    e: React.DragEvent,
    targetTypeId: string,
    columnPosition: number,
  ) => {
    e.preventDefault();
    setDraggingCardId(null);

    const data = getDragData(e);
    if (!data || !graph) return;

    const isCrossLane = data.sourceConnectionTypeId !== targetTypeId;
    const isCopy = e.shiftKey || e.altKey;

    // Resolve target column center
    const targetType = connectionTypes.find(t => t.id === targetTypeId);
    const hasSpectrum = targetType && targetType.xStageLabels.length > 0;
    const labels = hasSpectrum ? targetType.xStageLabels : [{ label: 'All', position: 0.5 }];
    const targetLabel = resolveStageLabel(columnPosition, labels) || labels[0].label;
    const bounds = getColumnBounds(targetLabel, labels);

    if (!isCrossLane) {
      // Same lane: update this nord's board_position (independent of connections)
      await upsertPosition({
        nord_id: data.nordId,
        type_id: targetTypeId,
        distance_x: bounds.center,
      });
    } else {
      // Cross-lane drop
      const sourceConn = graph.connections.find(c => c.id === data.sourceConnectionIds[0]);
      const partnerNordId = sourceConn
        ? (sourceConn.source_nord_id === data.nordId ? sourceConn.target_nord_id : sourceConn.source_nord_id)
        : null;

      if (isCopy) {
        // COPY: keep old connection, create new in target lane
        if (partnerNordId) {
          await createConnection({
            type_id: targetTypeId,
            source_nord_id: data.nordId,
            target_nord_id: partnerNordId,
            distance_x: bounds.center,
            distance_y: 0.5,
          });
          // Seed board_position for the new lane
          await upsertPosition({
            nord_id: data.nordId,
            type_id: targetTypeId,
            distance_x: bounds.center,
          });
        }
      } else {
        // MOVE: break old connection, create new in target lane
        if (sourceConn) {
          const savedConn = { ...sourceConn };
          await deleteConnection(sourceConn.id);

          if (partnerNordId) {
            await createConnection({
              type_id: targetTypeId,
              source_nord_id: data.nordId,
              target_nord_id: partnerNordId,
              direction: sourceConn.direction as any,
              distance_x: bounds.center,
              distance_y: 0.5,
            });
          }

          // Seed board_position for the new lane
          await upsertPosition({
            nord_id: data.nordId,
            type_id: targetTypeId,
            distance_x: bounds.center,
          });

          const srcType = connectionTypes.find(t => t.id === savedConn.type_id);
          showUndoToast(
            `Moved "${data.nordTitle}" from ${srcType?.name || '?'} → ${targetType?.name || '?'}`,
            async () => {
              await createConnection({
                type_id: savedConn.type_id,
                source_nord_id: savedConn.source_nord_id,
                target_nord_id: savedConn.target_nord_id,
                direction: savedConn.direction as any,
                distance_x: savedConn.distance_x,
                distance_y: savedConn.distance_y,
              });
              await refetchGraph();
            }
          );
        }
      }
    }

    await refetchGraph();
  }, [graph, connectionTypes, upsertPosition, createConnection, deleteConnection, refetchGraph]);

  // ── Render ──

  if (!graph || swimlanes.length === 0) {
    return (
      <div className="nords-matrix-empty">
        <div className="nords-matrix-empty__icon">⊞</div>
        <h2 className="nords-matrix-empty__title">Board View</h2>
        <p className="nords-matrix-empty__desc">
          Create connections between nords to see them organized by category.
        </p>
      </div>
    );
  }

  return (
    <div className="nords-matrix">
      {/* Undo toast */}
      {undoToast && (
        <div className="nords-matrix__undo-toast">
          <span>{undoToast.message}</span>
          <button onClick={async () => {
            await undoToast.undoFn();
            setUndoToast(null);
          }}>Undo</button>
        </div>
      )}

      <div className="nords-matrix__lanes">
        {swimlanes.map(lane => {
          const ct = lane.connectionType;
          const collapsed = isLaneCollapsed(ct.id);

          return (
            <div key={ct.id} className={`nords-matrix__lane ${collapsed ? 'is-collapsed' : ''}`}>
              {/* Lane Header — always visible */}
              <button
                className="nords-matrix__lane-header"
                onClick={() => toggleLaneCollapse(ct.id)}
              >
                <span className="nords-matrix__lane-chevron">
                  {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </span>
                <span className="nords-matrix__lane-color" style={{ background: ct.color }} />
                <span className="nords-matrix__lane-name">{ct.name}</span>
                {ct.verb && <span className="nords-matrix__lane-verb">{ct.verb}</span>}
                <span className="nords-matrix__lane-count">{lane.cardCount}</span>
              </button>

              {/* Lane Body — columns */}
              {!collapsed && (
                <div className="nords-matrix__lane-body">
                  <div className="nords-matrix__columns">
                    {lane.columns.map(col => (
                        <div key={col.label} className="nords-matrix__column">
                          <div className="nords-matrix__column-header">
                            <span className="nords-matrix__column-label" style={{ color: ct.color }}>
                              {col.label}
                            </span>
                            <span className="nords-matrix__column-count">{col.cards.length}</span>
                          </div>
                          <div
                            className="nords-matrix__column-body"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleColumnDrop(e, ct.id, col.position)}
                          >
                            {col.cards.map(card => (
                              <BoardCard
                                key={`${card.connectionId}-${card.id}`}
                                card={card}
                                isSelected={selectedNord === card.id}
                                isDragging={draggingCardId === card.id}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onClick={onNordClick}
                              />
                            ))}
                            {col.cards.length === 0 && (
                              <div className="nords-matrix__column-empty">—</div>
                            )}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// BoardCard — Memoized card for the swimlane board.
// ═══════════════════════════════════════════════════════════

interface BoardCardProps {
  card: SwimCard;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, card: SwimCard) => void;
  onDragEnd: () => void;
  onClick: (cardId: string) => void;
}

const BoardCard = memo(function BoardCard({
  card, isSelected, isDragging, onDragStart, onDragEnd, onClick,
}: BoardCardProps) {

  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    onDragStart(e, card);

    // Tilted ghost drag image
    const cardEl = e.currentTarget.querySelector('.nords-node') as HTMLElement;
    if (cardEl) {
      const ghost = cardEl.cloneNode(true) as HTMLElement;
      ghost.style.transform = 'rotate(-3deg)';
      ghost.style.width = `${cardEl.offsetWidth}px`;
      ghost.style.position = 'absolute';
      ghost.style.top = '-9999px';
      ghost.style.left = '-9999px';
      ghost.style.opacity = '0.92';
      ghost.style.pointerEvents = 'none';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, cardEl.offsetWidth / 2, 20);
      setTimeout(() => { if (ghost.parentNode) ghost.parentNode.removeChild(ghost); }, 100);
    }
  }, [card, onDragStart]);

  const wrapperClass = [
    'nords-matrix__card-wrapper',
    isDragging ? 'is-dragging' : '',
    card.isDimmed ? 'is-dimmed' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={wrapperClass}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onClick(card.id)}
    >
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
