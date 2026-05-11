/**
 * PersonaLensDrawer — Read-only persona detail with live category weight sliders.
 *
 * Shown in the right-side FloatingPanel when the Persona Lens is active.
 * Displays persona background and motivation (read-only) and editable
 * category weight sliders that drive real-time graph repositioning.
 *
 * ┌─────────────────────────────┐
 * │  👤 Product Manager         │  ← Avatar + Name (read-only)
 * │─────────────────────────────│
 * │  Background                 │
 * │  "10 years in SaaS PM..."   │  ← Read-only text
 * │─────────────────────────────│
 * │  Primary Motivation         │
 * │  "Ship features that..."    │  ← Read-only text
 * │─────────────────────────────│
 * │  CATEGORY WEIGHTS           │
 * │  Blocks         ━━━●━━  +60 │  ← Slider, live update
 * │  Depends On     ━●━━━━  -20 │
 * │  Owns           ━━━━●━  +80 │
 * └─────────────────────────────┘
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { createAvatar } from '@dicebear/core';
import { notionists } from '@dicebear/collection';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import type { Persona } from '../../hooks/usePersonas';
import './PersonaLensDrawer.css';

interface ConnectionType {
  id: string;
  name: string;
  accent_color?: string | null;
}

interface PersonaLensDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  persona: Persona | null;
  connectionTypes: ConnectionType[];
  /** Called on every slider change for live graph updates (debounced in parent) */
  onWeightChange: (connectionTypeId: string, weight: number) => void;
  /** Called on slider release to persist to DB */
  onWeightCommit: (connectionTypeId: string, weight: number) => void;
}

// ── Avatar helper ──
function useAvatar(seed: string, size = 80) {
  return useMemo(() => {
    return createAvatar(notionists, { seed, size }).toDataUri();
  }, [seed, size]);
}

export function PersonaLensDrawer({
  isOpen,
  onClose,
  persona,
  connectionTypes,
  onWeightChange,
  onWeightCommit,
}: PersonaLensDrawerProps) {
  const avatarUri = useAvatar(persona?.avatar_seed || 'default', 80);

  if (!persona) return null;

  return (
    <FloatingPanel variant="panel" isOpen={isOpen} onClose={onClose}>
      <div className="persona-lens-drawer">
        {/* ── Header: Avatar + Name ── */}
        <div className="persona-lens-drawer__header">
          <img
            src={avatarUri}
            alt={persona.name}
            className="persona-lens-drawer__avatar"
            style={{ backgroundColor: persona.accent_color || '#3d4f7c' }}
          />
          <div className="persona-lens-drawer__identity">
            <h2 className="persona-lens-drawer__name">{persona.name}</h2>
            <span className="persona-lens-drawer__eyebrow">Persona Lens</span>
          </div>
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
                const existingWeight = persona.category_weights.find(
                  w => w.connection_type_id === ct.id
                );
                const weight = existingWeight?.weight ?? 0;

                return (
                  <WeightSlider
                    key={ct.id}
                    connectionTypeId={ct.id}
                    name={ct.name}
                    color={ct.accent_color || '#a78bfa'}
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
  value: number;
  onChange: (connectionTypeId: string, weight: number) => void;
  onCommit: (connectionTypeId: string, weight: number) => void;
}

function WeightSlider({ connectionTypeId, name, color, value, onChange, onCommit }: WeightSliderProps) {
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
        <span className="persona-weight-slider__swatch" style={{ backgroundColor: color }} />
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
