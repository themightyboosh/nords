/**
 * useDrawerEntity — Reactive state bridge between the canvas and the Detail Drawer.
 *
 * Problem: The previous DetailDrawer used `getNode()` / `getEdge()` which return
 * point-in-time snapshots. If the user drags a node while the drawer is open,
 * the drawer shows stale data.
 *
 * Solution: Subscribe to React Flow's internal store via `useStore()` with a
 * selector. This triggers re-renders whenever the selected entity's data changes.
 *
 * Mutations use optimistic updates:
 *   1. Immediately update React Flow state (setNodes/setEdges)
 *   2. Fire-and-forget API call to persist
 *   3. On API error, revert to previous value
 */

import { useCallback, useRef } from 'react';
import { useStore, useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { api } from '../api/client';

// ── Return types ──

interface NordEntity {
  kind: 'nord';
  id: string;
  title: string;
  type: string;
  typeColor: string;
  typeIcon: any;
  typeId: string;
  properties: Array<{ key: string; value: string }>;
  position: { x: number; y: number };
  node: Node;
}

interface ConnectionEntity {
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
  edge: Edge;
}

interface DrawerMutations {
  updateTitle: (title: string) => void;
  updateProperty: (key: string, value: string) => void;
  updateConnectionProperty: (key: string, value: string) => void;
  updateDirection: (direction: 'forward' | 'reverse' | 'both' | 'neither') => void;
  updateDistance: (axis: 'x' | 'y', value: number) => void;
}

type DrawerEntity = (NordEntity | ConnectionEntity | null) & { mutations: DrawerMutations };

export function useDrawerEntity(
  entityId: string | null,
  entityType: 'nord' | 'connection'
): { entity: NordEntity | ConnectionEntity | null; mutations: DrawerMutations } {
  const { setNodes, setEdges } = useReactFlow();
  const prevRef = useRef<{ nodes?: Node[]; edges?: Edge[] }>({});

  // ── Reactive subscription: re-renders when the entity changes ──
  const node = useStore(
    (s) => entityType === 'nord' && entityId ? s.nodeLookup.get(entityId) : undefined,
    (a, b) => a === b
  );

  const edge = useStore(
    (s) => entityType === 'connection' && entityId ? s.edges.find(e => e.id === entityId) : undefined,
    (a, b) => a?.id === b?.id && a?.data === b?.data
  );

  // For connection mode, also read the source/target node names reactively
  const sourceNode = useStore(
    (s) => edge?.source ? s.nodeLookup.get(edge.source) : undefined,
    (a, b) => (a?.data?.title) === (b?.data?.title)
  );
  const targetNode = useStore(
    (s) => edge?.target ? s.nodeLookup.get(edge.target) : undefined,
    (a, b) => (a?.data?.title) === (b?.data?.title)
  );

  // ── Build the entity object ──
  let entity: NordEntity | ConnectionEntity | null = null;

  if (entityType === 'nord' && node) {
    entity = {
      kind: 'nord',
      id: node.id,
      title: (node.data?.title as string) || 'Untitled',
      type: (node.data?.type as string) || 'Unknown',
      typeColor: (node.data?.typeColor as string) || '#4da6ff',
      typeIcon: node.data?.typeIcon,
      typeId: (node.data?._typeId as string) || '',
      // Use _allProperties (all values) for the drawer, not the card-face slice
      properties: (node.data?._allProperties as any[]) || (node.data?.properties as any[]) || [],
      position: node.position,
      node,
    };
  } else if (entityType === 'connection' && edge) {
    const data = edge.data || {};
    entity = {
      kind: 'connection',
      id: edge.id,
      type: (data as any)?.type || 'Connection',
      verb: (data as any)?._verb || null,
      prepositions: (data as any)?._prepositions ?? { forward: 'from', reverse: 'to', both: 'together' },
      typeColor: (data as any)?.color || '#888',
      typeId: (data as any)?._typeId || '',
      direction: (data as any)?.direction || 'none',
      distanceX: (data as any)?._distanceX ?? 0.5,
      distanceY: (data as any)?._distanceY ?? 0.5,
      xStageLabels: (data as any)?._xStageLabels || [],
      sourceId: edge.source,
      targetId: edge.target,
      sourceName: (sourceNode?.data?.title as string) || 'Source',
      targetName: (targetNode?.data?.title as string) || 'Target',
      properties: (data as any)?._properties || [],
      edge,
    };
  }

  // ── Mutations (optimistic update → fire-and-forget persist) ──

  const updateTitle = useCallback((title: string) => {
    if (!entityId || entityType !== 'nord') return;
    setNodes(nds => nds.map(n =>
      n.id === entityId ? { ...n, data: { ...n.data, title } } : n
    ));
    api.put(`/api/nords/${entityId}`, { title }).catch(err => {
      console.error('Failed to persist title:', err);
    });
  }, [entityId, entityType, setNodes]);

  const updateProperty = useCallback((key: string, value: string) => {
    if (!entityId || entityType !== 'nord') return;
    setNodes(nds => nds.map(n => {
      if (n.id !== entityId) return n;
      // Patch _allProperties (used by the drawer)
      const allProps = ((n.data?._allProperties as any[]) || []);
      const exists = allProps.some((p: any) => p.key === key);
      const newAllProps = exists
        ? allProps.map((p: any) => p.key === key ? { ...p, value } : p)
        : [...allProps, { key, value }];
      // Also patch card-face properties if the key appears there
      const cardProps = ((n.data?.properties as any[]) || []).map((p: any) =>
        p.key === key ? { ...p, value } : p
      );
      return { ...n, data: { ...n.data, _allProperties: newAllProps, properties: cardProps } };
    }));
    api.put(`/api/nords/${entityId}`, {
      properties: { [key]: value },
    }).catch(err => {
      console.error('Failed to persist property:', err);
    });
  }, [entityId, entityType, setNodes]);

  const updateDirection = useCallback((direction: 'forward' | 'reverse' | 'both' | 'neither') => {
    if (!entityId || entityType !== 'connection') return;
    // Map DB direction to visual direction for the edge renderer
    const visualDirection = direction === 'forward' ? 'to'
      : direction === 'reverse' ? 'from'
      : direction === 'both' ? 'both'
      : 'none';
    setEdges(eds => eds.map(e =>
      e.id === entityId ? { ...e, data: { ...e.data, direction: visualDirection } } : e
    ));
    api.put(`/api/connections/${entityId}`, { direction }).catch(err => {
      console.error('Failed to persist direction:', err);
    });
  }, [entityId, entityType, setEdges]);

  const updateDistance = useCallback((axis: 'x' | 'y', value: number) => {
    if (!entityId || entityType !== 'connection') return;
    const dataKey = axis === 'x' ? '_distanceX' : '_distanceY';
    const apiKey = axis === 'x' ? 'distance_x' : 'distance_y';
    setEdges(eds => eds.map(e =>
      e.id === entityId ? { ...e, data: { ...e.data, [dataKey]: value } } : e
    ));
    api.put(`/api/connections/${entityId}`, { [apiKey]: value }).catch(err => {
      console.error('Failed to persist distance:', err);
    });
  }, [entityId, entityType, setEdges]);

  const updateConnectionProperty = useCallback((key: string, value: string) => {
    if (!entityId || entityType !== 'connection') return;
    setEdges(eds => eds.map(e => {
      if (e.id !== entityId) return e;
      const props = (((e.data as any)?._properties as any[]) || []).map((p: any) =>
        p.key === key ? { ...p, value } : p
      );
      // If prop doesn't exist yet, add it
      const exists = props.some((p: any) => p.key === key);
      const finalProps = exists ? props : [...props, { key, value }];
      return { ...e, data: { ...e.data, _properties: finalProps } };
    }));
    api.put(`/api/connections/${entityId}`, {
      properties: { [key]: value },
    }).catch(err => {
      console.error('Failed to persist connection property:', err);
    });
  }, [entityId, entityType, setEdges]);

  return {
    entity,
    mutations: { updateTitle, updateProperty, updateConnectionProperty, updateDirection, updateDistance },
  };
}
