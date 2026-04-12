import React, { useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ConnectionMode
} from '@xyflow/react';
import { Square, User, FileText, Bug, Target, Lightbulb, Layers, AlertTriangle } from 'lucide-react';
import { useLens } from '../../context/LensContext';
import { useCanvasShortcuts } from '../../hooks/useCanvasShortcuts';
import { NordNode } from './NordNode';
import { EuclideanEdge } from './EuclideanEdge';
import { NodeContextMenu } from './NodeContextMenu';
import { useNodeSelection } from '../../hooks/useNodeSelection';
import { useNodeDrag } from '../../hooks/useNodeDrag';
import { GroupToolbar } from './GroupToolbar';
import { RadialMenu } from './RadialMenu';
import { useCameraFly } from '../../hooks/useCameraFly';
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

// ... initialData remains outside ...

// Initial mapped data from prototype
const initialNodes = [
  { id: 'n1', type: 'nordNode', position: { x: 0, y: 0 }, data: { title: 'Implement Auth Flow', type: 'Epic', typeColor: '#f472b6', typeIcon: Layers, size: 0.5, hasScale: true, properties: [] } },
  { id: 'n2', type: 'nordNode', position: { x: -400, y: 150 }, data: { title: 'User Login Screen', type: 'Task', typeColor: '#4da6ff', typeIcon: Square, size: 0.5, hasScale: true, properties: [] } },
  { id: 'n3', type: 'nordNode', position: { x: -250, y: 350 }, data: { title: 'JWT Token Validation', type: 'Bug', typeColor: '#f87171', typeIcon: Bug, size: 0.5, hasScale: true, properties: [] } },
  { id: 'n4', type: 'nordNode', position: { x: -550, y: 300 }, data: { title: 'Password Reset Demo', type: 'Idea', typeColor: '#fb923c', typeIcon: Lightbulb, size: 0.5, hasScale: true, properties: [] } },
  { id: 'n5', type: 'nordNode', position: { x: 300, y: 100 }, data: { title: 'Database Schema', type: 'Milestone', typeColor: '#a78bfa', typeIcon: Target, size: 0.5, hasScale: true, properties: [] } },
  { id: 'n6', type: 'nordNode', position: { x: 450, y: 300 }, data: { title: 'Physics Engine Spike', type: 'Task', typeColor: '#4da6ff', typeIcon: Square, size: 0.5, hasScale: true, properties: [], commentCount: 2 } },
  { id: 'n7', type: 'nordNode', position: { x: 650, y: 150 }, data: { title: 'Daniel Crowder', type: 'Person', typeColor: '#34d399', typeIcon: User, size: 0.5, hasScale: true, properties: [] } },
  { id: 'n8', type: 'nordNode', position: { x: -700, y: -100 }, data: { title: 'System Architecture Doc', type: 'Artifact', typeColor: '#fbbf24', typeIcon: FileText, size: 0.5, hasScale: true, properties: [] } },
  { id: 'n9', type: 'nordNode', position: { x: -200, y: -200 }, data: { title: 'Login timeout on Safari', type: 'Bug', typeColor: '#f87171', typeIcon: Bug, size: 0.5, hasScale: true, properties: [] } },
  { id: 'n10', type: 'nordNode', position: { x: 800, y: -50 }, data: { title: 'API Rate Limiting', type: 'Risk', typeColor: '#ef4444', typeIcon: AlertTriangle, size: 0.5, hasScale: true, properties: [] } },
];

const initialEdges = [
  { id: 'e1', source: 'n1', target: 'n2', type: 'euclidean', data: { type: 'Blocks', color: '#4da6ff', direction: 'to' } },
  { id: 'e2', source: 'n1', target: 'n5', type: 'euclidean', data: { type: 'Blocks', color: '#4da6ff', direction: 'to' } },
  { id: 'e3', source: 'n2', target: 'n3', type: 'euclidean', data: { type: 'Blocks', color: '#4da6ff', direction: 'to' } },
  { id: 'e4', source: 'n5', target: 'n6', type: 'euclidean', data: { type: 'Blocks', color: '#4da6ff', direction: 'to' } },
  { id: 'e5', source: 'n2', target: 'n4', type: 'euclidean', data: { type: 'Blocks', color: '#4da6ff', direction: 'to', ghost: true } },
  
  { id: 'e6', source: 'n3', target: 'n5', type: 'euclidean', data: { type: 'Depends', color: '#fbbf24', direction: 'from', ghost: true } },
  { id: 'e7', source: 'n6', target: 'n7', type: 'euclidean', data: { type: 'Depends', color: '#fbbf24', direction: 'from', ghost: true } },
  { id: 'e8', source: 'n10', target: 'n5', type: 'euclidean', data: { type: 'Depends', color: '#fbbf24', direction: 'from', ghost: true } },
  
  { id: 'e9', source: 'n1', target: 'n2', type: 'euclidean', data: { type: 'Relates', color: '#a78bfa', direction: 'none' } },
  { id: 'e10', source: 'n2', target: 'n3', type: 'euclidean', data: { type: 'Relates', color: '#a78bfa', direction: 'none', ghost: true } },
  { id: 'e11', source: 'n9', target: 'n1', type: 'euclidean', data: { type: 'Relates', color: '#a78bfa', direction: 'none', ghost: true } },
  { id: 'e12', source: 'n8', target: 'n2', type: 'euclidean', data: { type: 'Relates', color: '#a78bfa', direction: 'none', ghost: true } },
  
  { id: 'e13', source: 'n4', target: 'n2', type: 'euclidean', data: { type: 'Assigned', color: '#34d399', direction: 'to' } },
  { id: 'e14', source: 'n4', target: 'n6', type: 'euclidean', data: { type: 'Assigned', color: '#34d399', direction: 'to', ghost: true } },
];

interface InteractiveCanvasProps {
  onNordClick: (id: string) => void;
  selectedNord: string | null;
}

function InteractiveCanvas({ onNordClick, selectedNord }: InteractiveCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [menuConfig, setMenuConfig] = React.useState<{ x: number, y: number, node: any } | null>(null);
  const [radialMenuPos, setRadialMenuPos] = React.useState<{ x: number, y: number } | null>(null);

  useCanvasShortcuts();
  useSemanticZoom();
  useVisibilityCascade();
  useSpatialAnimations();
  const { onNodeClick } = useNodeSelection(onNordClick);
  const { onNodeDragStop } = useNodeDrag();

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
          onEdit={(id) => console.log('Edit', id)}
          onDuplicate={(id) => console.log('Duplicate', id)}
          onDelete={(id) => console.log('Delete', id)}
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
}

export default function CanvasEngine({ onNordClick, selectedNord }: CanvasEngineProps) {
  const { lens } = useLens();

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
      <InteractiveCanvas onNordClick={onNordClick} selectedNord={selectedNord} />
    </div>
  );
}
