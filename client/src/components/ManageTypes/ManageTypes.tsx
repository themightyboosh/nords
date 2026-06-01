/**
 * ManageTypes — Admin modal for CRUD on Nord and Connection types.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ Manage Types                                        [X]  │
 * │ Define properties at the type level.                      │
 * ├────────────┬─────────────────────────────────────────────┤
 * │ NORD TYPES │  ☐ Task                        NORD TYPE    │
 * │ CONN TYPES │  Name: [editable]  Icon: [picker]           │
 * │            │  Color: [hue slider]                        │
 * │ ☐ Task   > │  Properties         [+ Add Property]       │
 * │ + New Type │  ┌───────────────────────────────────┐      │
 * │            │  │ Name │ Type │ Card Row              │      │
 * │            │  └───────────────────────────────────┘      │
 * └────────────┴─────────────────────────────────────────────┘
 *
 * Properties are TYPE-LEVEL schema definitions.
 * Individual nords hold property VALUES, not schema.
 * "Add Property" exists ONLY here, never on a nord card.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Pencil, ChevronRight } from 'lucide-react';
import { useTypeMutations, type NordTypeData, type ConnectionTypeData, type PropertySchema } from '../../hooks/useTypeMutations';
import { resolveIcon } from '../../utils/iconRegistry';
import { ColorIcon } from '../shared/ColorIcon';
import { IconPicker } from './IconPicker';
import { SpectrumEditor } from '../Spectrum/SpectrumEditor';
import { normalizeStageLabels } from '../../utils/stageLabels';
import { hexToHSL } from '../../utils/color';
import { useUIStrings } from '../../hooks/useUIStrings';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { HueSlider } from '../shared/HueSlider';
import { PropertyTable } from '../shared/PropertyTable';
import {
  UI_PROPERTY_TYPES, PROPERTY_TYPE_META, getCompatGroup, needsOptions,
  normalizePropertyType, type PropertyType,
} from '@nords/shared/propertyTypes';
import './ManageTypes.css';

interface ManageTypesProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onTypesChanged?: () => void;
  /** Which tab to open on mount: 'nord' or 'connection' */
  initialTab?: Tab;
  /** When set, locks to a single tab and hides the tab switcher */
  lockedTab?: Tab;
}

type Tab = 'nord' | 'connection';

// ── Options Editor — inline pill editor for 'select' property options ──
function OptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addOption = (raw: string) => {
    const val = raw.trim();
    if (val && !options.includes(val)) onChange([...options, val]);
  };

  const removeOption = (idx: number) => onChange(options.filter((_, i) => i !== idx));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const input = inputRef.current;
      if (input?.value.trim()) { addOption(input.value); input.value = ''; }
    }
    if (e.key === 'Backspace' && !inputRef.current?.value && options.length > 0) {
      removeOption(options.length - 1);
    }
  };

  return (
    <div className="manage-types__options-editor">
      <span className="manage-types__options-label">Options</span>
      <div className="manage-types__options-pills">
        {options.map((opt, i) => (
          <span key={opt} className="manage-types__option-pill">
            {opt}
            <button onClick={() => removeOption(i)} title="Remove">×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="manage-types__options-input"
          placeholder={options.length === 0 ? 'Type an option, press Enter…' : ''}
          onKeyDown={handleKeyDown}
          onBlur={(e) => { if (e.target.value.trim()) { addOption(e.target.value); e.target.value = ''; } }}
        />
      </div>
    </div>
  );
}

// Type compatibility groups now come from the shared registry:
// getCompatGroup(type) returns the group string.


export function ManageTypes({ projectId, open, onClose, onTypesChanged, initialTab, lockedTab }: ManageTypesProps) {
  const mutations = useTypeMutations(projectId);
  const { strings: UI_STRINGS } = useUIStrings();

  const [nordTypes, setNordTypes] = useState<NordTypeData[]>([]);
  const [connectionTypes, setConnectionTypes] = useState<ConnectionTypeData[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(lockedTab || initialTab || 'nord');

  // When lockedTab changes (e.g. switching between Nords/Categories), sync activeTab
  React.useEffect(() => {
    if (lockedTab) setActiveTab(lockedTab);
  }, [lockedTab]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedPropIdx, setExpandedPropIdx] = useState<number | null>(null);

  // Local draft for the name field — prevents API response from resetting cursor
  const [draftName, setDraftName] = useState('');
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  // ── Load types ──
  const loadTypes = useCallback(async () => {
    try {
      const data = await mutations.fetchTypes();
      setNordTypes(data.nord_types);
      setConnectionTypes(data.connection_types);
      // Auto-select first if nothing selected
      if (!selectedId) {
        const firstId = data.nord_types[0]?.id || data.connection_types[0]?.id;
        if (firstId) setSelectedId(firstId);
      }
    } catch (err) {
      console.error('Failed to load types:', err);
    }
  }, [mutations, selectedId]);

  useEffect(() => {
    if (open) loadTypes();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Selected type ──
  const selectedNordType = useMemo(() =>
    nordTypes.find(t => t.id === selectedId),
    [nordTypes, selectedId]
  );
  const selectedConnType = useMemo(() =>
    connectionTypes.find(t => t.id === selectedId),
    [connectionTypes, selectedId]
  );
  const selected = selectedNordType || selectedConnType;
  const isNordType = !!selectedNordType;

  // Sync draft name when selected type changes
  useEffect(() => {
    setDraftName(selected?.name ?? '');
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Type mutations ──
  const handleCreateType = useCallback(async () => {
    setSaving(true);
    try {
      if (activeTab === 'nord') {
        const newType = await mutations.createNordType({ name: 'New Type', icon: 'Square', accent_color: '#4da6ff' });
        setNordTypes(prev => [...prev, newType]);
        setSelectedId(newType.id);
      } else {
        const newType = await mutations.createConnectionType({ name: 'New Connection', icon: 'Layers', accent_color: '#888888' });
        setConnectionTypes(prev => [...prev, newType]);
        setSelectedId(newType.id);
      }
      onTypesChanged?.();
    } catch (err) {
      console.error('Failed to create type:', err);
    } finally {
      setSaving(false);
    }
  }, [activeTab, mutations, onTypesChanged]);

  const handleUpdateField = useCallback(async (field: string, value: unknown) => {
    if (!selectedId) return;
    setSaving(true);
    try {
      if (isNordType) {
        const updated = await mutations.updateNordType(selectedId, { [field]: value });
        setNordTypes(prev => prev.map(t => t.id === selectedId ? updated : t));
      } else {
        const updated = await mutations.updateConnectionType(selectedId, { [field]: value });
        setConnectionTypes(prev => prev.map(t => t.id === selectedId ? updated : t));
      }
      onTypesChanged?.();
    } catch (err) {
      console.error('Failed to update type:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedId, isNordType, mutations, onTypesChanged]);

  const handleDeleteType = useCallback(async () => {
    if (!selectedId) return;
    if (!window.confirm('Delete this type? This cannot be undone.')) return;
    setSaving(true);
    try {
      if (isNordType) {
        await mutations.deleteNordType(selectedId);
        setNordTypes(prev => prev.filter(t => t.id !== selectedId));
      } else {
        await mutations.deleteConnectionType(selectedId);
        setConnectionTypes(prev => prev.filter(t => t.id !== selectedId));
      }
      setSelectedId(null);
      onTypesChanged?.();
    } catch (err: any) {
      const msg = err.message || 'Cannot delete type — instances still exist.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  }, [selectedId, isNordType, mutations, onTypesChanged]);

  // ── Property mutations (schema-level) ──
  const addProperty = useCallback(() => {
    if (!selected) return;
    const currentSchema = (selected as any).properties_schema || [];
    if (currentSchema.length >= 6) {
      alert('Maximum of 6 properties per type. Remove an existing property to add a new one.');
      return;
    }
    const newProp: PropertySchema = { name: 'New Property', description: '', type: 'short_text' };
    handleUpdateField('properties_schema', [...currentSchema, newProp]);
  }, [selected, handleUpdateField]);

  const updateProperty = useCallback((index: number, updates: Partial<PropertySchema>) => {
    if (!selected) return;
    const currentSchema = [...((selected as any).properties_schema || [])];
    currentSchema[index] = { ...currentSchema[index], ...updates };
    handleUpdateField('properties_schema', currentSchema);
  }, [selected, handleUpdateField]);

  const handleTypeChange = useCallback((index: number, newType: PropertySchema['type']) => {
    if (!selected) return;
    const currentSchema = [...((selected as any).properties_schema || [])];
    const oldProp = currentSchema[index];
    const oldGroup = getCompatGroup(normalizePropertyType(oldProp.type));
    const newGroup = getCompatGroup(newType as PropertyType);

    const patch: Partial<PropertySchema> = { type: newType };

    // Clear default if switching to an incompatible type group
    if (oldGroup !== newGroup) {
      patch.defaultValue = null;
    }
    // Clear options if leaving select type
    if (needsOptions(normalizePropertyType(oldProp.type)) && !needsOptions(newType as PropertyType)) {
      patch.options = undefined;
    }

    currentSchema[index] = { ...oldProp, ...patch };
    handleUpdateField('properties_schema', currentSchema);

    // Auto-expand this row so user can immediately configure the new type
    setExpandedPropIdx(index);
  }, [selected, handleUpdateField]);

  const removeProperty = useCallback((index: number) => {
    if (!selected) return;
    const currentSchema = [...((selected as any).properties_schema || [])];
    currentSchema.splice(index, 1);
    // Recompute card_row for non-hidden items
    let row = 1;
    for (const p of currentSchema) {
      if (p.card_row) p.card_row = row++;
    }
    handleUpdateField('properties_schema', currentSchema);
  }, [selected, handleUpdateField]);

  // Arrow-button reorder properties
  const reorderProperty = useCallback((fromIdx: number, toIdx: number) => {
    if (!selected || fromIdx === toIdx) return;
    const currentSchema = [...((selected as any).properties_schema || [])];
    const [moved] = currentSchema.splice(fromIdx, 1);
    currentSchema.splice(toIdx, 0, moved);
    // Recompute card_row for non-hidden items
    let row = 1;
    for (const p of currentSchema) {
      if (p.card_row) p.card_row = row++;
    }
    handleUpdateField('properties_schema', currentSchema);
    if (expandedPropIdx === fromIdx) setExpandedPropIdx(toIdx);
  }, [selected, handleUpdateField, expandedPropIdx]);




  if (!open) return null;

  const currentColor = (selected as any)?.accent_color || '#888888';
  const Icon = selected ? resolveIcon((selected as any).icon) : null;

  const sidebarList = activeTab === 'nord' ? nordTypes : connectionTypes;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(900px, 90vw)">
      <div className="manage-types nords-glass" onClick={e => e.stopPropagation()} data-testid="manage-types-modal">

        {/* ── Header ── */}
        <div className="manage-types__header">
          <div>
            <h2 className="manage-types__title">
              {lockedTab === 'nord' ? UI_STRINGS.types.titleNordOnly : lockedTab === 'connection' ? UI_STRINGS.types.titleCategoryOnly : UI_STRINGS.types.title}
            </h2>
            <p className="manage-types__subtitle">
              {lockedTab === 'nord'
                ? UI_STRINGS.types.subtitleNordOnly
                : lockedTab === 'connection'
                ? UI_STRINGS.types.subtitleCategoryOnly
                : UI_STRINGS.types.subtitle}
            </p>
          </div>
          <button className="manage-types__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="manage-types__body">

          {/* ── Sidebar ── */}
          <div className="manage-types__sidebar">
            {/* Tab Switcher — hidden when locked to a single tab */}
            {!lockedTab && (
              <div className="manage-types__tabs">
                <button
                  className={`manage-types__tab ${activeTab === 'nord' ? 'manage-types__tab--active' : ''}`}
                  onClick={() => { setActiveTab('nord'); setSelectedId(nordTypes[0]?.id || null); }}
                >
                  {UI_STRINGS.types.tabNordTypes}
                </button>
                <button
                  className={`manage-types__tab ${activeTab === 'connection' ? 'manage-types__tab--active' : ''}`}
                  onClick={() => { setActiveTab('connection'); setSelectedId(connectionTypes[0]?.id || null); }}
                >
                  Categories
                </button>
              </div>
            )}

            {/* Type List */}
            <div className="manage-types__list">
              {sidebarList.map(t => {
                return (
                  <button
                    key={t.id}
                    className={`manage-types__list-item ${t.id === selectedId ? 'manage-types__list-item--selected' : ''}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <ColorIcon
                      icon={(t as any).icon || null}
                      color={(t as any).accent_color || '#888'}
                      size={14}
                    />
                    <span className="manage-types__list-name">{t.name}</span>
                    <ChevronRight size={12} className="manage-types__list-chevron" />
                  </button>
                );
              })}
            </div>

            {/* New Type */}
            <button
              className="manage-types__new-btn"
              onClick={handleCreateType}
              disabled={saving}
            >
              <Plus size={14} />
              <span>New {activeTab === 'nord' ? 'Type' : 'Category'}</span>
            </button>
          </div>

          {/* ── Editor ── */}
          <div className="manage-types__editor">
            {selected ? (
              <>
                {/* Type header — icon + inline editable name */}
                <div className="manage-types__editor-header">
                  <button
                    className="manage-types__icon-btn"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    title="Change icon & color"
                  >
                    <ColorIcon
                      icon={(selected as any).icon || null}
                      color={currentColor}
                      size={24}
                      strokeWidth={1.8}
                    />
                  </button>
                  <input
                    type="text"
                    className="manage-types__name-input"
                    value={draftName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraftName(val);
                      // Debounce API save — allows deleting all chars freely
                      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
                      nameTimerRef.current = setTimeout(() => {
                        if (val.trim()) handleUpdateField('name', val);
                      }, 400);
                    }}
                    onBlur={() => {
                      // Flush pending save on blur
                      if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
                      if (draftName.trim()) handleUpdateField('name', draftName);
                    }}
                    placeholder={activeTab === 'nord' ? 'Type name…' : 'Category name…'}
                  />
                  <button className="manage-types__delete-btn" onClick={handleDeleteType} title="Delete type" disabled={saving}>
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Type description / purpose (required) */}
                <div className="manage-types__field">
                  <label className="manage-types__desc-label">
                    Description<span className="required-dot">*</span>
                  </label>
                  <textarea
                    className={`manage-types__desc-input ${!(selected as any).description ? 'manage-types__desc-input--empty' : ''}`}
                    value={(selected as any).description || ''}
                    onChange={(e) => handleUpdateField('description', e.target.value)}
                    placeholder={isNordType ? 'Describe the purpose of this Nord type…' : 'Describe the purpose of this category…'}
                    rows={2}
                  />
                </div>

                {/* Icon & color picker popover */}
                {showIconPicker && (
                  <div className="manage-types__icon-picker-popover">
                    <IconPicker
                      currentIcon={isNordType ? (selected as NordTypeData).icon : ((selected as any).icon || 'Layers')}
                      accentColor={currentColor}
                      onSelect={(iconName) => {
                        handleUpdateField('icon', iconName);
                        setShowIconPicker(false);
                      }}
                    />
                    <div className="manage-types__popover-color">
                      <label className="manage-types__popover-color-label">Color</label>
                      <HueSlider
                        color={currentColor}
                        onChange={(hex) => handleUpdateField('accent_color', hex)}
                        saturation={55}
                        lightness={50}
                      />
                    </div>
                  </div>
                )}

                {/* Connection-specific fields */}
                {!isNordType && (() => {
                  const ct = selected as ConnectionTypeData;
                  const preps = ct.direction_prepositions || { forward: 'from', reverse: 'to', both: 'together' };
                  const verb = ct.verb || '';
                  const defaultDir = ct.default_direction || 'none';

                  // Build a live preview sentence
                  const previewPrep = defaultDir === 'to' ? preps.forward
                    : defaultDir === 'from' ? preps.reverse
                    : defaultDir === 'both' ? preps.both
                    : '';
                  const previewArrow = defaultDir === 'to' ? '→'
                    : defaultDir === 'from' ? '←'
                    : defaultDir === 'both' ? '↔'
                    : '—';
                  const previewLabel = verb
                    ? (defaultDir === 'none' ? verb : `${verb} ${previewPrep}`.trim())
                    : 'context only';

                  return (
                    <>
                      {/* Verb — required */}
                      <div className="manage-types__field">
                        <label className="manage-types__field-label">Verb
                          <span className="manage-types__field-hint">Required — the action word (e.g. "blocks", "depends", "assigns")</span>
                        </label>
                        <input
                          type="text"
                          className="manage-types__input"
                          placeholder="e.g. blocks, depends, relates"
                          value={verb}
                          onChange={(e) => handleUpdateField('verb', e.target.value || null)}
                        />
                      </div>

                      {/* Direction Labels */}
                      <div className="manage-types__field">
                        <label className="manage-types__field-label">Direction Labels
                          <span className="manage-types__field-hint">Prepositions that follow the verb per direction</span>
                        </label>
                        <div className="manage-types__dir-labels">
                          <div className="manage-types__dir-label-row">
                            <span className="manage-types__dir-label-icon">→</span>
                            <span className="manage-types__dir-label-name">Forward</span>
                            <input
                              type="text"
                              className="manage-types__input manage-types__dir-label-input"
                              placeholder="from"
                              value={preps.forward}
                              onChange={(e) => handleUpdateField('direction_prepositions', { ...preps, forward: e.target.value })}
                            />
                          </div>
                          <div className="manage-types__dir-label-row">
                            <span className="manage-types__dir-label-icon">←</span>
                            <span className="manage-types__dir-label-name">Reverse</span>
                            <input
                              type="text"
                              className="manage-types__input manage-types__dir-label-input"
                              placeholder="to"
                              value={preps.reverse}
                              onChange={(e) => handleUpdateField('direction_prepositions', { ...preps, reverse: e.target.value })}
                            />
                          </div>
                          <div className="manage-types__dir-label-row">
                            <span className="manage-types__dir-label-icon">↔</span>
                            <span className="manage-types__dir-label-name">Both</span>
                            <input
                              type="text"
                              className="manage-types__input manage-types__dir-label-input"
                              placeholder="together"
                              value={preps.both}
                              onChange={(e) => handleUpdateField('direction_prepositions', { ...preps, both: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Live Preview */}
                      <div className="manage-types__field">
                        <label className="manage-types__field-label">Preview</label>
                        <div className="manage-types__preview-sentence" style={{ borderColor: currentColor }}>
                          <span className="manage-types__preview-nord">Node A</span>
                          <span className="manage-types__preview-middle" style={{ color: currentColor }}>
                            {previewArrow} {previewLabel} {previewArrow}
                          </span>
                          <span className="manage-types__preview-nord">Node B</span>
                        </div>
                      </div>

                      {/* Default Direction */}
                      <div className="manage-types__field">
                        <label className="manage-types__field-label">Default Direction
                          <span className="manage-types__field-hint">Direction assigned to new connections of this category</span>
                        </label>
                        <div className="manage-types__dir-filter">
                          {([
                            { value: 'to',      label: '→ Forward' },
                            { value: 'from',    label: '← Reverse' },
                            { value: 'both',    label: '↔ Both' },
                            { value: 'neither', label: '— Generic' },
                            { value: 'none',    label: '· Context' },
                          ] as const).map(({ value, label }) => (
                            <button
                              key={value}
                              type="button"
                              className={`manage-types__dir-btn ${
                                defaultDir === value
                                  ? 'manage-types__dir-btn--active'
                                  : ''
                              }`}
                              style={{
                                '--dir-color': currentColor,
                              } as React.CSSProperties}
                              onClick={() => handleUpdateField('default_direction', value)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Spectrum Type Toggle */}
                      <div className="manage-types__field">
                        <label className="manage-types__field-label">Spectrum Type
                          <span className="manage-types__field-hint">Controls how connections are measured — board columns + edge labels</span>
                        </label>
                        <div className="manage-types__toggle-group">
                          {([
                            { value: 'none', label: '⊘ None' },
                            { value: 'spectrum', label: '═ Spectrum' },
                            // { value: 'quadrant', label: '⊞ Quadrant' }, // TODO: re-enable when quadrant mode is stable
                          ] as const).map(({ value, label }) => (
                            <button
                              key={value}
                              className={`manage-types__toggle-btn ${
                                (ct.measurement_mode || 'spectrum') === value ? 'is-active' : ''
                              }`}
                              style={{
                                '--dir-color': currentColor,
                              } as React.CSSProperties}
                              onClick={() => handleUpdateField('measurement_mode', value)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Spectrum Labels */}
                      {(ct.measurement_mode || 'spectrum') !== 'none' && (
                        <div className="manage-types__field">
                          <label className="manage-types__field-label">
                            Spectrum
                            <span className="manage-types__field-hint">
                              Intensity axis — defines board columns and edge labels
                            </span>
                          </label>
                          <SpectrumEditor
                            labels={normalizeStageLabels(ct.x_stage_labels)}
                            color={currentColor}
                            onChange={(labels) => handleUpdateField('x_stage_labels', labels)}
                          />
                        </div>
                      )}

                      {/* Y-axis Labels — disabled while quadrant mode is shelved
                      {(ct.measurement_mode || 'spectrum') === 'quadrant' && (
                        <div className="manage-types__field">
                          <label className="manage-types__field-label">Y-Axis Labels
                            <span className="manage-types__field-hint">Vertical axis — defines board swimlane rows</span>
                          </label>
                          <SpectrumEditor
                            labels={normalizeStageLabels(ct.y_stage_labels)}
                            color={currentColor}
                            onChange={(labels) => handleUpdateField('y_stage_labels', labels)}
                          />
                        </div>
                      )}
                      */}
                    </>
                  );
                })()}

                {/* Properties Schema — uses shared PropertyTable */}
                <PropertyTable
                  items={((selected as any).properties_schema || []).map((prop: PropertySchema, i: number) => ({
                    id: String(i),
                    name: prop.name,
                    type: prop.type,
                    required: !!prop.required,
                    cardRow: prop.card_row,
                    data: prop,
                  }))}
                  showHide={true}
                  expandedId={expandedPropIdx != null ? String(expandedPropIdx) : null}
                  onExpandToggle={(id) => setExpandedPropIdx(id != null ? Number(id) : null)}
                  onNameChange={(id, name) => updateProperty(Number(id), { name })}
                  onTypeChange={(id, type) => handleTypeChange(Number(id), type as PropertyType)}
                  onRequiredChange={(id, req) => updateProperty(Number(id), { required: req })}
                  onHideChange={(id, hidden) => {
                    const idx = Number(id);
                    if (hidden) {
                      updateProperty(idx, { card_row: null, required: false });
                    } else {
                      const schema = (selected as any).properties_schema || [];
                      const maxRow = Math.max(0, ...schema.map((p: any) => p.card_row || 0));
                      updateProperty(idx, { card_row: maxRow + 1 });
                    }
                  }}
                  onReorder={(from, to) => reorderProperty(from, to)}
                  onDelete={(id) => removeProperty(Number(id))}
                  onAdd={addProperty}
                  renderDetail={(item) => {
                    const prop = item.data as PropertySchema;
                    const idx = Number(item.id);
                    const propType = normalizePropertyType(prop.type);
                    return (
                      <>
                        <div className="manage-types__prop-detail-row">
                          <div className="manage-types__prop-detail-field" style={{ flex: '1 1 100%' }}>
                            <span className="manage-types__prop-detail-label">
                              Description<span className="required-dot">*</span>
                            </span>
                            <input
                              type="text"
                              className={`manage-types__prop-default-input ${!prop.description ? 'manage-types__prop-default-input--empty' : ''}`}
                              value={prop.description || ''}
                              onChange={(e) => updateProperty(idx, { description: e.target.value })}
                              placeholder="What does this property capture? (shown to AI)"
                            />
                          </div>
                        </div>
                        <div className="manage-types__prop-detail-row">
                          <div className="manage-types__prop-detail-field">
                            <span className="manage-types__prop-detail-label">Default</span>
                            {propType === 'tags' ? (
                              <span className="manage-types__prop-detail-hint">Tags are added per instance</span>
                            ) : propType === 'select' ? (
                              <select
                                className="manage-types__prop-default-select"
                                value={prop.defaultValue != null ? String(prop.defaultValue) : ''}
                                onChange={(e) => updateProperty(idx, { defaultValue: e.target.value || null })}
                              >
                                <option value="">— None —</option>
                                {(prop.options || []).map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : propType === 'date' ? (
                              <input
                                type="date"
                                className="manage-types__prop-default-input manage-types__prop-default-input--date"
                                value={prop.defaultValue != null ? String(prop.defaultValue) : ''}
                                onChange={(e) => updateProperty(idx, { defaultValue: e.target.value || null })}
                              />
                            ) : propType === 'long_text' ? (
                              <textarea
                                className="manage-types__prop-default-textarea"
                                value={prop.defaultValue != null ? String(prop.defaultValue) : ''}
                                onChange={(e) => updateProperty(idx, { defaultValue: e.target.value || null })}
                                placeholder="Default markdown content…"
                                rows={4}
                              />
                            ) : (
                              <input
                                type={prop.type === 'number' ? 'number' : prop.type === 'url' ? 'url' : 'text'}
                                className="manage-types__prop-default-input"
                                value={prop.defaultValue != null ? String(prop.defaultValue) : ''}
                                onChange={(e) => updateProperty(idx, { defaultValue: e.target.value || null })}
                                placeholder={prop.type === 'url' ? 'https://…' : 'Default value…'}
                              />
                            )}
                          </div>
                        </div>
                        {needsOptions(propType) && (
                          <OptionsEditor
                            options={prop.options || []}
                            onChange={(opts) => updateProperty(idx, { options: opts })}
                          />
                        )}
                        {propType === 'computed' && (
                          <div className="manage-types__prop-detail-row manage-types__prop-formula-section">
                            <div className="manage-types__prop-detail-field">
                              <span className="manage-types__prop-detail-label">
                                <span className="manage-types__formula-icon">ƒ</span> Formula
                              </span>
                              <input
                                type="text"
                                className="manage-types__prop-default-input manage-types__prop-formula-input"
                                value={(prop.config as any)?.formula || ''}
                                onChange={(e) => updateProperty(idx, {
                                  config: { ...(prop.config || {}), formula: e.target.value }
                                })}
                                placeholder="e.g. Allocated Hours * Effective Rate"
                              />
                            </div>
                            <div className="manage-types__prop-detail-field" style={{ maxWidth: '180px' }}>
                              <span className="manage-types__prop-detail-label">Display as</span>
                              <select
                                className="manage-types__prop-default-select"
                                value={(prop.config as any)?.output_type || 'number'}
                                onChange={(e) => updateProperty(idx, {
                                  config: { ...(prop.config || {}), output_type: e.target.value }
                                })}
                              >
                                <option value="number">Number</option>
                                <option value="currency">Currency</option>
                                <option value="percentage">Percentage</option>
                              </select>
                            </div>
                            {(prop.config as any)?.output_type === 'currency' && (
                              <div className="manage-types__prop-detail-field" style={{ maxWidth: '80px' }}>
                                <span className="manage-types__prop-detail-label">Symbol</span>
                                <input
                                  type="text"
                                  className="manage-types__prop-default-input"
                                  value={(prop.config as any)?.output_config?.symbol || '$'}
                                  onChange={(e) => updateProperty(idx, {
                                    config: {
                                      ...(prop.config || {}),
                                      output_config: { ...((prop.config as any)?.output_config || {}), symbol: e.target.value }
                                    }
                                  })}
                                  maxLength={3}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  }}
                />


              </>
            ) : (
              <div className="manage-types__empty">
                <p>{sidebarList.length === 0
                  ? (activeTab === 'nord' ? UI_STRINGS.types.emptyNordTypes : UI_STRINGS.types.emptyCategories)
                  : UI_STRINGS.types.emptyEditor}</p>
              </div>
            )}
          </div>
        </div>

        {/* Saving indicator */}
        {saving && <div className="manage-types__saving">Saving…</div>}
      </div>
    </FloatingPanel>
  );
}
