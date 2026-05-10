/**
 * useDrawerEntity — Reactive state bridge between the canvas and the Detail Drawer.
 *
 * ARCHITECTURE: View-agnostic — works in both Graph View and Board View.
 *
 * Data reads come from the raw `graph` prop (ProjectGraph), NOT from React Flow's
 * internal store. This ensures the drawer works identically regardless of which
 * view is active.
 *
 * Mutations use a dual-path strategy:
 *   - API call to persist (always)
 *   - If React Flow is available (graph view), also optimistic-update via setNodes/setEdges
 *   - After API call, trigger refetchGraph() so board view also sees changes
 */

import { useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { api } from '../api/client';
import type {
  ProjectGraph,
  Nord,
  Connection,
  ConnectionType,
  NordType,
} from './useProjectGraph';

// ── Return types ──

export interface NordEntity {
  kind: 'nord';
  id: string;
  title: string;
  type: string;
  typeColor: string;
  typeIcon: string | null;
  typeId: string;
  properties: Array<{ key: string; value: string }>;
  description: string | null;
  position: { x: number; y: number };
}

export interface ConnectionEntity {
  kind: 'connection';
  id: string;
  type: string;
  verb: string | null;
  prepositions: { forward: string; reverse: string; both: string };
  typeColor: string;
  typeId: string;
  direction: string;
  distanceX: number;
  distanceY: number;
  xStageLabels: Array<{ label: string; position: number }>;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  properties: Array<{ key: string; value: string }>;
}

export interface DrawerMutations {
  updateTitle: (title: string) => void;
  updateProperty: (key: string, value: string) => void;
  updateConnectionProperty: (key: string, value: string) => void;
  updateDirection: (direction: 'forward' | 'reverse' | 'both' | 'neither') => void;
  updateDistance: (axis: 'x' | 'y', value: number) => void;
}

/**
 * Try to get the React Flow API. Returns null if ReactFlowProvider isn't active
 * (e.g. in board view where ReactFlow isn't mounted, the store is empty).
 */
function useOptionalReactFlow() {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useReactFlow();
  } catch {
    return null;
  }
}

export function useDrawerEntity(
  entityId: string | null,
  entityType: 'nord' | 'connection',
  graph: ProjectGraph | null,
  refetchGraph?: () => Promise<void>,
): { entity: NordEntity | ConnectionEntity | null; mutations: DrawerMutations } {
  const reactFlow = useOptionalReactFlow();

  // ── Build entity from raw graph data ──
  const entity = useMemo<NordEntity | ConnectionEntity | null>(() => {
    if (!entityId || !graph) return null;

    if (entityType === 'nord') {
      const nord = graph.nords.find((n) => n.id === entityId);
      if (!nord) return null;
      const nordType = graph.nord_types.find((t) => t.id === nord.type_id);

      // Convert properties object to key/value array
      const props: Array<{ key: string; value: string }> = [];
      if (nord.properties && typeof nord.properties === 'object') {
        for (const [key, value] of Object.entries(nord.properties)) {
          props.push({ key, value: String(value ?? '') });
        }
      }

      return {
        kind: 'nord',
        id: nord.id,
        title: nord.title || 'Untitled',
        type: nordType?.name || 'Unknown',
        typeColor: nordType?.accent_color || '#4da6ff',
        typeIcon: nordType?.icon || null,
        typeId: nord.type_id,
        properties: props,
        description: nord.description,
        position: { x: nord.position_x, y: nord.position_y },
      };
    }

    if (entityType === 'connection') {
      const conn = graph.connections.find((c) => c.id === entityId);
      if (!conn) return null;
      const connType = graph.connection_types.find((t) => t.id === conn.type_id);
      const sourceNord = graph.nords.find((n) => n.id === conn.source_nord_id);
      const targetNord = graph.nords.find((n) => n.id === conn.target_nord_id);

      // Map DB direction to visual direction
      const visualDirection =
        conn.direction === 'forward' ? 'to' :
        conn.direction === 'reverse' ? 'from' :
        conn.direction === 'both' ? 'both' :
        'none';

      // Convert properties object to key/value array
      const props: Array<{ key: string; value: string }> = [];
      if (conn.properties && typeof conn.properties === 'object') {
        for (const [key, value] of Object.entries(conn.properties)) {
          props.push({ key, value: String(value ?? '') });
        }
      }

      return {
        kind: 'connection',
        id: conn.id,
        type: connType?.name || 'Connection',
        verb: connType?.verb || null,
        prepositions: connType?.direction_prepositions ?? {
          forward: 'from',
          reverse: 'to',
          both: 'together',
        },
        typeColor: connType?.accent_color || '#888',
        typeId: conn.type_id,
        direction: visualDirection,
        distanceX: conn.distance_x ?? 0.5,
        distanceY: conn.distance_y ?? 0.5,
        xStageLabels: connType?.x_stage_labels || [],
        sourceId: conn.source_nord_id,
        targetId: conn.target_nord_id,
        sourceName: sourceNord?.title || 'Source',
        targetName: targetNord?.title || 'Target',
        properties: props,
      };
    }

    return null;
  }, [entityId, entityType, graph]);

  // ── Mutations: API + optional optimistic React Flow update + refetch ──

  const updateTitle = useCallback((title: string) => {
    if (!entityId || entityType !== 'nord') return;

    // Optimistic update in React Flow (graph view only)
    if (reactFlow) {
      reactFlow.setNodes((nds) =>
        nds.map((n) => (n.id === entityId ? { ...n, data: { ...n.data, title } } : n))
      );
    }

    api.put(`/api/nords/${entityId}`, { title })
      .then(() => refetchGraph?.())
      .catch((err) => {
        console.error('Failed to persist title:', err);
        refetchGraph?.(); // revert on error
      });
  }, [entityId, entityType, reactFlow, refetchGraph]);

  const updateProperty = useCallback((key: string, value: string) => {
    if (!entityId || entityType !== 'nord') return;

    // Optimistic update in React Flow (graph view only)
    if (reactFlow) {
      reactFlow.setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== entityId) return n;
          const allProps = ((n.data?._allProperties as any[]) || []);
          const allExists = allProps.some((p: any) => p.key === key);
          const newAllProps = allExists
            ? allProps.map((p: any) => (p.key === key ? { ...p, value } : p))
            : [...allProps, { key, value }];
          const cardProps = ((n.data?.properties as any[]) || []);
          const cardExists = cardProps.some((p: any) => p.key === key);
          const newCardProps = cardExists
            ? cardProps.map((p: any) => (p.key === key ? { ...p, value } : p))
            : value ? [...cardProps, { key, value }] : cardProps;
          return { ...n, data: { ...n.data, _allProperties: newAllProps, properties: newCardProps } };
        })
      );
    }

    api.put(`/api/nords/${entityId}`, { properties: { [key]: value } })
      .then(() => refetchGraph?.())
      .catch((err) => {
        console.error('Failed to persist property:', err);
        refetchGraph?.();
      });
  }, [entityId, entityType, reactFlow, refetchGraph]);

  const updateDirection = useCallback((direction: 'forward' | 'reverse' | 'both' | 'neither') => {
    if (!entityId || entityType !== 'connection') return;

    const visualDirection =
      direction === 'forward' ? 'to' :
      direction === 'reverse' ? 'from' :
      direction === 'both' ? 'both' :
      'none';

    // Optimistic update in React Flow (graph view only)
    if (reactFlow) {
      reactFlow.setEdges((eds) =>
        eds.map((e) =>
          e.id === entityId ? { ...e, data: { ...e.data, direction: visualDirection } } : e
        )
      );
    }

    api.put(`/api/connections/${entityId}`, { direction })
      .then(() => refetchGraph?.())
      .catch((err) => {
        console.error('Failed to persist direction:', err);
        refetchGraph?.();
      });
  }, [entityId, entityType, reactFlow, refetchGraph]);

  const updateDistance = useCallback((axis: 'x' | 'y', value: number) => {
    if (!entityId || entityType !== 'connection') return;

    const dataKey = axis === 'x' ? '_distanceX' : '_distanceY';
    const apiKey = axis === 'x' ? 'distance_x' : 'distance_y';

    if (reactFlow) {
      reactFlow.setEdges((eds) =>
        eds.map((e) =>
          e.id === entityId ? { ...e, data: { ...e.data, [dataKey]: value } } : e
        )
      );
    }

    api.put(`/api/connections/${entityId}`, { [apiKey]: value })
      .then(() => refetchGraph?.())
      .catch((err) => {
        console.error('Failed to persist distance:', err);
        refetchGraph?.();
      });
  }, [entityId, entityType, reactFlow, refetchGraph]);

  const updateConnectionProperty = useCallback((key: string, value: string) => {
    if (!entityId || entityType !== 'connection') return;

    if (reactFlow) {
      reactFlow.setEdges((eds) =>
        eds.map((e) => {
          if (e.id !== entityId) return e;
          const props = (((e.data as any)?._properties as any[]) || []).map((p: any) =>
            p.key === key ? { ...p, value } : p
          );
          const exists = props.some((p: any) => p.key === key);
          const finalProps = exists ? props : [...props, { key, value }];
          return { ...e, data: { ...e.data, _properties: finalProps } };
        })
      );
    }

    api.put(`/api/connections/${entityId}`, { properties: { [key]: value } })
      .then(() => refetchGraph?.())
      .catch((err) => {
        console.error('Failed to persist connection property:', err);
        refetchGraph?.();
      });
  }, [entityId, entityType, reactFlow, refetchGraph]);

  return {
    entity,
    mutations: { updateTitle, updateProperty, updateConnectionProperty, updateDirection, updateDistance },
  };
}
