import React from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Edit2, Move, Link as LinkIcon, Trash2 } from 'lucide-react';
import './CanvasEngine.css';

export function GroupToolbar() {
  const selectedNodes = useStore((s) => s.nodes.filter((n) => n.selected));
  const { setNodes, setEdges } = useReactFlow();

  if (selectedNodes.length < 2) return null;

  const handleDeleteAll = () => {
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    setNodes((nds) => nds.filter((n) => !selectedIds.has(n.id)));
    setEdges((eds) => eds.filter(
      (e) => !selectedIds.has(e.source) && !selectedIds.has(e.target)
    ));
  };

  return (
    <div className="nords-group-toolbar nords-glass" data-testid="group-toolbar">
      <span className="nords-group-toolbar__label" data-testid="group-toolbar-count">
        {selectedNodes.length} Selected
      </span>
      
      <button className="nords-zoom-controls__btn" title="Bulk Edit" onClick={() => console.log('Bulk Edit')} data-testid="group-toolbar-edit">
        <Edit2 size={16} />
      </button>
      <button className="nords-zoom-controls__btn" title="Move Group" onClick={() => console.log('Move Group')} data-testid="group-toolbar-move">
        <Move size={16} />
      </button>
      <button className="nords-zoom-controls__btn" title="Bulk Connect" onClick={() => console.log('Bulk Connect')} data-testid="group-toolbar-connect">
        <LinkIcon size={16} />
      </button>
      
      <div className="nords-group-toolbar__divider" />
      
      <button 
        className="nords-zoom-controls__btn" 
        style={{ color: 'var(--nords-color-danger)' }}
        title="Delete All" 
        onClick={handleDeleteAll}
        data-testid="group-toolbar-delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
