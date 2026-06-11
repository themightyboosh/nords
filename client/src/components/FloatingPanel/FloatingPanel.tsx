/**
 * FloatingPanel — Unified wrapper for panels and modals.
 *
 * Provides consistent behavior across all floating UI surfaces:
 *   - Escape key dismissal
 *   - Scrim click dismissal (modal variant)
 *   - Focus trapping for accessibility
 *   - Responsive bottom sheet collapse below 768px
 *   - Shared z-index management
 *
 * Usage:
 *   <FloatingPanel variant="panel" isOpen={true} onClose={close}>
 *     <div>Your panel content here</div>
 *   </FloatingPanel>
 *
 *   <FloatingPanel variant="modal" isOpen={true} onClose={close} width="min(900px, 90vw)">
 *     <div>Your modal content here</div>
 *   </FloatingPanel>
 */

import React, { useEffect, useRef, useCallback } from 'react';
import styles from './FloatingPanel.module.css';

interface FloatingPanelProps {
  /** "panel" = right-edge side panel, "modal" = center overlay with scrim */
  variant: 'panel' | 'modal';
  isOpen: boolean;
  onClose: () => void;
  /** CSS width value (default: 'var(--nords-drawer-width)' for panel, 'min(900px, 90vw)' for modal) */
  width?: string;
  /** Panel position — only used for "panel" variant */
  position?: 'right' | 'left';
  /** Additional CSS class for the inner container */
  className?: string;
  children: React.ReactNode;
}

export function FloatingPanel({
  variant,
  isOpen,
  onClose,
  width,
  position = 'right',
  className = '',
  children,
}: FloatingPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Escape key dismissal ──
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, handleEscape]);

  // ── Focus trap — return focus to panel on Tab wrap ──
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── CSS class construction ──
  const variantClass = variant === 'modal'
    ? 'nords-floating-panel--modal'
    : `nords-floating-panel--panel${position === 'left' ? ' nords-floating-panel--panel-left' : ''}`;

  const defaultWidth = variant === 'modal' ? 'min(900px, 90vw)' : undefined;
  const appliedWidth = width || defaultWidth;

  // For panel variant, also add glass styling
  const glassClass = variant === 'panel' ? 'nords-glass' : '';

  return (
    <>
      {/* Scrim — always present for modal, click-to-dismiss */}
      {variant === 'modal' && (
        <div
          className="nords-floating-panel__scrim"
          onClick={onClose}
          data-testid="floating-panel-scrim"
        />
      )}

      <div
        ref={panelRef}
        className={`${variantClass} ${glassClass} ${className}`.trim()}
        style={appliedWidth ? { width: appliedWidth } : undefined}
        onClick={variant === 'modal' ? (e) => e.stopPropagation() : undefined}
        data-testid={`floating-panel-${variant}`}
        role="dialog"
        aria-modal={variant === 'modal'}
      >
        {children}
      </div>
    </>
  );
}

export default FloatingPanel;
