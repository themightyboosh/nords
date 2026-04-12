import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type Node,
  useReactFlow,
} from '@xyflow/react';
import { useLens } from '../../context/LensContext';
import { useCanvasShortcuts } from '../../hooks/useCanvasShortcuts';
import { useProjectGraph } from '../../hooks/useProjectGraph';
import { useNordMutations } from '../../hooks/useNordMutations';
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
  selectedNord: string | null;
}

function InteractiveCanvas({ projectId, onNordClick, selectedNord }: InteractiveCanvasProps) {
  const { graph, loading, error, refetch } = useProjectGraph(projectId);
  const { createNord, batchUpdatePositions, deleteNord } = useNordMutations(projectId);
  const { addNodes, screenToFlowPosition } = useReactFlow();

  // Transform API data → React Flow format
  const rfNodes = useMemo(() => {
    if (!graph) return [];
    return graphToNodes(graph.nords, graph.nord_types);
  }, [graph]);

  const rfEdges = useMemo(() => {
    if (!graph) return [];
    return graphToEdges(graph.connections, graph.connection_types);
  }, [graph]);

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges);
  const [menuConfig, setMenuConfig] = React.useState<{ x: number, y: number, node: any } | null>(null);
  const [radialMenuPos, setRadialMenuPos] = React.useState<{ x: number, y: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragNodeId, setDragNodeId] = React.useState<string | null>(null);

  // Sync when graph data changes (initial load or refetch)
  const { fitView } = useReactFlow();

  React.useEffect(() => {
    if (rfNodes.length > 0) {
      setNodes(rfNodes);
      setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 100);
    }
  }, [rfNodes, setNodes, fitView]);

  React.useEffect(() => {
    if (rfEdges.length > 0) setEdges(rfEdges);
  }, [rfEdges, setEdges]);

  useCanvasShortcuts();
  useSemanticZoom();
  useVisibilityCascade();
  useSpatialAnimations();
  const { onNodeClick } = useNodeSelection(onNordClick);

  // ── Create Nord (used by Add flyout & RadialMenu) ──
  const handleCreateNord = useCallback(async (
    typeId: string,
    canvasPosition?: { x: number; y: number }
  ) => {
    if (!graph) return;
    
    // Default to center of screen if no position given
    const pos = canvasPosition || screenToFlowPosition({ 
      x: window.innerWidth / 2, 
      y: window.innerHeight / 2 
    });
    const normalized = pixelToNormalized(pos.x, pos.y);
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
  }, [graph, createNord, addNodes, setNodes, screenToFlowPosition]);

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

  // ── Persist position on drag end ──
  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setIsDragging(true);
      setDragNodeId(node.id);
    },
    []
  );

  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      setIsDragging(false);
      setDragNodeId(null);
      const normalized = pixelToNormalized(node.position.x, node.position.y);
      try {
        await batchUpdatePositions([{ id: node.id, x: normalized.x, y: normalized.y }]);
      } catch (err) {
        console.error('Failed to persist position:', err);
      }
    },
    [batchUpdatePositions]
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

  // ── Context Menus ──
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      setMenuConfig({ x: event.clientX, y: event.clientY, node });
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
  const closeRadialMenu = useCallback(() => setRadialMenuPos(null), []);

  // Loading state
  if (loading && nodes.length === 0) {
    return (
      <div className="nords-canvas-loading">
        <div className="nords-canvas-loading__spinner" />
        <span>Loading graph…</span>
      </div>
    );
  }

  // Error state
  if (error && nodes.length === 0) {
    return (
      <div className="nords-canvas-error">
        <span>Failed to load graph: {error}</span>
        <button onClick={refetch}>Retry</button>
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
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={() => { closeMenu(); closeRadialMenu(); }}
        onPaneContextMenu={onPaneContextMenuRadial}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: 'euclidean' }}
        className={canvasClass}
        fitView
        panOnScroll
        zoomOnPinch
        minZoom={0.25}
        maxZoom={2.0}
        data-dragging-node={dragNodeId}
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={1.5} color="var(--nords-color-text-disabled)" />
      </ReactFlow>

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
    </>
  );
}

// ── Public API ──

interface CanvasEngineProps {
  onNordClick: (id: string) => void;
  selectedNord: string | null;
  projectId?: string;
}

export default function CanvasEngine({ onNordClick, selectedNord, projectId }: CanvasEngineProps) {
  const { lens } = useLens();
  const activeProjectId = projectId || '5413fc94-3245-4153-9641-b9d025367e1d';

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
      <InteractiveCanvas projectId={activeProjectId} onNordClick={onNordClick} selectedNord={selectedNord} />
    </div>
  );
}

