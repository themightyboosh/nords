/**
 * PersonaLensDrawer — Read-only persona detail with live category weight sliders.
 *
 * Shown in the right-side FloatingPanel when the Persona Lens is active.
 * Displays persona background and motivation (read-only) and editable
 * category weight sliders that drive real-time graph repositioning.
 *
 * Nord type visibility is handled by the GlobalDock's Filter flyout
 * (3-state: show / dim / hide), not in this drawer.
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { X, User } from 'lucide-react';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { PersonaAvatar } from '../shared/PersonaAvatar';
import { resolveIcon } from '../../utils/iconRegistry';
import type { Persona } from '../../hooks/usePersonas';
import styles from './PersonaLensDrawer.module.css';

interface ConnectionType {
  id: string;
  name: string;
  accent_color?: string | null;
  icon?: string | null;
}

interface PersonaLensDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona | null;
  connectionTypes: ConnectionType[];
  /** Live weight overrides (pre-commit slider state) */
  liveWeights?: Map<string, number> | null;
  /** Called on every slider change for live graph updates */
  onWeightChange: (connectionTypeId: string, weight: number) => void;
  /** Called on slider release to persist to DB */
  onWeightCommit: (connectionTypeId: string, weight: number) => void;
}



export function PersonaLensDrawer({
  isOpen,
  onClose,
  persona,
  connectionTypes,
  liveWeights,
  onWeightChange,
  onWeightCommit,
}: PersonaLensDrawerProps) {

  if (!persona) return null;

  return (
    <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose}>
      <div className="persona-lens-drawer">
        {/* ── Header: Eyebrow + Close ── */}
        <div className="persona-lens-drawer__header">
          <div style={{ flex: 1 }}>
            <div className="nords-drawer-type-eyebrow" style={{ color: persona.accent_color || '#a78bfa' }}>
              <User size={12} strokeWidth={2} />
              Persona
            </div>
            <div className="persona-lens-drawer__identity">
              <h2 className="persona-lens-drawer__name">{persona.name}</h2>
            </div>
          </div>
          <button className="nords-close-btn" onClick={onClose} aria-label="Close"><X size={18} strokeWidth={2} /></button>
        </div>

        {/* ── Avatar (larger, standalone) ── */}
        <div style={{ padding: '12px 20px 0', display: 'flex', justifyContent: 'center' }}>
          <PersonaAvatar
            seed={persona.avatar_seed || persona.id}
            size={80}
            className="persona-lens-drawer__avatar"
            bgColor={persona.accent_color}
          />
        </div>

        {/* ── Read-only fields ── */}
        <div className="persona-lens-drawer__content">
          {persona.background && (
            <div className="persona-lens-drawer__field">
              <label className="persona-lens-drawer__label">Background</label>
              <p className="persona-lens-drawer__text">{persona.background}</p>
            </div>
          )}

          {persona.primary_motivation && (
            <div className="persona-lens-drawer__field">
              <label className="persona-lens-drawer__label">Primary Motivation</label>
              <p className="persona-lens-drawer__text">{persona.primary_motivation}</p>
            </div>
          )}

          {/* ── Category Weight Sliders ── */}
          <div className="persona-lens-drawer__field">
            <label className="persona-lens-drawer__label">Category Weights</label>
            <p className="persona-lens-drawer__hint">
              Adjust how this persona values each category. Positive = green &amp; close. Negative = red &amp; far.
            </p>
            <div className="persona-lens-drawer__sliders">
              {connectionTypes.map(ct => {
                // Use live weight if available, otherwise fall back to DB state
                const liveVal = liveWeights?.get(ct.id);
                const dbWeight = persona.category_weights.find(
                  w => w.connection_type_id === ct.id
                )?.weight ?? 0;
                const weight = liveVal !== undefined ? liveVal : dbWeight;

                return (
                  <WeightSlider
                    key={ct.id}
                    connectionTypeId={ct.id}
                    name={ct.name}
                    color={ct.accent_color || '#a78bfa'}
                    icon={ct.icon || null}
                    value={weight}
                    onChange={onWeightChange}
                    onCommit={onWeightCommit}
                  />
                );
              })}
              {connectionTypes.length === 0 && (
                <p className="persona-lens-drawer__empty">
                  No categories defined yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Individual Weight Slider ──

interface WeightSliderProps {
  connectionTypeId: string;
  name: string;
  color: string;
  icon: string | null;
  value: number;
  onChange: (connectionTypeId: string, weight: number) => void;
  onCommit: (connectionTypeId: string, weight: number) => void;
}

function WeightSlider({ connectionTypeId, name, color, icon, value, onChange, onCommit }: WeightSliderProps) {
  const localRef = useRef(value);
  localRef.current = value;

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseInt(e.target.value, 10);
    onChange(connectionTypeId, newVal);
  }, [connectionTypeId, onChange]);

  const handleMouseUp = useCallback(() => {
    onCommit(connectionTypeId, localRef.current);
  }, [connectionTypeId, onCommit]);

  // Color the filled portion of the slider
  const fillPercent = ((value + 100) / 200) * 100;
  const isNegative = value < 0;
  const isPositive = value > 0;

  return (
    <div className="persona-weight-slider">
      <div className="persona-weight-slider__header">
        {(() => {
          const SliderIcon = icon ? resolveIcon(icon) : null;
          return SliderIcon
            ? <SliderIcon size={14} style={{ color, flexShrink: 0 }} />
            : <span className="persona-weight-slider__swatch" style={{ backgroundColor: color }} />;
        })()}
        <span className="persona-weight-slider__name">{name}</span>
        <span className={`persona-weight-slider__value ${isNegative ? 'is-negative' : ''} ${isPositive ? 'is-positive' : ''}`}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <div className="persona-weight-slider__track-wrapper">
        <input
          type="range"
          min={-100}
          max={100}
          step={1}
          value={value}
          onChange={handleInput}
          onMouseUp={handleMouseUp}
          onTouchEnd={handleMouseUp}
          className="persona-weight-slider__input"
          style={{
            '--slider-fill': `${fillPercent}%`,
            '--slider-color': color,
          } as React.CSSProperties}
        />
        <div className="persona-weight-slider__center-mark" />
      </div>
    </div>
  );
}

export default PersonaLensDrawer;
