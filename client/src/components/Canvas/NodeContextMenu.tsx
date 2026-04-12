import React from 'react';
import type { Node } from '@xyflow/react';
import { Edit2, Copy, Trash2, Tag, Link as LinkIcon } from 'lucide-react';
import './CanvasEngine.css'; // Just use shared css or inline styles for now

interface NodeContextMenuProps {
  x: number;
  y: number;
  node: Node;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onChangeType: (id: string) => void;
  onAddConnection: (id: string) => void;
}

export function NodeContextMenu({
  x,
  y,
  node,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onChangeType,
  onAddConnection
}: NodeContextMenuProps) {
  const handleDelete = () => {
    onDelete(node.id);
    onClose();
  };

  return (
    <div 
      className="nords-context-menu nords-glass" 
      style={{ left: x, top: y }}
      data-testid="context-menu"
    >
      <button className="nords-context-menu__item" onClick={() => { onEdit(node.id); onClose(); }} data-testid="context-menu-edit">
        <Edit2 size={14} /> Edit Data
      </button>
      <button className="nords-context-menu__item" onClick={() => { onDuplicate(node.id); onClose(); }} data-testid="context-menu-copy">
        <Copy size={14} /> Duplicate
      </button>
      <button className="nords-context-menu__item" onClick={() => { onChangeType(node.id); onClose(); }}>
        <Tag size={14} /> Change Type
      </button>
      <button className="nords-context-menu__item" onClick={() => { onAddConnection(node.id); onClose(); }} data-testid="context-menu-link">
        <LinkIcon size={14} /> Connect...
      </button>
      <div className="nords-context-menu__divider" />
      <button 
        className="nords-context-menu__item" 
        style={{ color: 'var(--nords-color-danger)' }}
        onClick={handleDelete}
        data-testid="context-menu-delete"
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}

// Global styles for menu items 
// Consider moving to CanvasEngine.css
/*
.nords-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  border: none;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--nords-color-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
}
.nords-menu-item:hover {
  background: var(--nords-color-bg-hover);
  color: var(--nords-color-text-primary);
}
*/
