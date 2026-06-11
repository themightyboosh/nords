/**
 * SpectrumEditor — Interactive 1D point editor for stage label positions.
 *
 * Users define named stops along a 0–1 bar:
 *
 *   ┌─────────────────────────────────────────────────┐
 *   │  🔵Low          🔵Medium              🔵High   │
 *   │  ████████████████████████████████████████████████│
 *   │  0.0           0.5                    1.0       │
 *   └─────────────────────────────────────────────────┘
 *
 * - Click the bar to add a new point (prompts for name)
 * - Drag existing points to reposition
 * - Right-click or X button to delete a point
 * - Points snap to 0.01 increments for cleanliness
 */

import React, { useCallback, useRef, useState } from 'react';
import type { StageLabel } from '../../hooks/useProjectGraph';
import styles from './SpectrumEditor.module.css';

interface SpectrumEditorProps {
  labels: StageLabel[];
  color: string;
  onChange: (labels: StageLabel[]) => void;
}

export function SpectrumEditor({ labels, color, onChange }: SpectrumEditorProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const sorted = [...labels].sort((a, b) => a.position - b.position);

  const getPosition = useCallback((clientX: number): number => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const raw = (clientX - rect.left) / rect.width;
    return Math.round(Math.max(0, Math.min(1, raw)) * 100) / 100; // snap to 0.01
  }, []);

  // ── Add point ──
  const handleBarClick = useCallback((e: React.MouseEvent) => {
    // Don't add if clicking on an existing point
    if ((e.target as HTMLElement).closest('.spectrum-editor__point')) return;
    const pos = getPosition(e.clientX);
    // Auto-generate name — user can double-click to rename
    const nextNum = labels.length + 1;
    const autoName = `Stage ${nextNum}`;
    onChange([...labels, { label: autoName, position: pos }]);
  }, [labels, onChange, getPosition]);

  // ── Drag point ──
  const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingIndex(index);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (draggingIndex === null) return;
    const pos = getPosition(e.clientX);
    const updated = labels.map((l, i) =>
      i === draggingIndex ? { ...l, position: pos } : l
    );
    onChange(updated);
  }, [draggingIndex, labels, onChange, getPosition]);

  const handlePointerUp = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  // ── Delete point ──
  const handleDelete = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(labels.filter((_, i) => i !== index));
  }, [labels, onChange]);

  // ── Rename point ──
  const handleStartRename = useCallback((index: number) => {
    setEditingIndex(index);
    setEditingName(labels[index].label);
  }, [labels]);

  const handleSubmitRename = useCallback(() => {
    if (editingIndex === null) return;
    const trimmed = editingName.trim().slice(0, 24);
    if (trimmed) {
      onChange(labels.map((l, i) =>
        i === editingIndex ? { ...l, label: trimmed } : l
      ));
    }
    setEditingIndex(null);
    setEditingName('');
  }, [editingIndex, editingName, labels, onChange]);

  return (
    <div className="spectrum-editor" data-testid="spectrum-editor">
      {/* Points layer (above bar for z-index) */}
      <div
        ref={barRef}
        className="spectrum-editor__bar"
        onClick={handleBarClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Fill gradient */}
        <div
          className="spectrum-editor__fill"
          style={{ background: `linear-gradient(to right, ${color}22, ${color})` }}
        />

        {/* Points */}
        {sorted.map((sl, displayI) => {
          // Find original index for mutations
          const origIndex = labels.findIndex(l => l === sl) !== -1
            ? labels.indexOf(sl)
            : displayI;

          return (
            <div
              key={`${sl.label}-${origIndex}`}
              className={`spectrum-editor__point ${draggingIndex === origIndex ? 'is-dragging' : ''}`}
              style={{ left: `${sl.position * 100}%` }}
              onPointerDown={(e) => handlePointerDown(e, origIndex)}
              onContextMenu={(e) => handleDelete(e, origIndex)}
              onDoubleClick={() => handleStartRename(origIndex)}
            >
              {/* Point circle */}
              <div
                className="spectrum-editor__dot"
                style={{ backgroundColor: color, borderColor: color }}
              />

              {/* Label */}
              {editingIndex === origIndex ? (
                <input
                  className="spectrum-editor__rename-input"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSubmitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmitRename();
                    if (e.key === 'Escape') { setEditingIndex(null); setEditingName(''); }
                  }}
                  autoFocus
                  maxLength={24}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="spectrum-editor__label">{sl.label}</span>
              )}

              {/* Delete button */}
              <button
                className="spectrum-editor__delete"
                onClick={(e) => handleDelete(e, origIndex)}
                title="Remove label"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      <div className="spectrum-editor__hint">
        Click the bar to add a label · Drag to reposition · Double-click to rename · Right-click to delete
      </div>
    </div>
  );
}
