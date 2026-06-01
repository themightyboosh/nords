/**
 * GoalCanvas — Interactive DAG canvas for goals (Goals lens).
 *
 * Goals = circles. Edges = directed connections (parent → child).
 * Users draw edges by dragging from one circle handle to another.
 * When a goal completes, sibling branches are structurally excluded.
 *
 * Clicking a goal circle fires onGoalClick → opens the GoalDetailDrawer.
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
} from '@xyflow/react';
import { GoalNode, type GoalNodeData } from './GoalNode';
import ZoomControls from './ZoomControls';
import type { Goal, GoalEdge } from '../../hooks/useGoals';
import type { ProjectVariable } from '../../hooks/useVariables';
import './GoalNode.css';

const goalNodeTypes = {
  goalNode: GoalNode,
};

interface GoalCanvasProps {
  goals: Goal[];
  goalEdges: GoalEdge[];
  variables: ProjectVariable[];
  selectedGoalId: string | null;
  onGoalClick: (goalId: string) => void;
  onEdgeCreate: (sourceId: string, targetId: string) => void;
  onEdgeDelete: (edgeId: string) => void;
}

/**
 * Sugiyama-style DAG layout for goals.
 *
 * 1. Topological sort → assign each goal a "layer" (column).
 *    Join nodes (multiple incoming edges) land at max(parent layers) + 1.
 * 2. Within each layer, distribute goals evenly on the Y axis.
 * 3. Center the whole layout so it looks balanced.
 * 4. Orphans (no edges) sit below the main DAG.
 */
function computeGoalLayout(
  goals: Goal[],
  edges: GoalEdge[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const explicit = goals.filter(g => !g.is_implicit);

  if (explicit.length === 0) return positions;

  const COL_WIDTH = 300;
  const ROW_HEIGHT = 160;

  // Build adjacency
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  const explicitIds = new Set(explicit.map(g => g.id));
  for (const e of edges) {
    if (!explicitIds.has(e.source_goal_id) || !explicitIds.has(e.target_goal_id)) continue;
    const cList = childrenOf.get(e.source_goal_id) || [];
    cList.push(e.target_goal_id);
    childrenOf.set(e.source_goal_id, cList);
    const pList = parentsOf.get(e.target_goal_id) || [];
    pList.push(e.source_goal_id);
    parentsOf.set(e.target_goal_id, pList);
  }

  // Layer assignment via topological sort (Kahn's algorithm)
  // Each node's layer = max(parent layers) + 1, roots = layer 0
  const layers = new Map<string, number>();
  const inDegree = new Map<string, number>();
  for (const g of explicit) {
    inDegree.set(g.id, (parentsOf.get(g.id) || []).length);
  }
  const queue: string[] = [];
  for (const g of explicit) {
    if ((inDegree.get(g.id) || 0) === 0) {
      queue.push(g.id);
      layers.set(g.id, 0);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const myLayer = layers.get(id) || 0;
    for (const child of (childrenOf.get(id) || [])) {
      // Join nodes: layer = max of all parent layers + 1
      const prevLayer = layers.get(child) ?? -1;
      layers.set(child, Math.max(prevLayer, myLayer + 1));
      const newDeg = (inDegree.get(child) || 1) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  const placed = new Set<string>();
  for (const g of explicit) {
    const layer = layers.get(g.id);
    if (layer === undefined) continue; // cycle or disconnected — handled below
    placed.add(g.id);
    const group = layerGroups.get(layer) || [];
    group.push(g.id);
    layerGroups.set(layer, group);
  }

  // Position nodes: X = layer * COL_WIDTH, Y = centered within layer
  const maxLayer = Math.max(...Array.from(layerGroups.keys()), 0);
  for (let layer = 0; layer <= maxLayer; layer++) {
    const group = layerGroups.get(layer) || [];
    const totalHeight = (group.length - 1) * ROW_HEIGHT;
    const startY = -totalHeight / 2;
    for (let i = 0; i < group.length; i++) {
      positions.set(group[i], {
        x: layer * COL_WIDTH,
        y: startY + i * ROW_HEIGHT,
      });
    }
  }

  // Place orphans (no edges at all) — row below the main DAG
  const orphans = explicit.filter(g => !placed.has(g.id));
  if (orphans.length > 0) {
    const maxY = Math.max(...Array.from(positions.values()).map(p => p.y), 0);
    const orphanY = maxY + ROW_HEIGHT * 1.5;
    const totalWidth = (orphans.length - 1) * COL_WIDTH;
    const startX = -totalWidth / 2;
    for (let i = 0; i < orphans.length; i++) {
      positions.set(orphans[i].id, { x: startX + i * COL_WIDTH, y: orphanY });
      placed.add(orphans[i].id);
    }
  }

  return positions;
}

function GoalCanvasInner({
  goals,
  goalEdges,
  variables,
  selectedGoalId,
  onGoalClick,
  onEdgeCreate,
  onEdgeDelete,
}: GoalCanvasProps) {

  const explicit = useMemo(() => goals.filter(g => !g.is_implicit), [goals]);
  const layout = useMemo(() => computeGoalLayout(goals, goalEdges), [goals, goalEdges]);

  // Compute which goals are roots (no incoming edges)
  const rootSet = useMemo(() => {
    const hasParent = new Set(goalEdges.map(e => e.target_goal_id));
    return new Set(explicit.filter(g => !hasParent.has(g.id)).map(g => g.id));
  }, [explicit, goalEdges]);

  // Build variable name lookup for property bindings
  const varNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of variables) m.set(v.id, v.name);
    return m;
  }, [variables]);

  // Build nodes
  const initialNodes: Node<GoalNodeData>[] = useMemo(() => {
    return explicit.map(g => {
      const pos = layout.get(g.id) || { x: 0, y: 0 };
      // Resolve variable binding names
      const collectionItems = (g.variable_bindings || []).map(vb => varNameMap.get(vb.variable_id) || 'Unknown').filter(Boolean);
      return {
        id: g.id,
        type: 'goalNode',
        position: pos,
        draggable: false, // Always auto-layout — no manual dragging
        data: {
          goalId: g.id,
          name: g.name,
          icon: g.icon,
          accentColor: g.accent_color || '#6366f1',
          endType: g.end_type,
          prerequisiteGate: g.prerequisite_gate || 'all',
          forkType: g.fork_type || 'parallel',
          isRoot: rootSet.has(g.id),
          isSelected: g.id === selectedGoalId,
          collectionItems,
        },
      };
    });
  }, [explicit, layout, selectedGoalId, rootSet, varNameMap]);

  // Build ReactFlow edges from goal_edges
  const initialEdges: Edge[] = useMemo(() => {
    return goalEdges.map(ge => {
      const sourceGoal = goals.find(g => g.id === ge.source_goal_id);
      return {
        id: ge.id,  // Use the DB edge ID so we can delete it
        source: ge.source_goal_id,
        target: ge.target_goal_id,
        type: 'default',
        animated: true,
        style: {
          stroke: sourceGoal?.accent_color || '#6366f1',
          strokeWidth: 2,
          opacity: 0.6,
        },
        markerEnd: {
          type: 'arrowclosed' as const,
          color: sourceGoal?.accent_color || '#6366f1',
        },
      };
    });
  }, [goalEdges, goals]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  // Block position/dimension changes — always auto-layout
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      const filtered = changes.filter(c => c.type !== 'position' && c.type !== 'dimensions');
      if (filtered.length > 0) onNodesChange(filtered);
    },
    [onNodesChange]
  );

  // Sync when data changes
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setRfEdges(initialEdges); }, [initialEdges, setRfEdges]);

  // Fit view on mount + when edges change (auto-layout recalculates positions)
  useEffect(() => {
    setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
  }, [fitView, goals.length, goalEdges.length]);

  // ── Interactive edge drawing ──
  const handleConnect: OnConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      // Client-side cycle guard: check if target can already reach source
      const wouldCycle = (() => {
        const visited = new Set<string>();
        const queue = [connection.target];
        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          visited.add(current);
          for (const e of goalEdges) {
            if (e.source_goal_id === current) {
              if (e.target_goal_id === connection.source) return true;
              queue.push(e.target_goal_id);
            }
          }
        }
        return false;
      })();

      if (wouldCycle) {
        console.warn('Edge rejected: would create a circular dependency');
        return;
      }

      // Persist to DB
      onEdgeCreate(connection.source, connection.target);
      // Optimistically add to ReactFlow
      setRfEdges(eds => addEdge({
        ...connection,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2, opacity: 0.6 },
        markerEnd: { type: 'arrowclosed' as const, color: '#6366f1' },
      }, eds));
    }
  }, [onEdgeCreate, setRfEdges, goalEdges]);

  // ── Edge deletion (click edge → backspace/delete) ──
  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    // We'll use the edge ID which matches the DB edge ID
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        onEdgeDelete(edge.id);
        setRfEdges(eds => eds.filter(e => e.id !== edge.id));
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { once: true });
    // Auto-remove listener after 5 seconds
    setTimeout(() => window.removeEventListener('keydown', handleKeyDown), 5000);
  }, [onEdgeDelete, setRfEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onGoalClick(node.id);
  }, [onGoalClick]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={rfEdges}
      nodeTypes={goalNodeTypes}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onConnect={handleConnect}
      onEdgeClick={handleEdgeClick}
      nodesDraggable={false}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="goal-canvas"
      connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2, opacity: 0.5 }}
    >
      <Background variant={BackgroundVariant.Dots} gap={10} size={1} color="rgba(0, 160, 180, 0.35)" />
      <ZoomControls />
    </ReactFlow>
  );
}

/** GoalCanvas wraps in its own ReactFlowProvider to isolate from the main canvas. */
export function GoalCanvas(props: GoalCanvasProps) {
  return (
    <ReactFlowProvider>
      <GoalCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default GoalCanvas;
