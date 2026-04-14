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
import { resolveIcon } from '../../utils/iconRegistry';
import { NordCard } from '../shared/NordCard';
import { ChevronRight } from 'lucide-react';
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
  properties: Array<{ key: string; value: string; color?: string }>;
  jumpBadges: Array<{ typeId: string; typeName: string; typeColor: string; count: number }>;
}

export function MatrixView({ graph, onNordClick, selectedNord }: MatrixViewProps) {
  const { 
    activeConnectionTypeId, setActiveConnectionTypeId, 
    matrixBreadcrumbs, pushMatrixBreadcrumb, popMatrixBreadcrumb 
  } = useLens();
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

    // Index ALL connections by source/target for fast lookup
    const connectionsByNord = new Map<string, { type_id: string; distance_x: number }[]>();
    for (const conn of graph.connections) {
      if (!connectionsByNord.has(conn.source_nord_id)) {
        connectionsByNord.set(conn.source_nord_id, []);
      }
      connectionsByNord.get(conn.source_nord_id)!.push({ type_id: conn.type_id, distance_x: conn.distance_x });
      
      if (!connectionsByNord.has(conn.target_nord_id)) {
        connectionsByNord.set(conn.target_nord_id, []);
      }
      connectionsByNord.get(conn.target_nord_id)!.push({ type_id: conn.type_id, distance_x: conn.distance_x });
    }

    // Build connection type map for jump badges
    const connTypeMap = new Map(connectionTypes.map(ct => [ct.id, ct]));

    // Build column buckets
    const columnMap = new Map<string, MatrixCard[]>();
    for (const lbl of labels) {
      columnMap.set(lbl.label, []);
    }
    const unlinkedCards: MatrixCard[] = [];

    for (const nord of graph.nords) {
      const nordType = typeMap.get(nord.type_id);
      };

      // Compute jump badges (other connection types this nord has)
      const allConns = connectionsByNord.get(nord.id) || [];
      const activeConns = allConns.filter(c => c.type_id === activeType.id);
      
      const jumpConnCounts = new Map<string, number>();
      for (const c of allConns) {
        if (c.type_id !== activeType.id) {
          jumpConnCounts.set(c.type_id, (jumpConnCounts.get(c.type_id) || 0) + 1);
        }
      }

      card.jumpBadges = Array.from(jumpConnCounts.entries())
        .map(([typeId, count]) => {
          const ct = connTypeMap.get(typeId);
          return ct && ct.xStageLabels.length > 0 // Only jump to valid matrix modes
            ? { typeId, typeName: ct.name, typeColor: ct.color || '#888', count }
            : null;
        })
        .filter(Boolean) as MatrixCard['jumpBadges'];

      if (activeConns.length === 0) {
        unlinkedCards.push(card);
        continue;
      }

      // Average distance across all connections of THIS active type
      const avgDistance = activeConns.reduce((sum, c) => sum + c.distance_x, 0) / activeConns.length;
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

  const handleJump = (e: React.MouseEvent, card: MatrixCard, targetTypeId: string) => {
    e.stopPropagation();
    pushMatrixBreadcrumb({
      connectionTypeId: activeType.id,
      connectionTypeName: activeType.name,
      jumpedFromNordId: card.id,
      jumpedFromNordTitle: card.title,
      jumpedFromLabel: card.resolvedLabel || 'Unlinked',
    });
    setActiveConnectionTypeId(targetTypeId);
  };

  const renderCard = (card: MatrixCard, isUnlinked = false) => (
    <div key={card.id} className="nords-matrix__card-wrapper" onClick={() => onNordClick(card.id)}>
      <NordCard
        title={card.title}
        typeName={card.typeName}
        typeColor={card.typeColor}
        typeIcon={card.typeIcon}
        properties={card.properties}
        isSelected={selectedNord === card.id}
        maxProperties={2}
        className="nords-matrix__nord-card"
        footer={
          <div className="nords-matrix__card-footer-content">
            {!isUnlinked && (
              <div className="nords-matrix__card-dist">
                Distance: {card.distance.toFixed(2)}
              </div>
            )}
            {card.jumpBadges.length > 0 && (
              <div className="nords-matrix__jump-badges">
                {card.jumpBadges.map(badge => (
                  <button
                    key={badge.typeId}
                    className="nords-matrix__jump-badge"
                    onClick={(e) => handleJump(e, card, badge.typeId)}
                    style={{ borderColor: badge.typeColor, color: badge.typeColor }}
                  >
                    <span className="nords-matrix__jump-badge-dot" style={{ backgroundColor: badge.typeColor }} />
                    <span className="nords-matrix__jump-badge-label">{badge.typeName} ({badge.count})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />
    </div>
  );

  return (
    <div className="nords-matrix">
      {/* Header bar / Breadcrumbs */}
      <div className="nords-matrix__header">
        {matrixBreadcrumbs.length > 0 ? (
          <div className="nords-matrix__breadcrumbs">
            {matrixBreadcrumbs.map((crumb, idx) => (
              <React.Fragment key={`${crumb.connectionTypeId}-${idx}`}>
                <button 
                  className="nords-matrix__breadcrumb-btn"
                  onClick={() => popMatrixBreadcrumb(idx)}
                >
                  <span className="nords-matrix__breadcrumb-type">{crumb.connectionTypeName}</span>
                  <span className="nords-matrix__breadcrumb-node">› {crumb.jumpedFromNordTitle}</span>
                  <span className="nords-matrix__breadcrumb-label">({crumb.jumpedFromLabel})</span>
                </button>
                <ChevronRight size={14} className="nords-matrix__breadcrumb-sep" />
              </React.Fragment>
            ))}
            <span className="nords-matrix__breadcrumb-current" style={{ color: activeType.color }}>
              {activeType.name}
            </span>
          </div>
        ) : (
          <div className="nords-matrix__header-title">
            <span className="nords-matrix__header-type" style={{ color: activeType.color }}>
              {activeType.name}
            </span>
            <span className="nords-matrix__header-count">{totalCards} nords</span>
          </div>
        )}
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
              {col.cards.map(card => renderCard(card))}
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
              {unlinked.map(card => renderCard(card, true))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
