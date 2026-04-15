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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Plus, Trash2, GripVertical, ChevronRight } from 'lucide-react';
import { useTypeMutations, type NordTypeData, type ConnectionTypeData, type PropertySchema } from '../../hooks/useTypeMutations';
import { resolveIcon } from '../../utils/iconRegistry';
import { IconPicker } from './IconPicker';
import { SpectrumEditor } from '../Spectrum/SpectrumEditor';
import { normalizeStageLabels } from '../../utils/stageLabels';
import { hslToHex, hexToHSL, autoContrast } from '../../utils/color';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import './ManageTypes.css';

interface ManageTypesProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onTypesChanged?: () => void;
}

type Tab = 'nord' | 'connection';

export function ManageTypes({ projectId, open, onClose, onTypesChanged }: ManageTypesProps) {
  const mutations = useTypeMutations(projectId);

  const [nordTypes, setNordTypes] = useState<NordTypeData[]>([]);
  const [connectionTypes, setConnectionTypes] = useState<ConnectionTypeData[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('nord');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // ── Type mutations ──
  const handleCreateType = useCallback(async () => {
    setSaving(true);
    try {
      if (activeTab === 'nord') {
        const newType = await mutations.createNordType({ name: 'New Type', icon: 'Square', accent_color: '#4da6ff' });
        setNordTypes(prev => [...prev, newType]);
        setSelectedId(newType.id);
      } else {
        const newType = await mutations.createConnectionType({ name: 'New Connection', accent_color: '#888888' });
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
      const msg = err?.response?.data?.error || err.message || 'Cannot delete type — instances still exist.';
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
    const newProp: PropertySchema = { name: 'New Property', type: 'string' };
    handleUpdateField('properties_schema', [...currentSchema, newProp]);
  }, [selected, handleUpdateField]);

  const updateProperty = useCallback((index: number, updates: Partial<PropertySchema>) => {
    if (!selected) return;
    const currentSchema = [...((selected as any).properties_schema || [])];
    currentSchema[index] = { ...currentSchema[index], ...updates };
    handleUpdateField('properties_schema', currentSchema);
  }, [selected, handleUpdateField]);

  const removeProperty = useCallback((index: number) => {
    if (!selected) return;
    const currentSchema = [...((selected as any).properties_schema || [])];
    currentSchema.splice(index, 1);
    handleUpdateField('properties_schema', currentSchema);
  }, [selected, handleUpdateField]);

  if (!open) return null;

  const currentHue = selected ? hexToHSL((selected as any).accent_color || '#888').h : 200;
  const currentColor = (selected as any)?.accent_color || '#888888';
  const Icon = selected && isNordType ? resolveIcon((selected as NordTypeData).icon) : null;

  const sidebarList = activeTab === 'nord' ? nordTypes : connectionTypes;

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(900px, 90vw)">
      <div className="manage-types nords-glass" onClick={e => e.stopPropagation()} data-testid="manage-types-modal">

        {/* ── Header ── */}
        <div className="manage-types__header">
          <div>
            <h2 className="manage-types__title">Manage Types</h2>
            <p className="manage-types__subtitle">
              Define properties and appearance. Changes apply to all nords of each type.
            </p>
          </div>
          <button className="manage-types__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="manage-types__body">

          {/* ── Sidebar ── */}
          <div className="manage-types__sidebar">
            {/* Tab Switcher */}
            <div className="manage-types__tabs">
              <button
                className={`manage-types__tab ${activeTab === 'nord' ? 'manage-types__tab--active' : ''}`}
                onClick={() => { setActiveTab('nord'); setSelectedId(nordTypes[0]?.id || null); }}
              >
                Nord Types
              </button>
              <button
                className={`manage-types__tab ${activeTab === 'connection' ? 'manage-types__tab--active' : ''}`}
                onClick={() => { setActiveTab('connection'); setSelectedId(connectionTypes[0]?.id || null); }}
              >
                Conn Types
              </button>
            </div>

            {/* Type List */}
            <div className="manage-types__list">
              {sidebarList.map(t => {
                const TypeIcon = isNordType ? resolveIcon((t as NordTypeData).icon) : null;
                return (
                  <button
                    key={t.id}
                    className={`manage-types__list-item ${t.id === selectedId ? 'manage-types__list-item--selected' : ''}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <span
                      className="manage-types__swatch"
                      style={{ backgroundColor: (t as any).accent_color }}
                    />
                    {TypeIcon && <TypeIcon size={14} strokeWidth={1.6} />}
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
              <span>New {activeTab === 'nord' ? 'Type' : 'Connection'}</span>
            </button>
          </div>

          {/* ── Editor ── */}
          <div className="manage-types__editor">
            {selected ? (
              <>
                {/* Type header with live preview */}
                <div className="manage-types__editor-header" style={{ borderLeftColor: currentColor }}>
                  {Icon && (
                    <button
                      className="manage-types__icon-btn"
                      style={{ color: currentColor }}
                      onClick={() => setShowIconPicker(!showIconPicker)}
                      title="Change icon"
                    >
                      <Icon size={24} strokeWidth={1.8} />
                    </button>
                  )}
                  <div className="manage-types__editor-meta">
                    <span className="manage-types__editor-badge" style={{ color: autoContrast(currentColor), backgroundColor: currentColor }}>
                      {activeTab === 'nord' ? 'NORD TYPE' : 'CONNECTION TYPE'}
                    </span>
                  </div>
                  <button className="manage-types__delete-btn" onClick={handleDeleteType} title="Delete type" disabled={saving}>
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Icon picker popover */}
                {showIconPicker && isNordType && (
                  <div className="manage-types__icon-picker-popover">
                    <IconPicker
                      currentIcon={(selected as NordTypeData).icon}
                      accentColor={currentColor}
                      onSelect={(iconName) => {
                        handleUpdateField('icon', iconName);
                        setShowIconPicker(false);
                      }}
                    />
                  </div>
                )}

                {/* Name */}
                <div className="manage-types__field">
                  <label className="manage-types__field-label">Name</label>
                  <input
                    type="text"
                    className="manage-types__input"
                    value={selected.name}
                    onChange={(e) => handleUpdateField('name', e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="manage-types__field">
                  <label className="manage-types__field-label">Description
                    <span className="manage-types__field-hint">Used by AI for semantic traversal and context</span>
                  </label>
                  <textarea
                    className="manage-types__textarea"
                    placeholder="Describe what this type represents…"
                    value={(selected as any).description || ''}
                    onChange={(e) => handleUpdateField('description', e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Color (Hue slider) */}
                <div className="manage-types__field">
                  <label className="manage-types__field-label">Color</label>
                  <div className="manage-types__color-row">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={currentHue}
                      onChange={(e) => {
                        const hue = parseInt(e.target.value);
                        const hex = hslToHex(hue, 55, 50);
                        handleUpdateField('accent_color', hex);
                      }}
                      className="manage-types__hue-slider"
                      style={{
                        background: `linear-gradient(to right, 
                          hsl(0, 55%, 50%), hsl(60, 55%, 50%), hsl(120, 55%, 50%), 
                          hsl(180, 55%, 50%), hsl(240, 55%, 50%), hsl(300, 55%, 50%), hsl(360, 55%, 50%))`,
                      }}
                    />
                    <span className="manage-types__color-preview" style={{ backgroundColor: currentColor }} />
                  </div>
                </div>

                {/* Connection-specific fields */}
                {!isNordType && (
                  <>
                    {/* Verb */}
                    <div className="manage-types__field">
                      <label className="manage-types__field-label">Verb
                        <span className="manage-types__field-hint">Used in board title — e.g. "blocks", "depends on"</span>
                      </label>
                      <input
                        type="text"
                        className="manage-types__input"
                        placeholder="e.g. blocks, depends on, relates to"
                        value={(selected as ConnectionTypeData).verb || ''}
                        onChange={(e) => handleUpdateField('verb', e.target.value)}
                      />
                    </div>

                    {/* Direction Prepositions */}
                    <div className="manage-types__field">
                      <label className="manage-types__field-label">Arrow Labels
                        <span className="manage-types__field-hint">One word per direction — paired with the verb to form readable labels</span>
                      </label>
                      <div className="manage-types__prepositions">
                        {([
                          { dir: 'forward', arrow: '→', placeholder: 'from' },
                          { dir: 'reverse', arrow: '←', placeholder: 'to' },
                          { dir: 'both',    arrow: '↔', placeholder: 'together' },
                        ] as const).map(({ dir, arrow, placeholder }) => {
                          const preps = (selected as ConnectionTypeData).direction_prepositions || { forward: 'from', reverse: 'to', both: 'together' };
                          return (
                            <div key={dir} className="manage-types__prep-row">
                              <span
                                className="manage-types__prep-arrow"
                                style={{ color: currentColor }}
                              >{arrow}</span>
                              <input
                                type="text"
                                className="manage-types__prep-input"
                                placeholder={placeholder}
                                value={preps[dir] ?? placeholder}
                                onChange={(e) => {
                                  // Strip spaces — single word only
                                  const word = e.target.value.replace(/\s+/g, '');
                                  handleUpdateField('direction_prepositions', {
                                    ...preps,
                                    [dir]: word,
                                  });
                                }}
                                onBlur={(e) => {
                                  // On blur, fall back to the default if empty
                                  if (!e.target.value.trim()) {
                                    handleUpdateField('direction_prepositions', {
                                      ...preps,
                                      [dir]: placeholder,
                                    });
                                  }
                                }}
                                maxLength={24}
                              />
                            </div>
                          );
                        })}
                        {/* Fixed: neither/none = 'related' */}
                        <div className="manage-types__prep-row manage-types__prep-row--fixed">
                          <span className="manage-types__prep-arrow" style={{ opacity: 0.35 }}>—</span>
                          <span className="manage-types__prep-fixed">related</span>
                        </div>
                      </div>
                    </div>


                    {/* Direction Filter */}
                    <div className="manage-types__field">
                      <label className="manage-types__field-label">Direction Filter
                        <span className="manage-types__field-hint">Which directions show on the board by default</span>
                      </label>
                      <div className="manage-types__dir-filter">
                        {(['all', 'forward', 'reverse', 'both', 'none'] as const).map(dir => (
                          <button
                            key={dir}
                            type="button"
                            className={`manage-types__dir-btn ${
                              ((selected as ConnectionTypeData).direction_filter || 'all') === dir
                                ? 'manage-types__dir-btn--active'
                                : ''
                            }`}
                            style={{
                              '--dir-color': currentColor,
                            } as React.CSSProperties}
                            onClick={() => handleUpdateField('direction_filter', dir)}
                          >
                            {dir === 'all' ? 'All'
                              : dir === 'forward' ? '→'
                              : dir === 'reverse' ? '←'
                              : dir === 'both' ? '↔'
                              : '⊘'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stage Labels */}
                    <div className="manage-types__field">
                      <label className="manage-types__field-label">Position System
                        <span className="manage-types__field-hint">How connections of this type are plotted on the board</span>
                      </label>
                      <div className="manage-types__mode-selector">
                        {(['spectrum', 'quadrant', 'none'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            className={`manage-types__mode-btn ${
                              ((selected as ConnectionTypeData).measurement_mode || 'spectrum') === mode
                                ? 'manage-types__mode-btn--active'
                                : ''
                            }`}
                            style={{
                              '--mode-color': currentColor,
                            } as React.CSSProperties}
                            onClick={() => handleUpdateField('measurement_mode', mode)}
                          >
                            {mode === 'spectrum' ? 'Spectrum (1D)'
                              : mode === 'quadrant' ? 'Quadrant (2D)'
                              : 'Unranked'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* X-axis Stage Labels — shown for spectrum or quadrant */}
                    {((selected as ConnectionTypeData).measurement_mode || 'spectrum') !== 'none' && (
                      <div className="manage-types__field">
                        <label className="manage-types__field-label">
                          {((selected as ConnectionTypeData).measurement_mode || 'spectrum') === 'quadrant' ? 'X-Axis Labels' : 'Stage Labels'}
                        </label>
                        <SpectrumEditor
                          labels={normalizeStageLabels((selected as ConnectionTypeData).x_stage_labels)}
                          color={currentColor}
                          onChange={(labels) => handleUpdateField('x_stage_labels', labels)}
                        />
                      </div>
                    )}

                    {/* Y-axis Stage Labels — shown only for quadrant */}
                    {(selected as ConnectionTypeData).measurement_mode === 'quadrant' && (
                      <div className="manage-types__field">
                        <label className="manage-types__field-label">Y-Axis Labels</label>
                        <SpectrumEditor
                          labels={normalizeStageLabels((selected as ConnectionTypeData).y_stage_labels)}
                          color={currentColor}
                          onChange={(labels) => handleUpdateField('y_stage_labels', labels)}
                        />
                      </div>
                    )}
                  </>
                )}

                {/* Properties Schema */}
                <div className="manage-types__field">
                  <div className="manage-types__field-header">
                    <label className="manage-types__field-label">Properties</label>
                    <button className="manage-types__add-prop-btn" onClick={addProperty}>
                      <Plus size={12} />
                      <span>Add Property</span>
                    </button>
                  </div>

                  <div className="manage-types__props-table">
                    <div className="manage-types__props-header">
                      <span>Name</span>
                      <span>Type</span>
                      <span>Card Row</span>
                      <span></span>
                    </div>
                    {((selected as any).properties_schema || []).map((prop: PropertySchema, i: number) => (
                      <div key={i} className="manage-types__props-row">
                        <input
                          type="text"
                          className="manage-types__prop-input"
                          value={prop.name}
                          onChange={(e) => updateProperty(i, { name: e.target.value })}
                        />
                        <select
                          className="manage-types__prop-select"
                          value={prop.type}
                          onChange={(e) => updateProperty(i, { type: e.target.value as PropertySchema['type'] })}
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="select">Select</option>
                          <option value="date">Date</option>
                          <option value="markdown">Markdown</option>
                          <option value="url">URL</option>
                          <option value="tags">Tags</option>
                        </select>
                        <select
                          className="manage-types__prop-select"
                          value={prop.card_row || ''}
                          onChange={(e) => updateProperty(i, { card_row: e.target.value ? parseInt(e.target.value) : undefined })}
                        >
                          <option value="">Hidden</option>
                          <option value="1">Row 1</option>
                          <option value="2">Row 2</option>
                        </select>
                        <button
                          className="manage-types__prop-delete"
                          onClick={() => removeProperty(i)}
                          title="Remove property"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {((selected as any).properties_schema || []).length === 0 && (
                      <div className="manage-types__props-empty">
                        No properties defined. Click "Add Property" to create one.
                      </div>
                    )}
                  </div>

                  <p className="manage-types__props-hint">
                    Common properties (Title, Scale, Description) are built-in and always available.
                  </p>
                </div>
              </>
            ) : (
              <div className="manage-types__empty">
                <p>Select a type from the sidebar, or create a new one.</p>
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
