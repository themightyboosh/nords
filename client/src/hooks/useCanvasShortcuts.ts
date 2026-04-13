/**
 * useCanvasShortcuts — Keyboard shortcuts for the spatial canvas.
 *
 * Binds:
 *   ⌘0       → Reset viewport to origin
 *   ⌘K       → Open search palette (TODO)
 *   Delete   → Delete selected node(s)
 *   Backspace → Delete selected node(s) (Mac)
 *   ⌘D       → Duplicate selected node
 */

import { useEffect, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

interface ShortcutCallbacks {
  onDelete?: (ids: string[]) => void;
  onDuplicate?: (id: string) => void;
}

export function useCanvasShortcuts(callbacks?: ShortcutCallbacks) {
  const { setViewport, getNodes } = useReactFlow();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger if user is typing in an input
    if (
      document.activeElement?.tagName === 'INPUT' ||
      document.activeElement?.tagName === 'TEXTAREA' ||
      document.activeElement?.tagName === 'SELECT'
    ) {
      return;
    }

    // ⌘0 / Ctrl+0 — Reset viewport
    if ((e.metaKey || e.ctrlKey) && e.key === '0') {
      e.preventDefault();
      setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 });
      return;
    }

    // ⌘K / Ctrl+K — Search palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      // TODO: Wire up search palette
      console.log('Open search palette');
      return;
    }

    // ⌘D / Ctrl+D — Duplicate selected node
    if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
      e.preventDefault();
      const selected = getNodes().filter(n => n.selected);
      if (selected.length === 1 && callbacks?.onDuplicate) {
        callbacks.onDuplicate(selected[0].id);
      }
      return;
    }

    // Delete / Backspace — Delete selected node(s)
    if (e.key === 'Delete' || e.key === 'Backspace') {
      const selected = getNodes().filter(n => n.selected);
      if (selected.length > 0 && callbacks?.onDelete) {
        e.preventDefault();
        callbacks.onDelete(selected.map(n => n.id));
      }
      return;
    }
  }, [setViewport, getNodes, callbacks]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
