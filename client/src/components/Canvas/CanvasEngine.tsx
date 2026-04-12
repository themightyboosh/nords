import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  type NodeChange,
  type EdgeChange,
  type Node,
  useReactFlow
} from '@xyflow/react';
import { useLens } from '../../context/LensContext';
import { useCanvasShortcuts } from '../../hooks/useCanvasShortcuts';
import { useProjectGraph } from '../../hooks/useProjectGraph';
import { useNordMutations } from '../../hooks/useNordMutations';
import { graphToNodes, graphToEdges, pixelToNormalized } from '../../utils/graphToReactFlow';
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
  const { batchUpdatePositions, deleteNord } = useNordMutations(projectId);

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

  // Sync when graph data changes (initial load or refetch)
  const { fitView } = useReactFlow();

  React.useEffect(() => {
    if (rfNodes.length > 0) {
      setNodes(rfNodes);
      // Re-trigger fitView after data loads (slight delay for React Flow to process)
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

  // Persist position to database on drag end
  const onNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: Node) => {
      const normalized = pixelToNormalized(node.position.x, node.position.y);
      try {
        await batchUpdatePositions([{ id: node.id, x: normalized.x, y: normalized.y }]);
      } catch (err) {
        console.error('Failed to persist position:', err);
      }
    },
    [batchUpdatePositions]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      setMenuConfig({ x: event.clientX, y: event.clientY, node });
    },
    [setMenuConfig],
  );

  const onPaneContextMenuRadial = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setRadialMenuPos({ x: event.clientX, y: event.clientY });
    },
    [setRadialMenuPos],
  );

  const closeMenu = useCallback(() => setMenuConfig(null), []);
  const closeRadialMenu = useCallback(() => setRadialMenuPos(null), []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteNord(id);
      setNodes(nds => nds.filter(n => n.id !== id));
      setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
      closeMenu();
    } catch (err) {
      console.error('Failed to delete nord:', err);
    }
  }, [deleteNord, setNodes, setEdges, closeMenu]);

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

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={() => { closeMenu(); closeRadialMenu(); }}
        onPaneContextMenu={onPaneContextMenuRadial}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{ type: 'euclidean' }}
        fitView
        panOnScroll
        zoomOnPinch
        minZoom={0.25}
        maxZoom={2.0}
      >
        <Background variant={BackgroundVariant.Dots} gap={32} size={1.5} color="var(--nords-color-text-disabled)" />
      </ReactFlow>

      <GroupToolbar />

      {radialMenuPos && (
        <RadialMenu 
          x={radialMenuPos.x} 
          y={radialMenuPos.y} 
          onClose={closeRadialMenu} 
        />
      )}

      {menuConfig && (
        <NodeContextMenu
          x={menuConfig.x}
          y={menuConfig.y}
          node={menuConfig.node}
          onClose={closeMenu}
          onEdit={(id) => onNordClick(id)}
          onDuplicate={(id) => console.log('Duplicate', id)}
          onDelete={handleDelete}
          onChangeType={(id) => console.log('ChangeType', id)}
          onAddConnection={(id) => console.log('AddConnection', id)}
        />
      )}
    </>
  );
}

// Ensure the props match the same signature as CanvasMock during the transition
interface CanvasEngineProps {
  onNordClick: (id: string) => void;
  selectedNord: string | null;
  projectId?: string;
}

export default function CanvasEngine({ onNordClick, selectedNord, projectId }: CanvasEngineProps) {
  const { lens } = useLens();
  
  // Use provided projectId or fall back to test project
  const activeProjectId = projectId || '5413fc94-3245-4153-9641-b9d025367e1d';

  if (lens === 'matrix') {
    return (
      <div className="nords-canvas nords-matrix-view">
        <div className="nords-matrix">
           {/* Matrix view placeholder until we pull the CSS grid over */}
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
