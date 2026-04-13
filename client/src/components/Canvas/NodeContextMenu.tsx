import React, { useRef, useLayoutEffect, useState } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // After first render, measure the menu and clamp to viewport
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const pad = 8; // breathing room from viewport edge
    const clampedX = Math.min(x, window.innerWidth - rect.width - pad);
    const clampedY = Math.min(y, window.innerHeight - rect.height - pad);
    setPosition({
      left: Math.max(pad, clampedX),
      top: Math.max(pad, clampedY),
    });
  }, [x, y]);

  const handleDelete = () => {
    onDelete(node.id);
    onClose();
  };

  return (
    <div 
      ref={menuRef}
      className="nords-context-menu nords-glass" 
      style={{ left: position.left, top: position.top }}
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
