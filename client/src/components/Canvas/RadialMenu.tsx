import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';
import { useNodeCountLimit } from '../../hooks/useNodeCountLimit';
import { useTypeVisibility } from '../../hooks/useTypeVisibility';

interface RadialMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateNord?: (typeId: string, position?: { x: number; y: number }) => void;
}

export function RadialMenu({ x, y, onClose, onCreateNord }: RadialMenuProps) {
  const { addNodes, screenToFlowPosition } = useReactFlow();
  const { canAdd, isAtLimit } = useNodeCountLimit();
  const { visibleNodeTypes } = useTypeVisibility();

  // Calculate positions in a circle
  const radius = 60;
  const positions = visibleNodeTypes.map((_, i) => {
    const angle = (i * (360 / visibleNodeTypes.length) - 90) * (Math.PI / 180);
    return {
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius
    };
  });

  const handleAdd = (item: typeof visibleNodeTypes[0]) => {
    if (!canAdd) return;

    // Convert screen coordinates to canvas logic coordinates
    const position = screenToFlowPosition({ x, y });

    // Prefer the API-backed creation callback
    if (onCreateNord && (item as any).id) {
      onCreateNord((item as any).id, position);
      onClose();
      return;
    }

    // Fallback: add node locally
    const newNode = {
      id: `n-${crypto.randomUUID()}`,
      position,
      type: 'nordNode',
      data: {
        title: `New ${item.name}`,
        type: item.name,
        typeColor: item.color,
        typeIcon: item.icon,
        size: 0.5,
        hasScale: true,
        properties: [],
      }
    };

    addNodes(newNode);
    onClose();
  };

  return (
    <>
      {/* Click outside to close */}
      <div 
        style={{ position: 'fixed', inset: 0, zIndex: 999 }} 
        onClick={onClose} 
      />

      <div style={{ position: 'absolute', left: x, top: y, zIndex: 1000 }}>
        {isAtLimit && (
          <div style={{ position: 'absolute', top: '-40px', left: '-50px', width: '100px', textAlign: 'center', color: 'red', fontWeight: 'bold' }}>
            Node Limit Reached
          </div>
        )}

        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            background: 'var(--nords-color-bg-surface)',
            border: '1px solid var(--nords-color-border-subtle)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        {visibleNodeTypes.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              disabled={!canAdd}
              onClick={() => handleAdd(item)}
              style={{
                position: 'absolute',
                transform: `translate(calc(-50% + ${positions[i].dx}px), calc(-50% + ${positions[i].dy}px))`,
                background: 'var(--nords-color-bg-surface)',
                border: `2px solid ${item.color}`,
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: canAdd ? 'pointer' : 'not-allowed',
                boxShadow: 'var(--nords-shadow-md)',
                color: item.color,
                opacity: canAdd ? 1 : 0.5,
              }}
              title={item.name}
            >
              <Icon size={18} strokeWidth={2} />
            </button>
          );
        })}
      </div>
    </>
  );
}
