/**
 * MatrixView.tsx — Column-based layout organizing nords by resolved stage label.
 *
 * DATA MODEL:
 *   The matrix requires an active connection type with stage labels.
 *   Each column corresponds to a stage label (e.g., "Low", "Medium", "High").
 *   Nords are placed into columns based on their resolved distance label
 *   from ANY connection of this type.
 *
 *   Orphaned nords (no connections of the active type) go into an
 *   "Unlinked" column at the end.
 *
 * INTERACTION:
 *   - Click a nord card → opens drawer (same as spatial canvas)
 *   - Connection lines are NOT rendered (this is a structured view)
 *   - Scrollable columns with sticky headers
 */

import React, { useMemo } from 'react';
import { useTypeRegistryContext } from '../../context/TypeRegistryContext';
import { useLens } from '../../context/LensContext';
import { resolveStageLabel } from '../../utils/stageLabels';
import type { ProjectGraph } from '../../hooks/useProjectGraph';
import type { NordEdgeData } from '../../types/canvas';
import { resolveIcon } from '../../utils/iconRegistry';
import './MatrixView.css';

interface MatrixViewProps {
  graph: ProjectGraph | null;
  onNordClick: (id: string) => void;
  selectedNord: string | null;
}

interface MatrixCard {
  id: string;
  title: string;
  typeName: string;
  typeColor: string;
  typeIcon: any;
  resolvedLabel: string;
  distance: number;
  properties: Array<{ key: string; value: string }>;
}

export function MatrixView({ graph, onNordClick, selectedNord }: MatrixViewProps) {
  const { activeConnectionTypeId } = useLens();
  const { connectionTypes, nordTypes } = useTypeRegistryContext();

  // Find the active connection type
  const activeType = useMemo(() => {
    if (!activeConnectionTypeId) return null;
    return connectionTypes.find(ct => ct.id === activeConnectionTypeId) || null;
  }, [activeConnectionTypeId, connectionTypes]);

  // Build columns from stage labels + populate with resolved nords
  const { columns, unlinked } = useMemo(() => {
    if (!graph || !activeType || activeType.xStageLabels.length === 0) {
      return { columns: [], unlinked: [] };
    }

    const labels = activeType.xStageLabels;
    const typeMap = new Map(graph.nord_types.map(t => [t.id, t]));

    // Index connections by source/target for fast lookup
    const connectionsByNord = new Map<string, { distance_x: number }[]>();
    for (const conn of graph.connections) {
      if (conn.type_id !== activeType.id) continue;
      // Source side
      if (!connectionsByNord.has(conn.source_nord_id)) {
        connectionsByNord.set(conn.source_nord_id, []);
      }
      connectionsByNord.get(conn.source_nord_id)!.push({ distance_x: conn.distance_x });
      // Target side
      if (!connectionsByNord.has(conn.target_nord_id)) {
        connectionsByNord.set(conn.target_nord_id, []);
      }
      connectionsByNord.get(conn.target_nord_id)!.push({ distance_x: conn.distance_x });
    }

    // Build column buckets
    const columnMap = new Map<string, MatrixCard[]>();
    for (const lbl of labels) {
      columnMap.set(lbl.label, []);
    }
    const unlinkedCards: MatrixCard[] = [];

    for (const nord of graph.nords) {
      const nordType = typeMap.get(nord.type_id);
      const conns = connectionsByNord.get(nord.id);

      const card: MatrixCard = {
        id: nord.id,
        title: nord.title || 'Untitled',
        typeName: nordType?.name || 'Unknown',
        typeColor: nordType?.accent_color || '#4da6ff',
        typeIcon: resolveIcon(nordType?.icon || null),
        resolvedLabel: '',
        distance: 0.5,
        properties: Object.entries(nord.properties || {}).slice(0, 2).map(([key, value]) => ({
          key,
          value: String(value),
        })),
      };

      if (!conns || conns.length === 0) {
        unlinkedCards.push(card);
        continue;
      }

      // Average distance across all connections of this type
      const avgDistance = conns.reduce((sum, c) => sum + c.distance_x, 0) / conns.length;
      const resolved = resolveStageLabel(avgDistance, labels);
      card.resolvedLabel = resolved || labels[0].label;
      card.distance = avgDistance;

      const col = columnMap.get(card.resolvedLabel);
      if (col) {
        col.push(card);
      } else {
        unlinkedCards.push(card);
      }
    }

    // Sort cards within each column by distance
    const columns = labels.map(lbl => ({
      label: lbl.label,
      position: lbl.position,
      cards: (columnMap.get(lbl.label) || []).sort((a, b) => a.distance - b.distance),
    }));

    return { columns, unlinked: unlinkedCards };
  }, [graph, activeType]);

  // ── No active type state ──
  if (!activeType) {
    return (
      <div className="nords-matrix-empty">
        <div className="nords-matrix-empty__icon">⊞</div>
        <h2 className="nords-matrix-empty__title">Matrix View</h2>
        <p className="nords-matrix-empty__desc">
          Select a connection type from the dock to organize nords into columns by their resolved stage labels.
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
          Add stage labels to "{activeType.name}" in Manage Types → Spectrum Editor to use Matrix View.
        </p>
      </div>
    );
  }

  const totalCards = columns.reduce((sum, col) => sum + col.cards.length, 0) + unlinked.length;

  return (
    <div className="nords-matrix">
      {/* Header bar */}
      <div className="nords-matrix__header">
        <span className="nords-matrix__header-type" style={{ color: activeType.color }}>
          {activeType.name}
        </span>
        <span className="nords-matrix__header-count">{totalCards} nords</span>
      </div>

      {/* Column scroll container */}
      <div className="nords-matrix__columns">
        {columns.map((col, ci) => (
          <div key={col.label} className="nords-matrix__column">
            <div className="nords-matrix__column-header">
              <span
                className="nords-matrix__column-label"
                style={{ color: activeType.color }}
              >
                {col.label}
              </span>
              <span className="nords-matrix__column-count">{col.cards.length}</span>
            </div>
            <div className="nords-matrix__column-body">
              {col.cards.map(card => (
                <button
                  key={card.id}
                  className={`nords-matrix__card ${selectedNord === card.id ? 'is-selected' : ''}`}
                  onClick={() => onNordClick(card.id)}
                >
                  <div className="nords-matrix__card-header">
                    <span
                      className="nords-matrix__card-dot"
                      style={{ backgroundColor: card.typeColor }}
                    />
                    <span className="nords-matrix__card-title">{card.title}</span>
                  </div>
                  {card.properties.length > 0 && (
                    <div className="nords-matrix__card-props">
                      {card.properties.map(p => (
                        <span key={p.key} className="nords-matrix__card-prop">
                          {p.value}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="nords-matrix__card-meta">
                    <span className="nords-matrix__card-type">{card.typeName}</span>
                    <span className="nords-matrix__card-dist">{card.distance.toFixed(2)}</span>
                  </div>
                </button>
              ))}
              {col.cards.length === 0 && (
                <div className="nords-matrix__column-empty">No nords</div>
              )}
            </div>
          </div>
        ))}

        {/* Unlinked column */}
        {unlinked.length > 0 && (
          <div className="nords-matrix__column nords-matrix__column--unlinked">
            <div className="nords-matrix__column-header">
              <span className="nords-matrix__column-label nords-matrix__column-label--muted">
                Unlinked
              </span>
              <span className="nords-matrix__column-count">{unlinked.length}</span>
            </div>
            <div className="nords-matrix__column-body">
              {unlinked.map(card => (
                <button
                  key={card.id}
                  className={`nords-matrix__card nords-matrix__card--unlinked ${selectedNord === card.id ? 'is-selected' : ''}`}
                  onClick={() => onNordClick(card.id)}
                >
                  <div className="nords-matrix__card-header">
                    <span
                      className="nords-matrix__card-dot"
                      style={{ backgroundColor: card.typeColor }}
                    />
                    <span className="nords-matrix__card-title">{card.title}</span>
                  </div>
                  <div className="nords-matrix__card-meta">
                    <span className="nords-matrix__card-type">{card.typeName}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
