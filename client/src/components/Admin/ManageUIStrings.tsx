/**
 * ManageUIStrings.tsx — Admin panel for viewing/editing UI copy.
 *
 * Displays all UI_STRINGS organized by section (types, personas, goals, etc.).
 * Edits are saved via PUT /api/ui-strings and take effect immediately.
 * Strings that differ from defaults are highlighted as "customized".
 */

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, RotateCcw, Save, Check, Type, Users, Target, Layers, Settings, Eye, EyeOff } from 'lucide-react';
import { api } from '../../api/client';
import { useUIStrings } from '../../hooks/useUIStrings';
import { UI_STRINGS_DEFAULTS, type UIStrings, type UIStringsSection } from '@nords/shared/uiStringsDefaults';
import './ManageUIStrings.css';

/** Section metadata for display */
const SECTION_META: Record<UIStringsSection, { label: string; icon: typeof Type; description: string }> = {
  types:       { label: 'Types & Categories',   icon: Layers,   description: 'Admin panel for managing nord types and connection categories.' },
  personas:    { label: 'Personas',             icon: Users,    description: 'AI persona configuration panel copy.' },
  goals:       { label: 'Goals',                icon: Target,   description: 'Goal management panel copy.' },
  collections: { label: 'Collections',          icon: Layers,   description: 'Collection variables panel copy.' },
  settings:    { label: 'Project Settings',     icon: Settings,  description: 'Project settings panel copy.' },
};

export default function ManageUIStrings() {
  const [strings, setStrings] = useState<UIStrings>(UI_STRINGS_DEFAULTS);
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['types']));
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const { debugMode, setDebugMode, refresh: refreshGlobal } = useUIStrings();

  // Load current strings + overrides
  const load = useCallback(async () => {
    try {
      const [stringsData, overridesData] = await Promise.all([
        api.get<UIStrings>('/api/ui-strings'),
        api.get<Record<string, Record<string, string>>>('/api/ui-strings/overrides'),
      ]);
      setStrings(stringsData);
      setOverrides(overridesData);
    } catch {
      // Fall back to defaults
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const startEdit = (section: string, key: string, currentValue: string) => {
    const compositeKey = `${section}.${key}`;
    setEditingKey(compositeKey);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const saveEdit = async (section: string, key: string) => {
    setSaving(true);
    try {
      const updated = await api.put<UIStrings>('/api/ui-strings', {
        [section]: { [key]: editValue },
      });
      setStrings(updated);

      // Check if value matches default — if so, it's no longer an override
      const defaultVal = (UI_STRINGS_DEFAULTS[section as UIStringsSection] as Record<string, string>)[key];
      if (editValue === defaultVal) {
        setOverrides(prev => {
          const next = { ...prev };
          if (next[section]) {
            delete next[section][key];
            if (Object.keys(next[section]).length === 0) delete next[section];
          }
          return next;
        });
      } else {
        setOverrides(prev => ({
          ...prev,
          [section]: { ...(prev[section] || {}), [key]: editValue },
        }));
      }

      setEditingKey(null);
      setSavedKey(`${section}.${key}`);
      setTimeout(() => setSavedKey(null), 1500);
    } catch (err) {
      console.error('Failed to save UI string:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetString = async (section: string, key: string) => {
    const defaultVal = (UI_STRINGS_DEFAULTS[section as UIStringsSection] as Record<string, string>)[key];
    setEditValue(defaultVal);
    setSaving(true);
    try {
      const updated = await api.put<UIStrings>('/api/ui-strings', {
        [section]: { [key]: defaultVal },
      });
      setStrings(updated);
      setOverrides(prev => {
        const next = { ...prev };
        if (next[section]) {
          delete next[section][key];
          if (Object.keys(next[section]).length === 0) delete next[section];
        }
        return next;
      });
      setEditingKey(null);
    } catch (err) {
      console.error('Failed to reset UI string:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    if (!window.confirm('Reset all UI strings to defaults? This cannot be undone.')) return;
    try {
      const updated = await api.post<UIStrings>('/api/ui-strings/reset', {});
      setStrings(updated);
      setOverrides({});
    } catch (err) {
      console.error('Failed to reset all UI strings:', err);
    }
  };

  const totalOverrides = Object.values(overrides).reduce((sum, section) => sum + Object.keys(section).length, 0);

  return (
    <div className="manage-ui-strings" data-testid="manage-ui-strings">
      {/* Header */}
      <div className="manage-ui-strings__header">
        <h2 className="manage-ui-strings__title">
          <Type size={16} strokeWidth={1.5} />
          UI Strings
        </h2>
        <div className="manage-ui-strings__header-actions">
          {totalOverrides > 0 && (
            <span className="manage-ui-strings__override-count">
              {totalOverrides} customized
            </span>
          )}
        </div>
      </div>

      <p className="manage-ui-strings__description">
        Edit user-facing text across admin panels. Changes take effect immediately — no deploy required.
      </p>

      {/* Debug mode toggle */}
      <div className="manage-ui-strings__debug-toggle">
        <button
          className={`manage-ui-strings__debug-btn ${debugMode ? 'is-active' : ''}`}
          onClick={() => setDebugMode(!debugMode)}
          title={debugMode ? 'Hide variable names in UI' : 'Show variable names in UI — replaces text with [[section.key]]'}
        >
          {debugMode ? <EyeOff size={13} /> : <Eye size={13} />}
          <span>{debugMode ? 'Debug mode ON' : 'Show variables in UI'}</span>
        </button>
        {debugMode && (
          <span className="manage-ui-strings__debug-hint">
            All managed text now shows as <code>[[section.key]]</code> in the app
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="manage-ui-strings__sections">
        {(Object.keys(SECTION_META) as UIStringsSection[]).map(section => {
          const meta = SECTION_META[section];
          const sectionStrings = strings[section] as Record<string, string>;
          const sectionDefaults = UI_STRINGS_DEFAULTS[section] as Record<string, string>;
          const sectionOverrides = overrides[section] || {};
          const isExpanded = expandedSections.has(section);
          const SectionIcon = meta.icon;
          const overrideCount = Object.keys(sectionOverrides).length;

          return (
            <div key={section} className="manage-ui-strings__section">
              <button
                className="manage-ui-strings__section-header"
                onClick={() => toggleSection(section)}
              >
                <span className="manage-ui-strings__section-chevron">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <SectionIcon size={14} strokeWidth={1.5} className="manage-ui-strings__section-icon" />
                <span className="manage-ui-strings__section-label">{meta.label}</span>
                <span className="manage-ui-strings__section-count">{Object.keys(sectionStrings).length} strings</span>
                {overrideCount > 0 && (
                  <span className="manage-ui-strings__section-badge">{overrideCount} customized</span>
                )}
              </button>

              {isExpanded && (
                <div className="manage-ui-strings__section-body">
                  <p className="manage-ui-strings__section-desc">{meta.description}</p>
                  <div className="manage-ui-strings__entries">
                    {Object.entries(sectionStrings).map(([key, value]) => {
                      const compositeKey = `${section}.${key}`;
                      const isEditing = editingKey === compositeKey;
                      const isOverridden = key in sectionOverrides;
                      const isSaved = savedKey === compositeKey;
                      const defaultVal = sectionDefaults[key];

                      return (
                        <div
                          key={key}
                          className={`manage-ui-strings__entry ${isOverridden ? 'is-overridden' : ''}`}
                        >
                          <div className="manage-ui-strings__entry-header">
                            <code className="manage-ui-strings__entry-key">{key}</code>
                            {isOverridden && (
                              <span className="manage-ui-strings__entry-badge">customized</span>
                            )}
                            {isSaved && (
                              <span className="manage-ui-strings__entry-saved">
                                <Check size={12} /> saved
                              </span>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="manage-ui-strings__entry-edit">
                              <textarea
                                className="manage-ui-strings__entry-textarea"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                rows={Math.max(2, Math.ceil(editValue.length / 80))}
                                autoFocus
                              />
                              <div className="manage-ui-strings__entry-actions">
                                {isOverridden && (
                                  <button
                                    className="manage-ui-strings__action-btn manage-ui-strings__action-btn--reset"
                                    onClick={() => resetString(section, key)}
                                    title="Reset to default"
                                    disabled={saving}
                                  >
                                    <RotateCcw size={12} /> Default
                                  </button>
                                )}
                                <button
                                  className="manage-ui-strings__action-btn"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="manage-ui-strings__action-btn manage-ui-strings__action-btn--save"
                                  onClick={() => saveEdit(section, key)}
                                  disabled={saving || editValue === value}
                                >
                                  <Save size={12} /> {saving ? 'Saving…' : 'Save'}
                                </button>
                              </div>
                              {isOverridden && (
                                <div className="manage-ui-strings__entry-default">
                                  <span className="manage-ui-strings__default-label">Default:</span>
                                  <span className="manage-ui-strings__default-value">{defaultVal}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className="manage-ui-strings__entry-value"
                              onClick={() => startEdit(section, key, value as string)}
                              title="Click to edit"
                            >
                              {value as string}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
