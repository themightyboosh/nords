/**
 * GoalCanvas — Interactive DAG canvas for goals (Goals lens).
 *
 * Goals rendered as NordNodes (visual parity with main canvas).
 * Gate nodes (AND/OR circles) sit between columns to indicate join logic.
 * Edges route:  source goals → gate node → target goal.
 * Floating "Step" badges label each DAG column.
 *
 * Clicking a goal node fires onGoalClick → opens the GoalDetailDrawer.
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
  MarkerType,
} from '@xyflow/react';
import { NordNode } from './NordNode';
import { StepBadgeNode } from './StepBadgeNode';
import { GateNode } from './GateNode';
import { resolveIcon } from '../../utils/iconRegistry';
import { useSemanticZoom } from '../../hooks/useSemanticZoom';
import { useSmoothScroll } from '../../hooks/useSmoothScroll';
import ZoomControls from './ZoomControls';
import type { Goal, GoalEdge } from '../../hooks/useGoals';
import type { ProjectVariable } from '../../hooks/useVariables';
import './GoalNode.css';
import './CanvasEngine.css';

const goalNodeTypes = {
  nordNode: NordNode,
  stepBadge: StepBadgeNode,
  gateNode: GateNode,
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

// ── Layout constants ──
const COL_WIDTH = 420;   // spacing between DAG columns (wider for bezier routing room)
const ROW_HEIGHT = 210;  // vertical spacing between nodes in same column
const BADGE_Y_OFFSET = -70; // step badge sits above tallest node in column
const GATE_OFFSET_X = 110;  // gate node horizontal offset from midpoint

/**
 * Sugiyama-style DAG layout for goals.
 */
interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  layers: Map<string, number>;
  layerGroups: Map<number, string[]>;
  maxLayer: number;
  minY: number;
}

function computeGoalLayout(
  goals: Goal[],
  edges: GoalEdge[]
): LayoutResult {
  const positions = new Map<string, { x: number; y: number }>();
  const explicit = goals.filter(g => !g.is_implicit);
  const emptyResult: LayoutResult = { positions, layers: new Map(), layerGroups: new Map(), maxLayer: 0, minY: 0 };

  if (explicit.length === 0) return emptyResult;

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
    if (layer === undefined) continue;
    placed.add(g.id);
    const group = layerGroups.get(layer) || [];
    group.push(g.id);
    layerGroups.set(layer, group);
  }

  // Position nodes
  const maxLayer = Math.max(...Array.from(layerGroups.keys()), 0);
  let globalMinY = 0;
  for (let layer = 0; layer <= maxLayer; layer++) {
    const group = layerGroups.get(layer) || [];
    const totalHeight = (group.length - 1) * ROW_HEIGHT;
    const startY = -totalHeight / 2;
    globalMinY = Math.min(globalMinY, startY);
    for (let i = 0; i < group.length; i++) {
      positions.set(group[i], {
        x: layer * COL_WIDTH,
        y: startY + i * ROW_HEIGHT,
      });
    }
  }

  // Place orphans below the main DAG
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

  return { positions, layers, layerGroups, maxLayer, minY: globalMinY };
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
  const layoutResult = useMemo(() => computeGoalLayout(goals, goalEdges), [goals, goalEdges]);

  // Set semantic zoom tier so NordCard CSS renders correctly
  useSemanticZoom();

  // Smooth scroll interpolation for mouse wheel pan/zoom (matches main canvas)
  const smoothScrollRef = React.useRef<HTMLDivElement | null>(null);
  useSmoothScroll(smoothScrollRef);

  // Build variable name lookup for property bindings
  const varNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const v of variables) m.set(v.id, v.name);
    return m;
  }, [variables]);

  // Build lookup maps
  const goalById = useMemo(() => {
    const m = new Map<string, Goal>();
    for (const g of goals) m.set(g.id, g);
    return m;
  }, [goals]);

  // Group edges by target to identify multi-parent joins (need gate nodes)
  const edgesByTarget = useMemo(() => {
    const m = new Map<string, GoalEdge[]>();
    for (const e of goalEdges) {
      const list = m.get(e.target_goal_id) || [];
      list.push(e);
      m.set(e.target_goal_id, list);
    }
    return m;
  }, [goalEdges]);

  // Targets that need a gate node (>1 incoming edge)
  const gatedTargets = useMemo(() => {
    const s = new Set<string>();
    for (const [targetId, edges] of edgesByTarget) {
      if (edges.length > 1) s.add(targetId);
    }
    return s;
  }, [edgesByTarget]);

  // Build all nodes: step badges + gate nodes + goal nodes
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];

    // ── Step badge nodes — one per column ──
    for (let layer = 0; layer <= layoutResult.maxLayer; layer++) {
      const group = layoutResult.layerGroups.get(layer) || [];
      if (group.length === 0) continue;
      const label = layer === 0 ? 'Start' : `Step ${layer}`;
      nodes.push({
        id: `__step_badge_${layer}`,
        type: 'stepBadge',
        position: {
          x: layer * COL_WIDTH + 80,
          y: layoutResult.minY + BADGE_Y_OFFSET,
        },
        draggable: false,
        selectable: false,
        data: { step: layer + 1, label },
      });
    }

    // ── Gate nodes — circle connectors between columns ──
    for (const targetId of gatedTargets) {
      const targetGoal = goalById.get(targetId);
      if (!targetGoal) continue;
      const targetPos = layoutResult.positions.get(targetId);
      if (!targetPos) continue;
      const targetLayer = layoutResult.layers.get(targetId) ?? 0;

      // Find the maximum source layer to position gate in the gap
      const inEdges = edgesByTarget.get(targetId) || [];
      let maxSourceLayer = 0;
      for (const e of inEdges) {
        const srcLayer = layoutResult.layers.get(e.source_goal_id) ?? 0;
        maxSourceLayer = Math.max(maxSourceLayer, srcLayer);
      }

      // Position gate midway between source and target columns
      const gateX = ((maxSourceLayer + targetLayer) / 2) * COL_WIDTH + GATE_OFFSET_X;
      const gateY = targetPos.y + 45; // vertically align with card center

      const gateType = targetGoal.prerequisite_gate === 'any' ? 'OR' : 'ALL';

      nodes.push({
        id: `__gate_${targetId}`,
        type: 'gateNode',
        position: { x: gateX, y: gateY },
        draggable: false,
        selectable: false,
        data: { gateType },
      });
    }

    // ── Goal nodes (rendered as NordNodes) ──
    for (const g of explicit) {
      const pos = layoutResult.positions.get(g.id) || { x: 0, y: 0 };
      const properties: { key: string; value: string; color?: string }[] = [];

      // Gate/fork badges on card
      if (g.prerequisite_gate === 'any') {
        properties.push({ key: 'Gate', value: 'OR (any prereq)', color: '#818cf8' });
      }
      if (g.fork_type === 'exclusive') {
        properties.push({ key: 'Fork', value: '◇ Exclusive', color: '#f59e0b' });
      }

      // Variable bindings
      const bindings = (g.variable_bindings || []).slice(0, 3);
      for (let i = 0; i < bindings.length; i++) {
        properties.push({ key: `Collects${i > 0 ? ` (${i + 1})` : ''}`, value: varNameMap.get(bindings[i].variable_id) || 'Unknown' });
      }
      if ((g.variable_bindings || []).length > 3) {
        properties.push({ key: '', value: `+${g.variable_bindings.length - 3} more` });
      }

      let typeLabel = 'Goal';
      if (g.end_type === 'reset') typeLabel = 'Goal · Ends (Reset)';
      else if (g.end_type === 'continue') typeLabel = 'Goal · Ends';

      const GoalIcon = resolveIcon(g.icon);

      nodes.push({
        id: g.id,
        type: 'nordNode',
        position: pos,
        draggable: false,
        data: {
          title: g.name || 'Untitled Goal',
          type: typeLabel,
          typeIcon: GoalIcon,
          typeColor: g.accent_color || '#6366f1',
          properties,
          isGhosted: false,
        },
      });
    }

    return nodes;
  }, [explicit, layoutResult, varNameMap, goalById, gatedTargets, edgesByTarget]);

  // ── Build edges: route through gate nodes where applicable ──
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];

    const makeEdge = (
      id: string,
      source: string,
      target: string,
      color: string,
    ): Edge => ({
      id,
      source,
      target,
      type: 'default',
      animated: true,
      style: { stroke: color, strokeWidth: 2, opacity: 0.6 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
    });

    // Track which gate → target edges we've added (only need one per gate)
    const gateOutAdded = new Set<string>();

    for (const ge of goalEdges) {
      const sourceGoal = goalById.get(ge.source_goal_id);
      const targetGoal = goalById.get(ge.target_goal_id);
      const sourceColor = sourceGoal?.accent_color || '#6366f1';
      const targetColor = targetGoal?.accent_color || '#6366f1';

      if (gatedTargets.has(ge.target_goal_id)) {
        // Route through gate: source → gate node
        const gateId = `__gate_${ge.target_goal_id}`;
        edges.push(makeEdge(`${ge.id}_to_gate`, ge.source_goal_id, gateId, sourceColor));

        // gate → target (only add once per gate)
        if (!gateOutAdded.has(ge.target_goal_id)) {
          gateOutAdded.add(ge.target_goal_id);
          edges.push(makeEdge(`${gateId}_out`, gateId, ge.target_goal_id, targetColor));
        }
      } else {
        // Direct edge (single parent → target)
        edges.push(makeEdge(ge.id, ge.source_goal_id, ge.target_goal_id, sourceColor));
      }
    }

    return edges;
  }, [goalEdges, goalById, gatedTargets]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  // Block position dragging — always auto-layout.
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      const filtered = changes.filter(c => c.type !== 'position');
      if (filtered.length > 0) onNodesChange(filtered);
    },
    [onNodesChange]
  );

  // Sync when data changes
  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setRfEdges(initialEdges); }, [initialEdges, setRfEdges]);

  // Update selection highlight without triggering re-layout
  useEffect(() => {
    setNodes(nds =>
      nds.map(n => ({
        ...n,
        selected: n.id === selectedGoalId,
      }))
    );
  }, [selectedGoalId, setNodes]);

  // Fit view INSTANTLY behind loading screen, then reveal
  const [ready, setReady] = React.useState(false);
  const nodeCount = initialNodes.length;
  const edgeCount = initialEdges.length;
  useEffect(() => {
    if (nodeCount === 0) return;
    const timer = setTimeout(() => {
      fitView({ padding: 0.3, duration: 0 });
      requestAnimationFrame(() => setReady(true));
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView, nodeCount, edgeCount]);

  // ── Interactive edge drawing ──
  const handleConnect: OnConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
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

      onEdgeCreate(connection.source, connection.target);
      setRfEdges(eds => addEdge({
        ...connection,
        type: 'default',
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2, opacity: 0.6 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      }, eds));
    }
  }, [onEdgeCreate, setRfEdges, goalEdges]);

  // ── Edge deletion (click edge → backspace/delete) ──
  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        onEdgeDelete(edge.id);
        setRfEdges(eds => eds.filter(e => e.id !== edge.id));
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
    window.addEventListener('keydown', handleKeyDown, { once: true });
    setTimeout(() => window.removeEventListener('keydown', handleKeyDown), 5000);
  }, [onEdgeDelete, setRfEdges]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    // Ignore clicks on non-goal nodes
    if (node.id.startsWith('__')) return;
    onGoalClick(node.id);
  }, [onGoalClick]);

  return (
    <>
      {/* Loading overlay — visible while fitView calculates behind the scenes */}
      {!ready && (
        <div className="nords-canvas-loading" style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
          <div className="nords-canvas-loading__spinner" />
          <span>Loading goals…</span>
        </div>
      )}
      <div
        ref={smoothScrollRef}
        style={{
          width: '100%', height: '100%',
          visibility: ready ? 'visible' : 'hidden',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.2s ease-in',
        }}
      >
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
      panOnScroll
      zoomOnPinch
      zoomOnDoubleClick={false}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="goal-canvas"
      connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2, opacity: 0.5 }}
    >
      <Background variant={BackgroundVariant.Dots} gap={10} size={1} color="rgba(0, 160, 180, 0.35)" />
      <ZoomControls />
    </ReactFlow>
    </div>
    </>
  );
}

/** GoalCanvas wraps in its own ReactFlowProvider to isolate from the main canvas. */
export function GoalCanvas(props: GoalCanvasProps) {
  const [providerKey] = React.useState(() => `goal-rf-${Date.now()}`);
  return (
    <ReactFlowProvider key={providerKey}>
      <GoalCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default GoalCanvas;
