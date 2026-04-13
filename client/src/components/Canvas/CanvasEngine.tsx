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
import { graphToNodes, graphToEdges, nordToNode, pixelToNormalized } from '../../utils/graphToReactFlow';
import { NordNode } from './NordNode';
import { EuclideanEdge } from './EuclideanEdge';
import { NodeContextMenu } from './NodeContextMenu';
import { useNodeSelection } from '../../hooks/useNodeSelection';
import { GroupToolbar } from './GroupToolbar';
import { RadialMenu } from './RadialMenu';
import { useVisibilityCascade } from '../../hooks/useVisibilityCascade';
import { useSemanticZoom } from '../../hooks/useSemanticZoom';
import { useSpatialAnimations } from '../../hooks/useSpatialAnimations';
import { useLensLayout } from '../../hooks/useLensLayout';
import './CanvasEngine.css';

const nodeTypes = {
  nordNode: NordNode,
};

const edgeTypes = {
  euclidean: EuclideanEdge,
};

interface InteractiveCanvasProps {
  projectId: string;
  onNordClick: (id: string) => void;
  onEdgeDoubleClick: (id: string) => void;
  selectedNord: string | null;
  graph: ProjectGraph | null;
  refetchGraph: () => Promise<void>;
}

function InteractiveCanvas({ projectId, onNordClick, onEdgeDoubleClick, selectedNord, graph, refetchGraph }: InteractiveCanvasProps) {
  const { createNord, batchUpdatePositions, deleteNord } = useNordMutations(projectId);
  const { createConnection, updateConnection, deleteConnection } = useConnectionMutations(projectId);
  const { connectionTypes } = useTypeRegistry();
  const { activeConnectionTypeId } = useLens();
  const { addNodes, screenToFlowPosition } = useReactFlow();

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
  const lensEdges = useMemo(() => {
    if (!activeConnectionTypeId) return rfEdges;
    return rfEdges.map(e => {
      const isActive = (e.data as any)?._typeId === activeConnectionTypeId;
      if (isActive) return e;
      // Dim non-active edges — keep them visible and interactive but gray
      return {
        ...e,
        data: { ...e.data, dimmed: true },
        className: 'nords-edge--dimmed',
      };
    });
  }, [rfEdges, activeConnectionTypeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(lensEdges);
  const [menuConfig, setMenuConfig] = React.useState<{ x: number, y: number, node: any } | null>(null);
  const [edgeMenuConfig, setEdgeMenuConfig] = React.useState<{ x: number, y: number, edgeId: string } | null>(null);
  const [radialMenuPos, setRadialMenuPos] = React.useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragNodeId, setDragNodeId] = React.useState<string | null>(null);
  // Track which edge is being reconnected for the onReconnect handler
  const reconnectingRef = React.useRef<{ edgeId: string; handleType: 'source' | 'target' } | null>(null);

  // Touch gesture isolation: on coarse-pointer devices, require two-finger pan
  // so single-finger drag is reserved for moving nodes
  const isTouchDevice = React.useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
    []
  );

  // Sync when graph data changes (initial load or refetch)
  React.useEffect(() => {
    if (rfNodes.length > 0) {
      setNodes(rfNodes);
    }
  }, [rfNodes, setNodes]);

  React.useEffect(() => {
    if (lensEdges.length > 0) setEdges(lensEdges);
  }, [lensEdges, setEdges]);

  useSemanticZoom();
  useVisibilityCascade();
  useSpatialAnimations();
  const { saveNodePosition } = useLensLayout(activeConnectionTypeId, rfNodes);
  const { onNodeClick } = useNodeSelection(onNordClick);

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
        await updateConnection(oldEdge.id, {
          source_nord_id: newConnection.source,
          target_nord_id: newConnection.target,
        });
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
    [updateConnection, setEdges]
  );

  const onReconnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, _edge: Edge) => {
      reconnectingRef.current = null;
    },
    []
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

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setIsDragging(false);
      setDragNodeId(null);
      // Clear drag highlighting
      setEdges(eds => eds.map(e =>
        e.className === 'drag-connected' ? { ...e, className: '' } : e
      ));
      // Save position to the active connection type's cache
      saveNodePosition(node.id, node.position.x, node.position.y, activeConnectionTypeId);
    },
    [setEdges, saveNodePosition, activeConnectionTypeId]
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
    // Use the currently active connection type, or first available as fallback
    const connType = activeConnType || connectionTypes[0];
    if (!connType) {
      console.warn('No connection types available — cannot create connection');
      return;
    }
    try {
      const newConn = await createConnection({
        type_id: connType.id,
        source_nord_id: connection.source,
        target_nord_id: connection.target,
        direction: connType.default_direction || 'forward',
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
          direction: connType.default_direction || 'forward',
          _typeId: connType.id,
          _distanceX: 0.5,
          _distanceY: 0.5,
        },
      };
      setEdges(eds => addEdge(newEdge, eds));
    } catch (err) {
      console.error('Failed to create connection:', err);
    }
  }, [activeConnType, connectionTypes, createConnection, setEdges]);

  // ── Delete Connection ──
  const handleDeleteEdge = useCallback(async (edgeId: string) => {
    try {
      await deleteConnection(edgeId);
      setEdges(eds => eds.filter(e => e.id !== edgeId));
      setEdgeMenuConfig(null);
    } catch (err) {
      console.error('Failed to delete connection:', err);
    }
  }, [deleteConnection, setEdges]);

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
  const canvasClass = isDragging ? 'nords-canvas--dragging' : '';

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
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
        className={`${canvasClass} ${placingTypeId ? 'nords-canvas--placing' : ''}`}
        panOnScroll
        panOnDrag={isTouchDevice ? [1, 2] : true}
        zoomOnPinch
        minZoom={0.4}
        maxZoom={2.0}
        multiSelectionKeyCode={null}
        selectionKeyCode={null}
        selectionOnDrag={false}
        nodesDraggable={true}
        nodesConnectable={true}
        edgesReconnectable
        reconnectRadius={25}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
      >
        {/* Dual-layer background: dots + subtle cross grid for depth */}
        <Background id="dots" variant={BackgroundVariant.Dots} gap={32} size={2.5} color="var(--nords-color-grid-dot)" />
        <Background id="cross" variant={BackgroundVariant.Cross} gap={200} size={0.5} color="var(--nords-color-grid-dot)" style={{ opacity: 0.4 }} />
      </ReactFlow>

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
}

export default function CanvasEngine({ onNordClick, onEdgeDoubleClick, selectedNord, projectId, graph, refetchGraph }: CanvasEngineProps) {
  const { lens } = useLens();
  const activeProjectId = projectId || '5413fc94-3245-4153-9641-b9d025367e1d';
  const noop = async () => {};

  if (lens === 'matrix') {
    return (
      <div className="nords-canvas nords-matrix-view">
        <div className="nords-matrix">
          <div style={{ color: 'white' }}>Matrix View Placeholder</div>
        </div>
      </div>
    );
  }

  return (
    <div className="nords-canvas">
      <InteractiveCanvas projectId={activeProjectId} onNordClick={onNordClick} onEdgeDoubleClick={onEdgeDoubleClick} selectedNord={selectedNord} graph={graph ?? null} refetchGraph={refetchGraph ?? noop} />
    </div>
  );
}

