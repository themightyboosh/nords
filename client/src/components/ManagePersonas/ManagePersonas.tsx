/**
 * ManagePersonas — Admin panel for persona CRUD.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ Personas                                            [X]  │
 * │ Define AI personas and category relevance.                │
 * ├────────────┬─────────────────────────────────────────────┤
 * │ [avatar]P1 │  [Avatar] Name  [🗑]                         │
 * │ [avatar]P2 │  Background*  [textarea]                     │
 * │            │  Primary Motivation*  [textarea]             │
 * │ + New      │  Voice & Tone  [textarea]                    │
 * │            │  Mental Models (n/5)  [+ Add]                │
 * │            │  Guardrails  [+ Add]                         │
 * │            │  Relevance  [sliders per category]           │
 * └────────────┴─────────────────────────────────────────────┘
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, Shuffle } from 'lucide-react';
import { usePersonas, type Persona } from '../../hooks/usePersonas';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { HueSlider } from '../shared/HueSlider';
import { PersonaAvatar } from '../shared/PersonaAvatar';
import { useUIStrings } from '../../hooks/useUIStrings';
import './ManagePersonas.css';

// ── Types ──

interface ConnectionType {
  id: string;
  name: string;
  accent_color?: string | null;
}

interface ManagePersonasProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  connectionTypes: ConnectionType[];
}



// ── Debounce helper — auto-save on blur ──
function useDebouncedSave(saveFn: (id: string, fields: Record<string, unknown>) => Promise<unknown>, delay = 400) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return useCallback((id: string, fields: Record<string, unknown>) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveFn(id, fields), delay);
  }, [saveFn, delay]);
}

// ── Main Component ──

export function ManagePersonas({ projectId, open, onClose, connectionTypes }: ManagePersonasProps) {
  const {
    personas, createPersona, updatePersona, deletePersona,
    addMentalModel, updateMentalModel, deleteMentalModel,
    updateCategoryWeight,
  } = usePersonas(projectId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const { strings: UI_STRINGS } = useUIStrings();

  const selected = personas.find(p => p.id === selectedId) || null;
  const debouncedSave = useDebouncedSave(updatePersona);

  // Auto-select first persona
  React.useEffect(() => {
    if (!selectedId && personas.length > 0) setSelectedId(personas[0].id);
  }, [personas, selectedId]);

  const handleCreate = async () => {
    const p = await createPersona();
    if (p) setSelectedId(p.id);
  };

  const handleDelete = async (id: string) => {
    await deletePersona(id);
    if (selectedId === id) setSelectedId(personas.find(p => p.id !== id)?.id || null);
  };

  // ── Avatar seed options (20 deterministic seeds) ──
  const avatarSeeds = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => `persona-seed-${i + 1}`), []
  );

  if (!open) return null;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(1080px, 96vw)">
      <div className="manage-personas">
        {/* Header */}
        <div className="manage-personas__header">
          <div>
            <h2 className="manage-personas__title">{UI_STRINGS.personas.title}</h2>
            <p className="manage-personas__subtitle">{UI_STRINGS.personas.subtitle}</p>
          </div>
          <button className="manage-personas__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="manage-personas__body">
          {/* ── Sidebar ── */}
          <div className="manage-personas__sidebar">
            <div className="manage-personas__list">
              {personas.map(p => (
                <button
                  key={p.id}
                  className={`manage-personas__list-item ${p.id === selectedId ? 'is-active' : ''}`}
                  onClick={() => { setSelectedId(p.id); setShowAvatarPicker(false); }}
                >
                  <PersonaAvatar seed={p.avatar_seed || p.id} size={32} className="manage-personas__list-avatar" bgColor={p.accent_color} />
                  <span className="manage-personas__list-name">{p.name || 'New Persona'}</span>
                </button>
              ))}
            </div>
            <button className="manage-personas__add-btn" onClick={handleCreate}>
              <Plus size={14} /> New Persona
            </button>
          </div>

          {/* ── Editor ── */}
          <div className="manage-personas__editor">
            {!selected ? (
              <div className="manage-personas__empty">
                {personas.length === 0 ? UI_STRINGS.personas.emptyList : UI_STRINGS.personas.emptyEditor}
              </div>
            ) : (
              <PersonaEditor
                key={selected.id}
                persona={selected}
                connectionTypes={connectionTypes}
                showAvatarPicker={showAvatarPicker}
                setShowAvatarPicker={setShowAvatarPicker}
                avatarSeeds={avatarSeeds}
                onUpdate={updatePersona}
                onDebouncedUpdate={debouncedSave}
                onDelete={() => handleDelete(selected.id)}
                onAddModel={() => addMentalModel(selected.id)}
                onUpdateModel={(id, fields) => updateMentalModel(id, selected.id, fields)}
                onDeleteModel={(id) => deleteMentalModel(id, selected.id)}
                onUpdateWeight={(ctId, weight) => updateCategoryWeight(selected.id, ctId, weight)}
              />
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Persona Editor (detail form) ──

interface PersonaEditorProps {
  persona: Persona;
  connectionTypes: ConnectionType[];
  showAvatarPicker: boolean;
  setShowAvatarPicker: (v: boolean) => void;
  avatarSeeds: string[];
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
  onDebouncedUpdate: (id: string, fields: Record<string, unknown>) => void;
  onDelete: () => void;
  onAddModel: () => void;
  onUpdateModel: (id: string, fields: Record<string, unknown>) => void;
  onDeleteModel: (id: string) => void;
  onUpdateWeight: (ctId: string, weight: number) => void;
}

function PersonaEditor({
  persona, connectionTypes, showAvatarPicker, setShowAvatarPicker, avatarSeeds,
  onUpdate, onDebouncedUpdate, onDelete, onAddModel, onUpdateModel, onDeleteModel, onUpdateWeight,
}: PersonaEditorProps) {

  // Local state for controlled fields — synced on blur
  const [name, setName] = useState(persona.name);
  const [background, setBackground] = useState(persona.background);
  const [motivation, setMotivation] = useState(persona.primary_motivation);
  const [voiceTone, setVoiceTone] = useState(persona.voice_and_tone);
  const [guardrails, setGuardrails] = useState(persona.guardrails || []);

  const handleBlur = (field: string, value: string) => {
    onUpdate(persona.id, { [field]: value });
  };

  const handleGuardrailChange = (index: number, key: 'mode' | 'text', value: string) => {
    const updated = [...guardrails];
    updated[index] = { ...updated[index], [key]: value };
    setGuardrails(updated);
    onDebouncedUpdate(persona.id, { guardrails: updated });
  };

  const addGuardrail = () => {
    const updated = [...guardrails, { mode: 'always' as const, text: '' }];
    setGuardrails(updated);
    onUpdate(persona.id, { guardrails: updated });
  };

  const removeGuardrail = (index: number) => {
    const updated = guardrails.filter((_, i) => i !== index);
    setGuardrails(updated);
    onUpdate(persona.id, { guardrails: updated });
  };

  return (
    <>
      {/* ── Header: Avatar + Name + Delete ── */}
      <div className="manage-personas__editor-header">
        <div onClick={() => setShowAvatarPicker(!showAvatarPicker)} style={{ cursor: 'pointer' }}>
          <PersonaAvatar
            seed={persona.avatar_seed || persona.id}
            size={128}
            className="manage-personas__editor-avatar"
            bgColor={persona.accent_color}
            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
          />
        </div>
        <div className="manage-personas__editor-header-right">
          <input
            className="manage-personas__editor-name"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={() => handleBlur('name', name)}
            placeholder="Persona name"
          />
        </div>
        <button className="manage-personas__delete-btn" onClick={onDelete} title="Delete persona">
          <Trash2 size={16} />
        </button>
      </div>

      {/* ── Avatar Picker ── */}
      {showAvatarPicker && (
        <>
        <div className="manage-personas__avatar-picker">
          <button
            className="manage-personas__avatar-option manage-personas__avatar-randomize"
            onClick={() => {
              const randomSeed = `persona-random-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              onUpdate(persona.id, { avatar_seed: randomSeed });
            }}
            title="Randomize avatar"
          >
            <Shuffle size={20} />
            <span className="manage-personas__randomize-label">Random</span>
          </button>
          {avatarSeeds.map(seed => (
            <button
              key={seed}
              className={`manage-personas__avatar-option ${persona.avatar_seed === seed ? 'is-active' : ''}`}
              onClick={() => { onUpdate(persona.id, { avatar_seed: seed }); setShowAvatarPicker(false); }}
            >
              <PersonaAvatar seed={seed} size={44} bgColor={persona.accent_color} />
            </button>
          ))}
        </div>
        <div className="manage-personas__avatar-color">
          <label className="manage-personas__avatar-color-label">Accent Color</label>
          <HueSlider
            color={persona.accent_color || '#3d4f7c'}
            onChange={(hex) => onUpdate(persona.id, { accent_color: hex })}
            saturation={55}
            lightness={35}
          />
        </div>
        </>
      )}

      {/* ── Background (required) ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">
          Background<span className="required-dot">*</span>
        </label>
        <textarea
          className={`manage-personas__textarea ${!background.trim() ? 'is-error' : ''}`}
          value={background}
          onChange={e => setBackground(e.target.value)}
          onBlur={() => handleBlur('background', background)}
          placeholder="A brief 1-2 sentence history of their experience..."
          rows={2}
        />
      </div>

      {/* ── Primary Motivation (required) ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">
          Primary Motivation<span className="required-dot">*</span>
        </label>
        <textarea
          className={`manage-personas__textarea ${!motivation.trim() ? 'is-error' : ''}`}
          value={motivation}
          onChange={e => setMotivation(e.target.value)}
          onBlur={() => handleBlur('primary_motivation', motivation)}
          placeholder="What is their ultimate goal? (e.g., 'To optimize code for efficiency')"
          rows={2}
        />
      </div>

      {/* ── Voice & Tone ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">Voice & Tone</label>
        <textarea
          className="manage-personas__textarea"
          value={voiceTone}
          onChange={e => setVoiceTone(e.target.value)}
          onBlur={() => handleBlur('voice_and_tone', voiceTone)}
          placeholder="Describe their communication style (e.g., 'Professional but warm. Uses analogies to explain technical concepts. Asks clarifying questions before giving advice.')"
          rows={2}
        />
        <p className="manage-personas__temp-hint">
          Injected into the AI briefing — shapes how the persona communicates throughout every session.
        </p>
      </div>

      {/* ── AI Temperature ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">
          AI Temperature
          <span className="manage-personas__temp-value">{(persona.temperature ?? 1.0).toFixed(1)}</span>
        </label>
        <div className="manage-personas__temp-row">
          <span className="manage-personas__temp-label">Precise</span>
          <input
            type="range"
            className="manage-personas__temp-slider"
            min={0}
            max={2}
            step={0.1}
            value={persona.temperature ?? 1.0}
            onChange={e => onUpdate(persona.id, { temperature: parseFloat(e.target.value) })}
          />
          <span className="manage-personas__temp-label">Creative</span>
        </div>
        <p className="manage-personas__temp-hint">
          Controls randomness in AI responses. Lower values produce more focused, deterministic output. Higher values encourage creativity and variation. Default: 1.0 (Gemini balanced).
        </p>
      </div>

      {/* ── Behavioral Nudge Settings ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">Behavioral Nudge</label>
        <p className="manage-personas__temp-hint" style={{ marginBottom: 8 }}>
          When a user consistently picks paths that another persona would have prioritized higher, the system suggests switching. These settings control sensitivity.
        </p>
        <div className="manage-personas__nudge-row">
          <div className="manage-personas__nudge-field">
            <label className="manage-personas__nudge-label">Window</label>
            <input
              type="number"
              className="manage-personas__nudge-input"
              min={2}
              max={20}
              value={persona.behavioral_nudge_window ?? 5}
              onChange={e => onUpdate(persona.id, { behavioral_nudge_window: Math.max(2, Math.min(20, parseInt(e.target.value) || 5)) })}
            />
            <span className="manage-personas__nudge-hint">Recent traversals to analyze</span>
          </div>
          <div className="manage-personas__nudge-field">
            <label className="manage-personas__nudge-label">Threshold</label>
            <input
              type="number"
              className="manage-personas__nudge-input"
              min={1}
              max={20}
              value={persona.behavioral_nudge_threshold ?? 3}
              onChange={e => onUpdate(persona.id, { behavioral_nudge_threshold: Math.max(1, Math.min(20, parseInt(e.target.value) || 3)) })}
            />
            <span className="manage-personas__nudge-hint">Misaligned picks to trigger</span>
          </div>
        </div>
      </div>

      {/* ── Exchange Style ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">Exchange Style</label>
        <p className="manage-personas__temp-hint" style={{ marginBottom: 8 }}>
          Controls how assertively this persona drives data collection during conversations.
        </p>
        <select
          className="manage-personas__nudge-input"
          style={{ width: '100%', padding: '6px 8px' }}
          value={persona.exchange_style ?? 'bi_directional'}
          onChange={e => onUpdate(persona.id, { exchange_style: e.target.value as any })}
        >
          <option value="free_form">Free-form — follows user's lead, collects opportunistically</option>
          <option value="bi_directional">Bi-directional — answers then pivots to collection</option>
          <option value="interrogate">Interrogate — actively drives, probes for specifics</option>
        </select>
      </div>

      {/* ── Mental Models ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">
          Mental Models ({persona.mental_models?.length || 0}/5)
          <button
            className="manage-personas__add-model-btn"
            onClick={onAddModel}
            disabled={(persona.mental_models?.length || 0) >= 5}
            style={{ width: 'auto', border: 'none', padding: '2px 8px', fontSize: '12px' }}
          >
            <Plus size={12} /> Add
          </button>
        </label>
        {(persona.mental_models || []).map(model => (
          <MentalModelItem
            key={model.id}
            model={model}
            onUpdate={(fields) => onUpdateModel(model.id, fields)}
            onDelete={() => onDeleteModel(model.id)}
          />
        ))}
        {(persona.mental_models?.length || 0) === 0 && (
          <button className="manage-personas__add-model-btn" onClick={onAddModel}>
            <Plus size={14} /> Add a mental model
          </button>
        )}
      </div>

      {/* ── Guardrails ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">
          Guardrails
          <button
            className="manage-personas__add-model-btn"
            onClick={addGuardrail}
            style={{ width: 'auto', border: 'none', padding: '2px 8px', fontSize: '12px' }}
          >
            <Plus size={12} /> Add
          </button>
        </label>
        {guardrails.map((g, i) => (
          <div key={i} className="manage-personas__guardrail-item">
            <select
              className="manage-personas__guardrail-mode"
              value={g.mode}
              onChange={e => handleGuardrailChange(i, 'mode', e.target.value)}
            >
              <option value="always">Always</option>
              <option value="never">Never</option>
            </select>
            <textarea
              className="manage-personas__guardrail-text"
              value={g.text}
              onChange={e => handleGuardrailChange(i, 'text', e.target.value)}
              onBlur={() => onUpdate(persona.id, { guardrails })}
              placeholder={g.mode === 'always' ? 'Always: cite sources...' : 'Never: use sarcasm...'}
              rows={1}
            />
            <button className="manage-personas__guardrail-delete" onClick={() => removeGuardrail(i)} title="Remove">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {guardrails.length === 0 && (
          <button className="manage-personas__add-model-btn" onClick={addGuardrail}>
            <Plus size={14} /> Add a guardrail
          </button>
        )}
      </div>

      {/* ── Relevance Sliders ── */}
      <div className="manage-personas__section">
        <label className="manage-personas__section-title">Relevance</label>
        {connectionTypes.map(ct => {
          const w = persona.category_weights?.find(cw => cw.connection_type_id === ct.id);
          const weight = w?.weight ?? 0;
          return (
            <div key={ct.id} className="manage-personas__weight-row">
              <span
                className="manage-personas__weight-dot"
                style={{ background: ct.accent_color || 'var(--nords-color-text-tertiary)' }}
              />
              <span className="manage-personas__weight-name">{ct.name}</span>
              <input
                type="range"
                className="manage-personas__weight-slider"
                min={-100}
                max={100}
                value={weight}
                onChange={e => onUpdateWeight(ct.id, parseInt(e.target.value))}
              />
              <span className="manage-personas__weight-value">{weight}</span>
            </div>
          );
        })}
        {connectionTypes.length === 0 && (
          <div style={{ color: 'var(--nords-color-text-tertiary)', fontSize: '13px' }}>
            No categories defined yet.
          </div>
        )}
      </div>
    </>
  );
}

// ── Mental Model Item ──

function MentalModelItem({
  model,
  onUpdate,
  onDelete,
}: {
  model: { id: string; name: string; body: string };
  onUpdate: (fields: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(model.name);
  const [body, setBody] = useState(model.body);

  return (
    <div className="manage-personas__model-item">
      <div className="manage-personas__model-header">
        <GripVertical size={14} className="manage-personas__model-grip" />
        <input
          className="manage-personas__model-name"
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={() => onUpdate({ name })}
          placeholder="Model name"
        />
        <button className="manage-personas__model-delete" onClick={onDelete} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
      <textarea
        className="manage-personas__model-body"
        value={body}
        onChange={e => setBody(e.target.value)}
        onBlur={() => onUpdate({ body })}
        placeholder="Describe this mental model..."
        rows={2}
      />
    </div>
  );
}

export default ManagePersonas;
