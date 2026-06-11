/**
 * ProjectSettings.tsx — Project-level settings panel
 *
 * Uses FloatingPanel (modal variant) with shared nords-form__* classes
 * to match the design language of ManageTypes and ManagePersonas.
 *
 * Allows editing:
 *   - Name, Description, Purpose (mandatory)
 *   - MCP toggles (Enable, Capture Data, Mutable)
 *   - Default Persona (dropdown, if personas exist)
 *   - Default Start Nord (category → nord cascading dropdown)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, AlertTriangle, Save, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../../api/client';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import { IconPicker } from '../shared/IconPicker';
import { resolveIcon } from '../../utils/iconRegistry';
import { HueSlider } from '../shared/HueSlider';
import { CustomSelect } from '../shared/CustomSelect';
import type { CustomSelectOption } from '../shared/CustomSelect';
import './ProjectSettings.css';

interface ProjectSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  mode?: 'create' | 'edit';
  /** Called after save so the header can update */
  onProjectNameChange?: (name: string) => void;
  /** Called after a successful create */
  onCreate?: () => void;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  icon: string | null;
  accent_color: string | null;

  mcp_capture_data: boolean;
  mcp_mutable: boolean;
  goals_enabled: boolean;
  graph_only: boolean;
  project_mode: 'explore' | 'collect' | 'guided';
  mcp_system_prompt: string | null;
  default_persona_id: string | null;
  default_start_nord_id: string | null;
  default_end_nord_id: string | null;
}

interface PersonaSummary {
  id: string;
  name: string;
  accent_color?: string | null;
}

interface NordSummary {
  id: string;
  title: string;
  type_id: string;
  accent_color?: string | null;
}

interface NordTypeSummary {
  id: string;
  name: string;
  icon: string;
  accent_color?: string | null;
}

export function ProjectSettings({ isOpen, onClose, projectId, mode = 'edit', onProjectNameChange, onCreate }: ProjectSettingsProps) {
  const isCreate = mode === 'create';
  const [_project, setProject] = useState<ProjectData | null>(null);
  const [form, setForm] = useState<Partial<ProjectData>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reference data for dropdowns
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [nords, setNords] = useState<NordSummary[]>([]);
  const [nordTypes, setNordTypes] = useState<NordTypeSummary[]>([]);
  const [selectedCategoryForNord, setSelectedCategoryForNord] = useState<string>('');
  const [showIconPicker, setShowIconPicker] = useState(false);



  // Load project data + reference data for dropdowns
  useEffect(() => {
    if (!isOpen || !projectId || isCreate) return;

    // Load project
    api.get<ProjectData>(`/api/projects/${projectId}`)
      .then(data => {
        setProject(data);
        setForm({
          name: data.name,
          description: data.description || '',
          purpose: data.purpose || '',
          icon: data.icon || 'Folder',
          accent_color: data.accent_color || '#6b7aed',

          mcp_capture_data: data.mcp_capture_data,
          mcp_mutable: data.mcp_mutable,
          goals_enabled: (data as any).goals_enabled ?? false,
          graph_only: data.graph_only ?? false,
          project_mode: data.project_mode || 'explore',
          mcp_system_prompt: data.mcp_system_prompt || '',
          default_persona_id: data.default_persona_id,
          default_start_nord_id: data.default_start_nord_id,
        });
      })
      .catch(err => console.error('Failed to load project:', err));

    // Load personas
    api.get<PersonaSummary[]>(`/api/projects/${projectId}/personas`)
      .then(data => setPersonas(data))
      .catch(() => setPersonas([]));

    // Load graph (nords + types)
    api.get<{ nords: NordSummary[]; nord_types: NordTypeSummary[] }>(`/api/projects/${projectId}/graph`)
      .then(data => {
        setNords(data.nords || []);
        setNordTypes(data.nord_types || []);
      })
      .catch(() => { setNords([]); setNordTypes([]); });
  }, [isOpen, projectId, isCreate]);

  // When project data loads, set the category filter to match the current default nord
  useEffect(() => {
    if (form.default_start_nord_id && nords.length > 0) {
      const currentNord = nords.find(n => n.id === form.default_start_nord_id);
      if (currentNord) {
        setSelectedCategoryForNord(currentNord.type_id);
      }
    }
  }, [form.default_start_nord_id, nords]);



  // Nords filtered by the selected category
  const filteredNords = useMemo(() => {
    if (!selectedCategoryForNord) return [];
    return nords.filter(n => n.type_id === selectedCategoryForNord);
  }, [nords, selectedCategoryForNord]);



  const handleSave = useCallback(async () => {
    const errs: string[] = [];
    if (!form.name?.trim()) errs.push('Name is required');
    if (!form.description?.trim()) errs.push('Description is required');
    if (!form.purpose?.trim()) errs.push('Purpose is required');
    if (errs.length > 0) { setErrors(errs); return; }

    setSaving(true);
    setErrors([]);
    try {
      if (isCreate) {
        // Create mode: POST new project
        await api.post('/api/projects', {
          name: form.name!.trim(),
          description: form.description!.trim(),
          purpose: form.purpose!.trim(),
          icon: form.icon || 'Folder',
          accent_color: form.accent_color || '#6b7aed',
          project_mode: 'guided',
          graph_only: form.graph_only || false,
        });
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          onCreate?.();
          onClose();
        }, 400);
      } else {
        // Edit mode: PUT existing project
        const updated = await api.put<ProjectData>(`/api/projects/${projectId}`, {
          name: form.name!.trim(),
          description: form.description!.trim(),
          purpose: form.purpose!.trim(),
          icon: form.icon,
          accent_color: form.accent_color,
          project_mode: form.project_mode,
          mcp_mutable: form.mcp_mutable,
          graph_only: form.graph_only,
          mcp_system_prompt: form.mcp_system_prompt?.trim() || null,
          default_persona_id: form.default_persona_id || null,
          default_start_nord_id: form.default_start_nord_id || null,
          default_end_nord_id: form.default_end_nord_id || null,
        });
        setProject(updated);
        onProjectNameChange?.(updated.name);
        setSaved(true);
        setTimeout(() => {
          setSaved(false);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrors([err.message || 'Failed to save']);
    } finally {
      setSaving(false);
    }
  }, [form, projectId, isCreate, onProjectNameChange, onCreate]);

  if (!isOpen) return null;

  return (
    <FloatingPanel variant="modal" isOpen={isOpen} onClose={onClose} width="520px">
      <div className="nords-project-settings">
        {/* Header */}
        <div className="nords-project-settings__header">
          <div>
            <h2 className="nords-project-settings__title nords-panel-title"><SettingsIcon size={18} strokeWidth={1.6} />{isCreate ? 'New Project' : 'Project Settings'}</h2>
            <p className="nords-project-settings__subtitle">{isCreate ? 'Create a new project workspace.' : 'Configure project details and integrations.'}</p>
          </div>
          <button className="nords-project-settings__close" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="nords-project-settings__body">
          {errors.length > 0 && (
            <div className="nords-form__errors">
              {errors.map((e, i) => <div key={i} className="nords-form__error"><AlertTriangle size={12} /> {e}</div>)}
            </div>
          )}

          <div className="nords-form__field">
            <label className="nords-form__label">
              Name <span className="nords-form__required">*</span>
            </label>
            <div className="nords-form__icon-name-row">
              {(() => {
                const ProjectIcon = resolveIcon(form.icon || 'Folder');
                return (
                  <button
                    type="button"
                    className="nords-form__icon-btn"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    title="Change project icon"
                    data-testid="project-icon-btn"
                  >
                    <ProjectIcon size={20} strokeWidth={1.6} style={{ color: form.accent_color || '#6b7aed' }} />
                  </button>
                );
              })()}
              <input
                className="nords-form__input"
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Project name"
              />
            </div>
            {showIconPicker && (
              <div style={{ marginTop: '8px' }}>
                <IconPicker
                  currentIcon={form.icon || 'Folder'}
                  accentColor={form.accent_color || '#6b7aed'}
                  onSelect={(iconName) => {
                    setForm({ ...form, icon: iconName });
                    setShowIconPicker(false);
                  }}
                />
                <div style={{ marginTop: '12px', padding: '0 8px' }}>
                  <label className="nords-form__label" style={{ marginBottom: '6px' }}>Color</label>
                  <HueSlider
                    color={form.accent_color || '#6b7aed'}
                    onChange={(hex) => setForm({ ...form, accent_color: hex })}
                    saturation={55}
                    lightness={50}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="nords-form__field">
            <label className="nords-form__label">
              Description <span className="nords-form__required">*</span>
            </label>
            <textarea
              className="nords-form__textarea"
              value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the project"
              rows={3}
            />
          </div>

          <div className="nords-form__field">
            <label className="nords-form__label">
              Purpose <span className="nords-form__required">*</span>
            </label>
            <textarea
              className="nords-form__textarea"
              value={form.purpose || ''}
              onChange={e => setForm({ ...form, purpose: e.target.value })}
              placeholder="Define the project's purpose"
              rows={2}
            />
          </div>

          {/* ── Settings-only sections (hidden in create mode) ── */}
          {!isCreate && (
          <>
          <div className="nords-form__divider" />

          {/* ── Default Persona ── */}
          <div className="nords-form__field">
            <label className="nords-form__label">Default Persona</label>
            <CustomSelect
              options={[
                { value: '', label: personas.length === 0 ? 'No personas defined' : '— None —' },
                ...personas.map(p => ({
                  value: p.id,
                  label: p.name,
                  color: p.accent_color,
                })),
              ]}
              value={form.default_persona_id || ''}
              onChange={v => setForm({ ...form, default_persona_id: v || null })}
              disabled={personas.length === 0}
              placeholder={personas.length === 0 ? 'No personas defined' : '— None —'}
            />
          </div>

          {/* ── Default Start Nord (Category → Nord cascade) ── */}
          <div className={`nords-form__cascade-group${nordTypes.length === 0 ? ' nords-form__cascade-group--disabled' : ''}`}>
            <span className="nords-form__cascade-title">Default Start Nord</span>
            {nordTypes.length === 0 ? (
              <span className="nords-form__hint">No nords defined in this project yet.</span>
            ) : (
              <div className="nords-form__cascade-row">
                <div className="nords-form__field">
                  <label className="nords-form__label">Nord Type</label>
                  <CustomSelect
                    options={[
                      { value: '', label: '— None —' },
                      ...nordTypes.map(t => ({
                        value: t.id,
                        label: t.name,
                        color: t.accent_color,
                        icon: resolveIcon(t.icon),
                      })),
                    ]}
                    value={selectedCategoryForNord}
                    onChange={v => {
                      setSelectedCategoryForNord(v);
                      setForm({ ...form, default_start_nord_id: null });
                    }}
                  />
                </div>
                <div className="nords-form__field">
                  <label className="nords-form__label">Nord</label>
                  <CustomSelect
                    options={[
                      { value: '', label: '— None —' },
                      ...filteredNords.map(n => ({
                        value: n.id,
                        label: n.title,
                      })),
                    ]}
                    value={form.default_start_nord_id || ''}
                    onChange={v => setForm({ ...form, default_start_nord_id: v || null })}
                    disabled={!selectedCategoryForNord || filteredNords.length === 0}
                  />
                </div>
              </div>
            )}
          </div>


          <div className="nords-form__divider" />

          {/* ── Agent Settings ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Graph Only Toggle */}
              <label className="nords-form__checkbox">
                <input
                  type="checkbox"
                  checked={form.graph_only || false}
                  onChange={e => setForm({ ...form, graph_only: e.target.checked })}
                />
                <span>Graph Only</span>
              </label>
              <span className="nords-form__hint" style={{ marginLeft: '24px', marginTop: '-4px', display: 'block', marginBottom: '12px' }}>
                {form.graph_only
                  ? 'No variables or goals — the agent explores the graph only.'
                  : 'Mode is auto-detected: add variables for data collection, add goals for guided sessions.'}
              </span>

              <div className="nords-form__field" style={{ marginTop: '12px' }}>
                <label className="nords-form__label">
                  System Prompt
                  <span className="nords-form__char-count">
                    {(form.mcp_system_prompt || '').length.toLocaleString()} / 50,000
                  </span>
                </label>
                <textarea
                  className="nords-form__textarea nords-form__textarea--mono"
                  value={form.mcp_system_prompt || ''}
                  onChange={e => setForm({ ...form, mcp_system_prompt: e.target.value })}
                  placeholder={`Define the AI agent's behavior, business logic, and workflow rules.\n\nSuggested sections:\n## BUSINESS LOGIC\nDescribe the workflow rules, decision trees, and domain context.\n\n## CAPABILITIES\nDescribe external tools the AI has access to (e.g., charts, email, CRM).\nExample: "You can generate charts using the chart_create tool."\n\n## GUARDRAILS\nSet boundaries: what the AI should NOT do or say.`}
                  rows={10}
                />
                <span className="nords-form__hint">
                  💡 NordType schemas, persona context, Start/End Nord, and graph data are injected automatically.
                  Use a <code>## CAPABILITIES</code> section to describe external tools (charts, email, CRM, etc.).
                </span>
              </div>
            </div>
          </>
          )}
        </div>

        {/* Footer */}
        <div className="nords-form__footer">
          {saved && <span className="nords-form__saved">✓ Saved</span>}
          <button className="nords-form__btn nords-form__btn--secondary" onClick={onClose}>Cancel</button>
          <button className="nords-form__btn nords-form__btn--primary" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? (isCreate ? 'Creating…' : 'Saving…') : (isCreate ? 'Create Project' : 'Save')}
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
