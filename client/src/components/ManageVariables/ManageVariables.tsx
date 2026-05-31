/**
 * ManageVariables — CRUD panel for project-level variables (Collections).
 *
 * Restructured to match the ManageTypes/Categories pattern:
 * Groups on the left sidebar, properties (variables) in the right editor.
 *
 * ┌──────────────────────────────────────────────────────────┐
 * │ Collections                                          [X]  │
 * │ Global data points collected by the AI during sessions.    │
 * ├────────────┬─────────────────────────────────────────────┤
 * │ GROUPS     │  ☐ General                    GROUP          │
 * │            │  Name: [editable]  Icon: [picker]            │
 * │ ☐ General> │  Properties         [+ Add Property]        │
 * │ ☐ Contact> │  ┌───────────────────────────────────┐      │
 * │ + New Group│  │ Name │ Type │ Req │ Actions        │      │
 * │            │  └───────────────────────────────────┘      │
 * └────────────┴─────────────────────────────────────────────┘
 *
 * Groups are organizational containers; variables belong to groups.
 * Property names must be unique across ALL groups (enforced by DB).
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useVariables, type ProjectVariable } from '../../hooks/useVariables';
import { useCollectionGroups, type CollectionGroup } from '../../hooks/useCollectionGroups';
import { ColorIcon } from '../shared/ColorIcon';
import { IconPicker } from '../shared/IconPicker';
import { HueSlider } from '../shared/HueSlider';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import {
  needsOptions as checkNeedsOptions,
  normalizePropertyType, type PropertyType,
} from '@nords/shared/propertyTypes';
import { PropertyTable } from '../shared/PropertyTable';
import { useUIStrings } from '../../hooks/useUIStrings';
import './ManageVariables.css';

// ── Types ──

interface ManageVariablesProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

// ── Main Component ──

export function ManageVariables({ projectId, open, onClose }: ManageVariablesProps) {
  const {
    variables, createVariable, updateVariable, deleteVariable, reorderVariables,
  } = useVariables(projectId);
  const {
    groups, createGroup, updateGroup, deleteGroup, refetch: refetchGroups,
  } = useCollectionGroups(projectId);

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { strings: UI_STRINGS } = useUIStrings();
  const [expandedVarId, setExpandedVarId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [draftGroupName, setDraftGroupName] = useState('');
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupNameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-select first group on load
  useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Selected group
  const selectedGroup = useMemo(() =>
    groups.find(g => g.id === selectedGroupId),
    [groups, selectedGroupId]
  );

  // Variables in the selected group
  const groupVariables = useMemo(() => {
    if (!selectedGroupId) return [];
    return variables.filter(v => v.collection_group_id === selectedGroupId);
  }, [variables, selectedGroupId]);

  // Sync draft group name when selection changes
  useEffect(() => {
    setDraftGroupName(selectedGroup?.name ?? '');
    setShowIconPicker(false);
  }, [selectedGroup?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Group mutations ──

  const handleCreateGroup = async () => {
    const g = await createGroup({ name: 'New Group' });
    if (g) setSelectedGroupId(g.id);
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroupId) return;
    await deleteGroup(selectedGroupId);
    setSelectedGroupId(groups.find(g => g.id !== selectedGroupId)?.id || null);
  };

  const handleGroupNameChange = (value: string) => {
    setDraftGroupName(value);
    if (groupNameTimerRef.current) clearTimeout(groupNameTimerRef.current);
    groupNameTimerRef.current = setTimeout(() => {
      if (selectedGroupId) updateGroup(selectedGroupId, { name: value });
    }, 400);
  };

  const handleGroupColorChange = (color: string) => {
    if (selectedGroupId) updateGroup(selectedGroupId, { accent_color: color });
  };

  // ── Variable mutations ──

  const handleCreateVariable = async () => {
    if (!selectedGroupId) return;
    const v = await createVariable({
      name: 'New Collection',
      type: 'short_text' as any,
      collection_group_id: selectedGroupId,
    });
    if (v) setExpandedVarId(v.id);
  };

  const handleDeleteVariable = async (id: string) => {
    await deleteVariable(id);
    if (expandedVarId === id) setExpandedVarId(null);
  };

  const handleReorder = useCallback((fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= groupVariables.length) return;
    const ids = groupVariables.map(v => v.id);
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    reorderVariables(ids);
  }, [groupVariables, reorderVariables]);

  // Debounced name update
  const handleNameChange = (id: string, value: string) => {
    setDraftNames(prev => ({ ...prev, [id]: value }));
    if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
    nameTimerRef.current = setTimeout(() => {
      updateVariable(id, { name: value });
    }, 400);
  };

  const getName = (v: ProjectVariable) =>
    draftNames[v.id] !== undefined ? draftNames[v.id] : v.name;

  if (!open) return null;

  const currentColor = selectedGroup?.accent_color || '#a78bfa';

  return (
    <FloatingPanel variant="modal" isOpen={open} onClose={onClose} width="min(900px, 90vw)">
      <div className="manage-variables manage-variables--grouped" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="manage-variables__header">
          <div>
            <h2 className="manage-variables__title">{UI_STRINGS.collections.title}</h2>
            <p className="manage-variables__subtitle">{UI_STRINGS.collections.subtitle}</p>
          </div>
          <button className="manage-variables__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="manage-variables__body">

          {/* ── Sidebar — Group List ── */}
          <div className="manage-variables__sidebar">
            <div className="manage-variables__list">
              {groups.map(g => (
                <button
                  key={g.id}
                  className={`manage-variables__list-item ${g.id === selectedGroupId ? 'manage-variables__list-item--selected' : ''}`}
                  onClick={() => setSelectedGroupId(g.id)}
                >
                  <ColorIcon
                    icon={g.icon || 'Layers'}
                    color={g.accent_color || '#a78bfa'}
                    size={14}
                  />
                  <span className="manage-variables__list-name">{g.name}</span>
                  <span className="manage-variables__list-count">{g.variables?.length || 0}</span>
                  <ChevronRight size={12} className="manage-variables__list-chevron" />
                </button>
              ))}
            </div>

            <button
              className="manage-variables__new-btn"
              onClick={handleCreateGroup}
            >
              <Plus size={14} />
              <span>New Collection</span>
            </button>
          </div>

          {/* ── Editor — Group Detail + Variables ── */}
          <div className="manage-variables__editor">
            {selectedGroup ? (
              <>
                {/* Group header — clickable icon + name */}
                <div className="manage-variables__editor-header">
                  <button
                    className="manage-variables__icon-picker-btn"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    title="Change icon & color"
                  >
                    <ColorIcon
                      icon={selectedGroup.icon || 'Layers'}
                      color={currentColor}
                      size={24}
                      strokeWidth={1.8}
                    />
                  </button>
                  <input
                    type="text"
                    className="manage-variables__name-input"
                    value={draftGroupName}
                    onChange={e => handleGroupNameChange(e.target.value)}
                    placeholder="Group name"
                  />
                  <button
                    className="manage-variables__delete-type-btn"
                    onClick={handleDeleteGroup}
                    title="Delete group"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Icon & color picker popover */}
                {showIconPicker && (
                  <div className="manage-variables__icon-picker-popover">
                    <IconPicker
                      currentIcon={selectedGroup.icon || 'Layers'}
                      accentColor={currentColor}
                      onSelect={(iconName) => {
                        updateGroup(selectedGroup.id, { icon: iconName });
                        setShowIconPicker(false);
                      }}
                    />
                    <div className="manage-variables__popover-color">
                      <label className="manage-variables__popover-color-label">Color</label>
                      <HueSlider
                        color={currentColor}
                        onChange={(hex) => handleGroupColorChange(hex)}
                        saturation={55}
                        lightness={50}
                      />
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="manage-variables__group-desc">
                  <label className="manage-variables__desc-label">
                    Description<span className="required-dot">*</span>
                  </label>
                  <textarea
                    className="manage-variables__group-desc-textarea"
                    value={selectedGroup.description || ''}
                    onChange={e => updateGroup(selectedGroup.id, { description: e.target.value })}
                    placeholder="Group description (shown to the AI)"
                    rows={2}
                  />
                </div>

                {/* Properties — shared PropertyTable (no HIDE column for collections) */}
                <PropertyTable
                  items={groupVariables.map(v => ({
                    id: v.id,
                    name: getName(v),
                    type: v.type,
                    required: v.required,
                    data: v,
                  }))}
                  showHide={false}
                  expandedId={expandedVarId}
                  onExpandToggle={setExpandedVarId}
                  onNameChange={handleNameChange}
                  onTypeChange={(id, type) => updateVariable(id, { type: type as any })}
                  onRequiredChange={(id, req) => updateVariable(id, { required: req })}
                  onReorder={handleReorder}
                  onDelete={handleDeleteVariable}
                  onAdd={handleCreateVariable}
                  renderDetail={(item) => (
                    <VariableDetail
                      variable={item.data as ProjectVariable}
                      onUpdate={updateVariable}
                    />
                  )}
                />
              </>
            ) : (
              <div className="manage-variables__empty-editor">
                {groups.length === 0
                  ? UI_STRINGS.collections.emptyGroups
                  : UI_STRINGS.collections.emptyEditor}
              </div>
            )}
          </div>
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Expanded Detail Panel ──

function VariableDetail({
  variable,
  onUpdate,
}: {
  variable: ProjectVariable;
  onUpdate: (id: string, fields: Record<string, unknown>) => Promise<unknown>;
}) {
  const [description, setDescription] = useState(variable.description || '');
  const [hint, setHint] = useState(variable.hint || '');
  const [tagInput, setTagInput] = useState('');

  const handleBlur = useCallback((field: string, value: unknown) => {
    onUpdate(variable.id, { [field]: value });
  }, [variable.id, onUpdate]);

  const showOptions = checkNeedsOptions(normalizePropertyType(variable.type));

  return (
    <div className="manage-variables__detail">
      {/* Options (for select / multi_select) */}
      {showOptions && (
        <div className="manage-variables__detail-field">
          <label className="manage-variables__detail-label">Options</label>
          <OptionsEditor
            options={(variable.options as string[]) || []}
            onChange={(opts) => onUpdate(variable.id, { options: opts })}
          />
        </div>
      )}

      {/* Description */}
      <div className="manage-variables__detail-field">
        <label className="manage-variables__detail-label">
          Description <span className="manage-types__required-badge">Required</span>
        </label>
        <textarea
          className={`manage-variables__textarea ${!description ? 'manage-variables__textarea--empty' : ''}`}
          value={description}
          onChange={e => setDescription(e.target.value)}
          onBlur={() => handleBlur('description', description)}
          placeholder="What data does this collection capture? This is shown to the AI agent."
          rows={2}
        />
      </div>

      {/* Hint */}
      <div className="manage-variables__detail-field">
        <label className="manage-variables__detail-label">Hint</label>
        <input
          className="manage-variables__input"
          value={hint}
          onChange={e => setHint(e.target.value)}
          onBlur={() => handleBlur('hint', hint)}
          placeholder="AI guidance for how to ask about this variable"
        />
      </div>

      {/* Tags */}
      <div className="manage-variables__detail-field">
        <label className="manage-variables__detail-label">Tags</label>
        <div className="manage-variables__tags">
          {(variable.tags || []).map((tag, idx) => (
            <span key={idx} className="manage-variables__tag">
              {tag}
              <button
                className="manage-variables__tag-remove"
                onClick={() => {
                  const next = variable.tags.filter((_, i) => i !== idx);
                  onUpdate(variable.id, { tags: next });
                }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <input
            className="manage-variables__tag-input"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && tagInput.trim()) {
                const next = [...(variable.tags || []), tagInput.trim()];
                onUpdate(variable.id, { tags: next });
                setTagInput('');
              }
            }}
            placeholder="+ tag"
          />
        </div>
      </div>
    </div>
  );
}

// ── Options Editor (for select / multi_select) ──

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const handleOptionChange = (idx: number, value: string) => {
    const next = [...options];
    next[idx] = value;
    onChange(next);
  };

  const handleRemoveOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  const handleAddOption = () => {
    onChange([...options, '']);
  };

  return (
    <div className="manage-variables__options-list">
      {options.map((opt, idx) => (
        <div key={idx} className="manage-variables__option-row">
          <input
            className="manage-variables__option-input"
            value={opt}
            onChange={e => handleOptionChange(idx, e.target.value)}
            placeholder={`Option ${idx + 1}`}
          />
          <button
            className="manage-variables__option-remove"
            onClick={() => handleRemoveOption(idx)}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
      <button className="manage-variables__add-option-btn" onClick={handleAddOption}>
        <Plus size={12} /> Add Option
      </button>
    </div>
  );
}

export default ManageVariables;
