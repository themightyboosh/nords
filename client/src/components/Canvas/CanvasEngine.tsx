import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  addEdge,
  reconnectEdge,
  type Node,
  type Edge,
  type Connection,
  useReactFlow,
} from '@xyflow/react';
import { useLens } from '../../context/LensContext';
import { useTypeRegistry } from '../../hooks/useTypeRegistry';
import { useCanvasShortcuts } from '../../hooks/useCanvasShortcuts';
import type { ProjectGraph } from '../../hooks/useProjectGraph';
import { useNordMutations } from '../../hooks/useNordMutations';
import { useConnectionMutations } from '../../hooks/useNordMutations';
import { graphToNodes, graphToEdges, nordToNode, pixelToNormalized, computeNormalizedDistance } from '../../utils/graphToReactFlow';
import { NordNode } from './NordNode';
import { EuclideanEdge } from './EuclideanEdge';
import { NodeContextMenu } from './NodeContextMenu';
import { useNodeSelection } from '../../hooks/useNodeSelection';
import { GroupToolbar } from './GroupToolbar';
import { RadialMenu } from './RadialMenu';
import { MatrixView } from '../Matrix/MatrixView';
import { useVisibilityCascade } from '../../hooks/useVisibilityCascade';
import { useSemanticZoom } from '../../hooks/useSemanticZoom';
import { useSpatialAnimations } from '../../hooks/useSpatialAnimations';
import { useLensLayout } from '../../hooks/useLensLayout';
import ZoomControls from './ZoomControls';
import { computePersonaScores, computeRadialPositions, computeNeutralScore } from '../../utils/computePersonaScores';
import type { RadialLayoutResult } from '../../utils/computePersonaScores';
import { PersonaCenterNode } from './PersonaCenterNode';
import { PersonaZoneNode } from './PersonaZoneNode';
import { GoalCanvas } from './GoalCanvas';
import './CanvasEngine.css';

const nodeTypes = {
  nordNode: NordNode,
  personaCenterNode: PersonaCenterNode,
  personaZoneNode: PersonaZoneNode,
};

const edgeTypes = {
  euclidean: EuclideanEdge,
};

interface ActivePersonaInfo {
  id: string;
  name: string;
  avatar_seed: string;
  accent_color: string;
}

interface InteractiveCanvasProps {
  projectId: string;
  onNordClick: (id: string) => void;
  onEdgeDoubleClick: (id: string) => void;
  selectedNord: string | null;
  graph: ProjectGraph | null;
  refetchGraph: () => Promise<void>;
  personaWeights?: Map<string, number> | null;
  activePersona?: ActivePersonaInfo | null;
}

function InteractiveCanvas({ projectId, onNordClick, onEdgeDoubleClick, selectedNord, graph, refetchGraph, personaWeights, activePersona }: InteractiveCanvasProps) {
  const { createNord, batchUpdatePositions, deleteNord } = useNordMutations(projectId);
  const { createConnection, updateConnection, deleteConnection } = useConnectionMutations(projectId);
  const { connectionTypes } = useTypeRegistry();
  const { activeConnectionTypeId, lens, personaTypeFilter } = useLens();
  const isPersonaMode = lens === 'persona';
  const { addNodes, screenToFlowPosition, getNodes, fitView } = useReactFlow();

  // ── Click-to-place mode ──
  // When set, a ghost node follows the cursor until clicked to place
  const [placingTypeId, setPlacingTypeId] = React.useState<string | null>(null);
  const placingRef = React.useRef<string | null>(null);
  placingRef.current = placingTypeId;

  // Find the active connection type for label resolution
  const activeConnType = useMemo(() => {
    if (!activeConnectionTypeId || !graph) return null;
    return graph.connection_types.find(t => t.id === activeConnectionTypeId) || null;
  }, [activeConnectionTypeId, graph]);

  // Transform API data → React Flow format
  const rfNodes = useMemo(() => {
    if (!graph) return [];
    return graphToNodes(graph.nords, graph.nord_types);
  }, [graph]);

  const rfEdges = useMemo(() => {
    if (!graph) return [];
    return graphToEdges(graph.connections, graph.connection_types);
  }, [graph]);

  // Apply lens dimming: non-active type edges become ghosted
  // Persona mode: hide all edges — the heatmap focuses on node relevance
  const lensEdges = useMemo(() => {
    if (isPersonaMode) return [];
    if (!activeConnectionTypeId) return rfEdges;
    return rfEdges.map(e => {
      const isActive = (e.data as any)?._typeId === activeConnectionTypeId;
      if (isActive) {
        return { ...e, zIndex: 10 };
      }
      // Dim non-active edges — keep them visible and interactive but gray
      return {
        ...e,
        data: { ...e.data, dimmed: true },
        className: 'nords-edge--dimmed',
        zIndex: 0,
      };
    });
  }, [rfEdges, activeConnectionTypeId, isPersonaMode]);

  // ── Node draggability + ghosting by lens ──
  // When a connection type is active:
  //   - Nords connected by that type → draggable, normal color
  //   - Nords NOT connected → locked, uniform gray (ghosted)
  // This makes it clear which nords participate in the active relationship.
  // Drawing a new connection to a gray nord instantly promotes it.

  // Persona lens: compute per-node relevance scores + radial positions
  const personaScores = useMemo(() => {
    if (!isPersonaMode || !personaWeights || !graph) return null;
    const totalCategories = graph.connection_types.filter(ct => !ct.is_system).length;
    return computePersonaScores(graph.connections, personaWeights, totalCategories);
  }, [isPersonaMode, personaWeights, graph]);

  // Compute where raw-sum=0 falls in the normalized score range
  const neutralScore = useMemo(() => {
    if (!isPersonaMode || !personaWeights || !graph) return 0;
    return computeNeutralScore(graph.connections, personaWeights);
  }, [isPersonaMode, personaWeights, graph]);

  // Compute radial target positions + zone radii
  const personaLayout = useMemo((): RadialLayoutResult | null => {
    if (!personaScores || !graph) return null;
    const center = { x: 0, y: 0 };
    return computeRadialPositions(personaScores, neutralScore, center);
  }, [personaScores, neutralScore, graph]);

  const personaRadialPositions = personaLayout?.positions ?? null;

  const lensNodes = useMemo(() => {
    // ── Persona mode: radial layout with native card colors ──
    if (isPersonaMode && personaScores) {
      // Only include nodes with persona scores (orphans with no connections are excluded)
      const radialNodes: typeof rfNodes = [];
      for (const n of rfNodes) {
        const ps = personaScores.get(n.id);
        if (!ps) continue; // skip orphan nodes with no connections

        // Apply 3-state type visibility filter
        const nodeTypeName = (n.data as any)?.type as string | undefined;
        const typeState = nodeTypeName ? (personaTypeFilter.get(nodeTypeName) || 'show') : 'show';
        if (typeState === 'hide') continue; // completely hidden

        const radialPos = personaRadialPositions?.get(n.id);
        radialNodes.push({
          ...n,
          position: radialPos || n.position,
          draggable: false,
          data: {
            ...n.data,
            isGhosted: typeState === 'dim',
          },
        });
      }

      // Add red + green zone circles
      if (personaLayout) {
        const { maxRadius, neutralRadius } = personaLayout;

        // Red zone — outermost boundary
        radialNodes.push({
          id: '__persona_zone_red__',
          type: 'personaZoneNode',
          position: { x: -maxRadius, y: -maxRadius },
          draggable: false,
          selectable: false,
          data: { radius: maxRadius, color: 'hsla(0, 45%, 22%, 0.18)' },
          zIndex: -2,
        } as any);

        // Green zone — where raw-sum=0 falls
        if (neutralRadius > 0) {
          radialNodes.push({
            id: '__persona_zone_green__',
            type: 'personaZoneNode',
            position: { x: -neutralRadius, y: -neutralRadius },
            draggable: false,
            selectable: false,
            data: { radius: neutralRadius, color: 'hsla(140, 45%, 22%, 0.18)', showBorder: true },
            zIndex: -1,
          } as any);
        }
      }

      // Add center avatar node
      if (activePersona) {
        radialNodes.push({
          id: '__persona_center__',
          type: 'personaCenterNode',
          position: { x: -120, y: -120 }, // offset to center the 240px node
          draggable: false,
          selectable: false,
          data: {
            avatarSeed: activePersona.avatar_seed,
            accentColor: activePersona.accent_color,
            name: activePersona.name,
          },
          zIndex: 1000,
        } as any);
      }

      return radialNodes;
    }

    if (activeConnectionTypeId) {
      // Build set of nord IDs that participate in the active connection type
      const connectedIds = new Set<string>();
      for (const e of rfEdges) {
        if ((e.data as any)?._typeId === activeConnectionTypeId) {
          connectedIds.add(e.source);
          connectedIds.add(e.target);
        }
      }
      return rfNodes.map(n => {
        const isConnected = connectedIds.has(n.id);
        return {
          ...n,
          draggable: isConnected,
          zIndex: isConnected ? 20 : 0, // connected nords render above edges
          data: {
            ...n.data,
            isGhosted: !isConnected,
          },
        };
      });
    }
    // "All Lines" view: lock connected nodes, free orphans
    const connectedIds = new Set<string>();
    for (const e of rfEdges) {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    }
    return rfNodes.map(n => ({
      ...n,
      draggable: !connectedIds.has(n.id), // only orphans are draggable
    }));
  }, [rfNodes, rfEdges, activeConnectionTypeId, isPersonaMode, personaScores, personaRadialPositions, personaLayout, activePersona, personaTypeFilter]);

  const [nodes, setNodes, onNodesChange] = useNodesState(lensNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(lensEdges);
  const [menuConfig, setMenuConfig] = React.useState<{ x: number, y: number, node: any } | null>(null);
  const [edgeMenuConfig, setEdgeMenuConfig] = React.useState<{ x: number, y: number, edgeId: string } | null>(null);
  const [radialMenuPos, setRadialMenuPos] = React.useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragNodeId, setDragNodeId] = React.useState<string | null>(null);
  // Track camera movement (pan/zoom) to pause CSS animations during interaction
  const [isCameraMoving, setIsCameraMoving] = React.useState(false);
  const cameraIdleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isConnecting, setIsConnecting] = React.useState(false);
  // Track which edge is being reconnected for the onReconnect handler
  const reconnectingRef = React.useRef<{ edgeId: string; handleType: 'source' | 'target' } | null>(null);

  // Touch gesture isolation: on coarse-pointer devices, require two-finger pan
  // so single-finger drag is reserved for moving nodes
  const isTouchDevice = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    []
  );

  // Sync when graph data changes (initial load or refetch)
  // IMPORTANT: Preserve in-memory positions for existing nodes so they
  // don't jump back to stale DB positions after a refetch.
  // Only brand-new nodes (not yet in React Flow) get their DB positions.
  React.useEffect(() => {
    setNodes(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n]));
      return lensNodes.map(n => {
        const existing = prevMap.get(n.id);
        if (existing) {
          // In persona mode, USE the computed radial position from lensNodes.
          // In other modes, keep the in-memory position to avoid jumps after refetch.
          return {
            ...n,
            position: isPersonaMode ? n.position : existing.position,
          };
        }
        // New node — use lensNodes position (DB or radial-computed)
        return n;
      });
    });
  }, [lensNodes, setNodes, isPersonaMode]);

  // ── Auto-focus on connected nords when switching categories ──
  // When the user selects a category, zoom to show only the participating nords
  // so they're not left staring at all-dimmed off-screen nodes.
  const prevCategoryRef = React.useRef<string | null | undefined>(undefined);
  React.useEffect(() => {
    if (isPersonaMode) return;
    if (prevCategoryRef.current === undefined) {
      prevCategoryRef.current = activeConnectionTypeId;
      return;
    }
    if (prevCategoryRef.current === activeConnectionTypeId) return;
    prevCategoryRef.current = activeConnectionTypeId;

    // Delay to let useLensLayout animation finish (350ms) + React reconcile
    const timer = setTimeout(() => {
      const connectedNodeIds = new Set<string>();
      if (activeConnectionTypeId) {
        for (const e of rfEdges) {
          if ((e.data as any)?._typeId === activeConnectionTypeId) {
            connectedNodeIds.add(e.source);
            connectedNodeIds.add(e.target);
          }
        }
      }

      if (connectedNodeIds.size > 0) {
        fitView({
          nodes: Array.from(connectedNodeIds).map(id => ({ id })),
          padding: 0.25,
          duration: 400,
        });
      } else {
        // No connections for this type — show all nodes
        fitView({ padding: 0.15, duration: 400 });
      }
    }, 420);

    return () => clearTimeout(timer);
  }, [activeConnectionTypeId, rfEdges, fitView, isPersonaMode]);

  // Fit viewport after persona layout positions are applied
  const prevPersonaModeRef = React.useRef(isPersonaMode);
  React.useEffect(() => {
    if (isPersonaMode || prevPersonaModeRef.current !== isPersonaMode) {
      // Delay to let React reconcile new positions + zone circles
      const timer = setTimeout(() => {
        fitView({ padding: 0.08, duration: 500 });
      }, 80);
      prevPersonaModeRef.current = isPersonaMode;
      return () => clearTimeout(timer);
    }
    prevPersonaModeRef.current = isPersonaMode;
  }, [isPersonaMode, personaLayout, fitView]);

  React.useEffect(() => {
    setEdges(lensEdges);
  }, [lensEdges, setEdges]);

  useSemanticZoom();
  useVisibilityCascade();
  useSpatialAnimations();
  const { saveNodePosition } = useLensLayout(activeConnectionTypeId, rfNodes, personaWeights);
  const { onNodeClick } = useNodeSelection(onNordClick);

  // ── Focused node: the node whose connected edges get full rendering ──
  // Priority: dragged node > selected node
  const focusedNodeId = dragNodeId || selectedNord;

  // Stamp _highlighted on edges connected to the focused node
  React.useEffect(() => {
    setEdges(eds => eds.map(e => {
      const shouldHighlight = focusedNodeId != null &&
        (e.source === focusedNodeId || e.target === focusedNodeId);
      const isHighlighted = (e.data as NordEdgeData)?._highlighted === true;
      if (shouldHighlight === isHighlighted) return e; // no change
      return {
        ...e,
        data: { ...e.data, _highlighted: shouldHighlight },
      };
    }));
  }, [focusedNodeId, setEdges]);

  // ── Create Nord (from Add panel or radial menu) ──
  // In "placing" mode: don't create immediately, enter click-to-place
  const handleCreateNord = useCallback(async (typeId: string, canvasPosition?: { x: number; y: number }) => {
    if (!graph) return;

    // If no position given, enter click-to-place mode
    if (!canvasPosition) {
      setPlacingTypeId(typeId);
      return;
    }

    const normalized = pixelToNormalized(canvasPosition.x, canvasPosition.y);
    const typeName = graph.nord_types.find(t => t.id === typeId)?.name || 'Nord';

    try {
      const newNord = await createNord({
        type_id: typeId,
        title: `New ${typeName}`,
        position_x: normalized.x,
        position_y: normalized.y,
        scale: 0.5,
      });
      
      // Convert to React Flow node and add with spawn animation class
      const rfNode = nordToNode(newNord, graph.nord_types);
      rfNode.className = 'is-entering';
      addNodes(rfNode);
      
      // Remove the animation class after it plays
      setTimeout(() => {
        setNodes(nds => nds.map(n => 
          n.id === rfNode.id ? { ...n, className: '' } : n
        ));
      }, 500);
    } catch (err) {
      console.error('Failed to create nord:', err);
    }
  }, [graph, createNord, addNodes, setNodes]);

  // ── Escape key cancels placing mode ──
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && placingTypeId) {
        setPlacingTypeId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [placingTypeId]);

  // ── Edge Reconnection ──
  // When user drags an edge endpoint, record which end is being moved
  const onReconnectStart = useCallback(
    (_event: React.MouseEvent, _edge: Edge, _handleType: 'source' | 'target') => {
      reconnectingRef.current = { edgeId: _edge.id, handleType: _handleType };
    },
    []
  );

  // When the dragged endpoint is dropped on a new node, persist the relink
  const onReconnect = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      if (!newConnection.source || !newConnection.target) return;
      // Optimistic: update local state immediately
      setEdges(eds => reconnectEdge(oldEdge, newConnection, eds));
      try {
        // Recalculate distance from new positions
        const allNodes = getNodes();
        const srcNode = allNodes.find(n => n.id === newConnection.source);
        const tgtNode = allNodes.find(n => n.id === newConnection.target);
        const newDist = srcNode && tgtNode
          ? computeNormalizedDistance(srcNode.position, tgtNode.position)
          : 0.5;

        await updateConnection(oldEdge.id, {
          source_nord_id: newConnection.source,
          target_nord_id: newConnection.target,
          distance_x: newDist,
        });
        // Update local edge data with new distance
        setEdges(eds => eds.map(e =>
          e.id === oldEdge.id ? { ...e, data: { ...e.data, _distanceX: newDist } } : e
        ));
      } catch (err) {
        console.error('Failed to reconnect edge:', err);
        // Revert on failure
        setEdges(eds => reconnectEdge(
          { ...oldEdge, source: newConnection.source!, target: newConnection.target! },
          { source: oldEdge.source, target: oldEdge.target, sourceHandle: null, targetHandle: null },
          eds
        ));
      }
      reconnectingRef.current = null;
    },
    [updateConnection, setEdges, getNodes]
  );

  const onReconnectEnd = useCallback(
    async (_event: MouseEvent | TouchEvent, edge: Edge, _handleType: 'source' | 'target') => {
      // If the drop target is the pane (not a node), delete the connection
      const target = (_event as MouseEvent).target as HTMLElement;
      const isPane = target?.classList?.contains('react-flow__pane');
      if (isPane) {
        try {
          await deleteConnection(edge.id);
          setEdges(eds => eds.filter(e => e.id !== edge.id));
        } catch (err) {
          console.error('Failed to delete connection on drop:', err);
        }
      }
      reconnectingRef.current = null;
    },
    [deleteConnection, setEdges]
  );

  // ── Duplicate Nord ──
  const handleDuplicate = useCallback(async (id: string) => {
    if (!graph) return;
    const sourceNode = nodes.find(n => n.id === id);
    if (!sourceNode) return;

    const offsetPos = {
      x: sourceNode.position.x + 40,
      y: sourceNode.position.y + 40,
    };
    const normalized = pixelToNormalized(offsetPos.x, offsetPos.y);
    const sourceData = sourceNode.data as any;

    try {
      const newNord = await createNord({
        type_id: sourceData._typeId,
        title: `Copy of ${sourceData.title}`,
        position_x: normalized.x,
        position_y: normalized.y,
        scale: sourceData._rawScale ?? 0.5,
        properties: sourceData.properties 
          ? Object.fromEntries(sourceData.properties.map((p: any) => [p.key, p.value]))
          : {},
      });

      const rfNode = nordToNode(newNord, graph.nord_types);
      rfNode.className = 'is-entering';
      addNodes(rfNode);
      
      setTimeout(() => {
        setNodes(nds => nds.map(n => 
          n.id === rfNode.id ? { ...n, className: '' } : n
        ));
      }, 500);
    } catch (err) {
      console.error('Failed to duplicate nord:', err);
    }
  }, [graph, nodes, createNord, addNodes, setNodes]);

  // ── Position caching on drag ──
  // Positions are cached per connection type in useLensLayout.
  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setIsDragging(true);
      setDragNodeId(node.id);
      // Highlight connected edges during drag
      setEdges(eds => eds.map(e =>
        e.source === node.id || e.target === node.id
          ? { ...e, className: 'drag-connected' }
          : e
      ));
    },
    [setEdges]
  );

  // ── Live distance updates during drag ──
  // Recalculate _distanceX every frame so labels update in real time
  const onNodeDrag = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      setEdges(eds => eds.map(e => {
        if (e.source !== node.id && e.target !== node.id) return e;
        const srcNode = e.source === node.id ? node : nodeMap.get(e.source);
        const tgtNode = e.target === node.id ? node : nodeMap.get(e.target);
        if (!srcNode || !tgtNode) return e;
        const newDist = computeNormalizedDistance(srcNode.position, tgtNode.position);
        if (Math.abs(((e.data as NordEdgeData)?._distanceX ?? 0) - newDist) < 0.005) return e;
        return { ...e, data: { ...e.data, _distanceX: newDist } };
      }));
    },
    [nodes, setEdges]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setIsDragging(false);
      setDragNodeId(null);
      // Save position to the active connection type's cache
      saveNodePosition(node.id, node.position.x, node.position.y, activeConnectionTypeId);

      // Recalculate distance_x for all connected edges — batched into ONE setEdges call
      const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
      const nodeMap = new Map(nodes.map(n => [n.id, n]));
      const distanceUpdates = new Map<string, number>();

      for (const edge of connectedEdges) {
        const srcNode = edge.source === node.id ? node : nodeMap.get(edge.source);
        const tgtNode = edge.target === node.id ? node : nodeMap.get(edge.target);
        if (!srcNode || !tgtNode) continue;
        const newDist = computeNormalizedDistance(srcNode.position, tgtNode.position);
        distanceUpdates.set(edge.id, newDist);
        // Persist to DB (fire-and-forget)
        updateConnection(edge.id, { distance_x: newDist }).catch(err =>
          console.error('Failed to persist distance:', err)
        );
      }

      // Single batched state update: clear drag class + update distances
      setEdges(eds => eds.map(e => {
        const newDist = distanceUpdates.get(e.id);
        const cleared = e.className === 'drag-connected' ? { ...e, className: '' } : e;
        if (newDist !== undefined) {
          return { ...cleared, data: { ...cleared.data, _distanceX: newDist } };
        }
        return cleared;
      }));
    },
    [setEdges, saveNodePosition, activeConnectionTypeId, edges, nodes, updateConnection]
  );

  // ── Delete Nord ──
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteNord(id);
      setNodes(nds => nds.filter(n => n.id !== id));
      setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      closeMenu();
    } catch (err) {
      console.error('Failed to delete nord:', err);
    }
  }, [deleteNord, setNodes, setEdges]);

  // ── Keyboard shortcuts (needs handlers above) ──
  const handleDeleteBatch = useCallback(async (ids: string[]) => {
    for (const id of ids) { await handleDelete(id); }
  }, [handleDelete]);

  useCanvasShortcuts({
    onDelete: handleDeleteBatch,
    onDuplicate: handleDuplicate,
  });

  // ── Connect handler: persist new connections to DB ──
  const onConnect = useCallback(async (connection: Connection) => {
    if (!connection.source || !connection.target) return;
    if (connection.source === connection.target) return; // no self-loops
    // Use the currently active connection type, or first available as fallback
    const connType = activeConnType || connectionTypes[0];
    if (!connType) {
      console.warn('No connection types available — cannot create connection');
      return;
    }
    // Prevent duplicate: same type between the same two nords (either direction)
    const isDuplicate = edges.some(e => {
      const typeId = (e.data as any)?._typeId;
      if (typeId !== connType.id) return false;
      return (
        (e.source === connection.source && e.target === connection.target) ||
        (e.source === connection.target && e.target === connection.source)
      );
    });
    if (isDuplicate) {
      // Wiggle the existing duplicate edge
      const dupeEdge = edges.find(e => {
        const typeId = (e.data as any)?._typeId;
        if (typeId !== connType.id) return false;
        return (
          (e.source === connection.source && e.target === connection.target) ||
          (e.source === connection.target && e.target === connection.source)
        );
      });
      if (dupeEdge) {
        setEdges(eds => eds.map(e =>
          e.id === dupeEdge.id ? { ...e, className: 'nords-edge--wiggle' } : e
        ));
        setTimeout(() => {
          setEdges(eds => eds.map(e =>
            e.id === dupeEdge.id ? { ...e, className: '' } : e
          ));
        }, 450);
      }
      return;
    }
    try {
      const newConn = await createConnection({
        type_id: connType.id,
        source_nord_id: connection.source,
        target_nord_id: connection.target,
        direction: 'forward',
        distance_x: 0.5,
        distance_y: 0.5,
      });
      // Build edge with same data shape as graphToEdges
      const newEdge: Edge = {
        id: newConn.id,
        source: newConn.source_nord_id,
        target: newConn.target_nord_id,
        type: 'euclidean',
        reconnectable: true,
        data: {
          type: connType.name,
          color: connType.accent_color || '#888',
          direction: 'to',
          _typeId: connType.id,
          _distanceX: 0.5,
          _distanceY: 0.5,
        },
      };
      setEdges(eds => addEdge(newEdge, eds));
      // Promote both nords: unghost, make draggable, raise above edges
      const promoteIds = new Set([connection.source, connection.target]);
      setNodes(nds => nds.map(n =>
        promoteIds.has(n.id)
          ? { ...n, draggable: true, zIndex: 20, data: { ...n.data, isGhosted: false } }
          : n
      ));
      // Refetch full graph so drawer/categories see the new connection
      refetchGraph();
    } catch (err) {
      console.error('Failed to create connection:', err);
    }
  }, [activeConnType, connectionTypes, createConnection, setEdges, setNodes, edges, refetchGraph]);

  // ── Delete Connection ──
  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    try {
      await deleteConnection(edgeId);
      setEdges(eds => eds.filter(e => e.id !== edgeId));
      setEdgeMenuConfig(null);
      // Refetch full graph so drawer/categories see the deletion
      refetchGraph();
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
  }, [deleteConnection, setEdges, refetchGraph]);

  // ── Context Menus ──
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      setMenuConfig({ x: event.clientX, y: event.clientY, node });
    },
    [],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setEdgeMenuConfig({ x: event.clientX, y: event.clientY, edgeId: edge.id });
    },
    [],
  );

  const onPaneContextMenuRadial = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setRadialMenuPos({ x: event.clientX, y: event.clientY });
    },
    [],
  );

  const closeMenu = useCallback(() => setMenuConfig(null), []);
  const closeEdgeMenu = useCallback(() => setEdgeMenuConfig(null), []);
  const closeRadialMenu = useCallback(() => setRadialMenuPos(null), []);

  // Camera move handlers — detect pan/zoom to pause animations
  // Must be declared before early return to satisfy React hooks rules
  const onMoveStart = React.useCallback(() => {
    if (cameraIdleTimer.current) clearTimeout(cameraIdleTimer.current);
    setIsCameraMoving(true);
  }, []);

  const onMoveEnd = React.useCallback(() => {
    // Debounce: wait 150ms of no camera movement before resuming animations
    if (cameraIdleTimer.current) clearTimeout(cameraIdleTimer.current);
    cameraIdleTimer.current = setTimeout(() => setIsCameraMoving(false), 150);
  }, []);

  // Loading state
  if (!graph && nodes.length === 0) {
    return (
      <div className="nords-canvas-loading">
        <div className="nords-canvas-loading__spinner" />
        <span>Loading graph…</span>
      </div>
    );
  }

  // Compute CSS class for active-path isolation during drag
  const canvasClass = [
    isDragging ? 'nords-canvas--dragging' : '',
    isConnecting ? 'nords-canvas--connecting' : '',
    placingTypeId ? 'nords-canvas--placing' : '',
  ].filter(Boolean).join(' ');

  // Idle-only animation: pause dash-march CSS when interacting
  const isInteracting = isDragging || isCameraMoving;


  return (
    <>
      {/* ── Cable Jiggle Filter (Reason-style) ──
       * SVG turbulence + displacement creates organic cable sway.
       * Defined at document level so filter ID is reliably resolvable.
       * Applied to edge paths via CSS: .react-flow__edge g { filter: url(#nords-cable-jiggle) }
       * To disable: comment out the CSS rule in CanvasEngine.css
       */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="nords-cable-jiggle" x="-5%" y="-5%" width="110%" height="110%">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.03"
              numOctaves="3"
              seed="0"
              result="noise"
            >
              <animate
                attributeName="seed"
                values="0;1;2;3;4;5;6;7;8;9;10;11;12;13;14;15"
                dur="2s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="4.5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div data-interacting={isInteracting ? '' : undefined} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={() => setIsConnecting(true)}
        onConnectEnd={() => setIsConnecting(false)}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveStart={onMoveStart}
        onMoveEnd={onMoveEnd}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeClick={(_event, edge) => onEdgeDoubleClick(edge.id)}
        onEdgeDoubleClick={(_event, edge) => onEdgeDoubleClick(edge.id)}
        onPaneClick={(event) => {
          // Click-to-place: if placing mode is active, create the nord at click position
          if (placingRef.current) {
            const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
            handleCreateNord(placingRef.current, pos);
            setPlacingTypeId(null);
            return;
          }
          closeMenu(); closeEdgeMenu(); closeRadialMenu();
        }}
        onPaneContextMenu={(event) => {
          // Cancel placing mode on right-click
          if (placingRef.current) {
            event.preventDefault();
            setPlacingTypeId(null);
            return;
          }
          onPaneContextMenuRadial(event);
        }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: 'euclidean' }}
        className={canvasClass}
        onlyRenderVisibleElements
        panOnScroll
        panOnDrag={isTouchDevice ? [1, 2] : true}
        zoomOnPinch
        zoomOnDoubleClick={false}
        minZoom={0.4}
        maxZoom={2.0}
        multiSelectionKeyCode={null}
        selectionKeyCode={null}
        selectionOnDrag={false}
        nodesDraggable={!isPersonaMode}
        nodesConnectable={!isPersonaMode && !!activeConnectionTypeId}
        edgesReconnectable={!isPersonaMode && !!activeConnectionTypeId}
        connectionRadius={80}
        reconnectRadius={80}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
      >
        {/* Dual-layer background: dots + subtle cross grid for depth */}
        <Background id="dots" variant={BackgroundVariant.Dots} gap={32} size={2.5} color="var(--nords-color-grid-dot)" />
        <Background id="cross" variant={BackgroundVariant.Cross} gap={200} size={0.5} color="var(--nords-color-grid-dot)" style={{ opacity: 0.4 }} />
      </ReactFlow>
      </div>

      {/* Click-to-place indicator */}
      {placingTypeId && (
        <div className="nords-placing-indicator">
          <span>Click to place · ESC to cancel</span>
        </div>
      )}

      <GroupToolbar />

      {radialMenuPos && (
        <RadialMenu 
          x={radialMenuPos.x} 
          y={radialMenuPos.y} 
          onClose={closeRadialMenu}
          onCreateNord={handleCreateNord}
        />
      )}

      {menuConfig && (
        <NodeContextMenu
          x={menuConfig.x}
          y={menuConfig.y}
          node={menuConfig.node}
          onClose={closeMenu}
          onEdit={(id) => onNordClick(id)}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onChangeType={(id) => console.log('ChangeType', id)}
          onAddConnection={(id) => console.log('AddConnection', id)}
        />
      )}

      {/* Edge context menu (right-click on connection line) */}
      {edgeMenuConfig && (
        <div 
          className="nords-context-menu nords-glass" 
          style={{ left: edgeMenuConfig.x, top: edgeMenuConfig.y }}
          data-testid="edge-context-menu"
        >
          <button 
            className="nords-context-menu__item" 
            style={{ color: 'var(--nords-color-danger)' }}
            onClick={() => handleDeleteEdge(edgeMenuConfig.edgeId)}
          >
            Delete Connection
          </button>
        </div>
      )}

      {/* Zoom controls — graph mode only (inside ReactFlow context) */}
      <ZoomControls />
    </>
  );
}

// ── Public API ──

interface CanvasEngineProps {
  onNordClick: (id: string) => void;
  onEdgeDoubleClick: (id: string) => void;
  selectedNord: string | null;
  projectId?: string;
  graph?: ProjectGraph | null;
  refetchGraph?: () => Promise<void>;
  personaWeights?: Map<string, number> | null;
  activePersona?: ActivePersonaInfo | null;
  /** Goals lens */
  goals?: import('../../hooks/useGoals').Goal[];
  goalEdges?: import('../../hooks/useGoals').GoalEdge[];
  selectedGoalId?: string | null;
  onGoalClick?: (id: string) => void;
  onGoalEdgeCreate?: (sourceId: string, targetId: string) => void;
  onGoalEdgeDelete?: (edgeId: string) => void;
}

export default function CanvasEngine({ onNordClick, onEdgeDoubleClick, selectedNord, projectId, graph, refetchGraph, personaWeights, activePersona, goals, goalEdges, selectedGoalId, onGoalClick, onGoalEdgeCreate, onGoalEdgeDelete }: CanvasEngineProps) {
  const { lens } = useLens();
  const noop = async () => {};

  if (lens === 'board') {
    return (
      <div className="nords-canvas nords-matrix-view">
        <MatrixView
          graph={graph ?? null}
          onNordClick={onNordClick}
          selectedNord={selectedNord}
          projectId={projectId || ''}
          refetchGraph={refetchGraph ?? noop}
        />
      </div>
    );
  }

  if (lens === 'goals') {
    return (
      <div className="nords-canvas nords-canvas--goals">
        <GoalCanvas
          goals={goals || []}
          goalEdges={goalEdges || []}
          selectedGoalId={selectedGoalId || null}
          onGoalClick={onGoalClick || (() => {})}
          onEdgeCreate={onGoalEdgeCreate || (() => {})}
          onEdgeDelete={onGoalEdgeDelete || (() => {})}
        />
      </div>
    );
  }

  return (
    <div className={`nords-canvas ${lens === 'persona' ? 'nords-canvas--persona' : ''}`}>
      <InteractiveCanvas projectId={projectId || ''} onNordClick={onNordClick} onEdgeDoubleClick={onEdgeDoubleClick} selectedNord={selectedNord} graph={graph ?? null} refetchGraph={refetchGraph ?? noop} personaWeights={personaWeights} activePersona={activePersona} />
    </div>
  );
}

