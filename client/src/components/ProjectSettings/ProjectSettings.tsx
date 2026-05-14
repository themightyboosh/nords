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
import { X, AlertTriangle, Save } from 'lucide-react';
import { api } from '../../api/client';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import './ProjectSettings.css';

interface ProjectSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  /** Called after save so the header can update */
  onProjectNameChange?: (name: string) => void;
}

interface ProjectData {
  id: string;
  name: string;
  description: string | null;
  purpose: string | null;
  icon: string | null;
  mcp_enabled: boolean;
  mcp_capture_data: boolean;
  mcp_mutable: boolean;
  mcp_system_prompt: string | null;
  default_persona_id: string | null;
  default_start_nord_id: string | null;
}

interface PersonaSummary {
  id: string;
  name: string;
}

interface NordSummary {
  id: string;
  title: string;
  type_id: string;
}

interface NordTypeSummary {
  id: string;
  name: string;
  icon: string;
}

export function ProjectSettings({ isOpen, onClose, projectId, onProjectNameChange }: ProjectSettingsProps) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [form, setForm] = useState<Partial<ProjectData>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Reference data for dropdowns
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [nords, setNords] = useState<NordSummary[]>([]);
  const [nordTypes, setNordTypes] = useState<NordTypeSummary[]>([]);
  const [selectedCategoryForNord, setSelectedCategoryForNord] = useState<string>('');

  // Load project data + reference data for dropdowns
  useEffect(() => {
    if (!isOpen || !projectId) return;

    // Load project
    api.get<ProjectData>(`/api/projects/${projectId}`)
      .then(data => {
        setProject(data);
        setForm({
          name: data.name,
          description: data.description || '',
          purpose: data.purpose || '',
          icon: data.icon || '📁',
          mcp_enabled: data.mcp_enabled,
          mcp_capture_data: data.mcp_capture_data,
          mcp_mutable: data.mcp_mutable,
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
  }, [isOpen, projectId]);

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
      const updated = await api.put<ProjectData>(`/api/projects/${projectId}`, {
        name: form.name!.trim(),
        description: form.description!.trim(),
        purpose: form.purpose!.trim(),
        icon: form.icon,
        mcp_enabled: form.mcp_enabled,
        mcp_capture_data: form.mcp_capture_data,
        mcp_mutable: form.mcp_mutable,
        mcp_system_prompt: form.mcp_system_prompt?.trim() || null,
        default_persona_id: form.default_persona_id || null,
        default_start_nord_id: form.default_start_nord_id || null,
      });
      setProject(updated);
      onProjectNameChange?.(updated.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setErrors([err.message || 'Failed to save']);
    } finally {
      setSaving(false);
    }
  }, [form, projectId, onProjectNameChange]);

  if (!isOpen) return null;

  return (
    <FloatingPanel variant="modal" isOpen={isOpen} onClose={onClose} width="520px">
      <div className="nords-project-settings">
        {/* Header */}
        <div className="nords-project-settings__header">
          <div>
            <h2 className="nords-project-settings__title">Project Settings</h2>
            <p className="nords-project-settings__subtitle">Configure project details and integrations.</p>
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
            <input
              className="nords-form__input"
              value={form.name || ''}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Project name"
            />
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

          <div className="nords-form__divider" />

          {/* ── Default Persona ── */}
          {personas.length > 0 && (
            <div className="nords-form__field">
              <label className="nords-form__label">Default Persona</label>
              <select
                className="nords-form__select"
                value={form.default_persona_id || ''}
                onChange={e => setForm({ ...form, default_persona_id: e.target.value || null })}
              >
                <option value="">— None —</option>
                {personas.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* ── Default Start Nord (Category → Nord cascade) ── */}
          {nordTypes.length > 0 && nords.length > 0 && (
            <div className="nords-form__cascade-group">
              <span className="nords-form__cascade-title">Default Start Nord</span>
              <div className="nords-form__cascade-row">
                <div className="nords-form__field">
                  <label className="nords-form__label">Nord Type</label>
                  <select
                    className="nords-form__select"
                    value={selectedCategoryForNord}
                    onChange={e => {
                      setSelectedCategoryForNord(e.target.value);
                      setForm({ ...form, default_start_nord_id: null });
                    }}
                  >
                    <option value="">— Select type —</option>
                    {nordTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="nords-form__field">
                  <label className="nords-form__label">Nord</label>
                  <select
                    className="nords-form__select"
                    value={form.default_start_nord_id || ''}
                    onChange={e => setForm({ ...form, default_start_nord_id: e.target.value || null })}
                    disabled={!selectedCategoryForNord || filteredNords.length === 0}
                  >
                    <option value="">— Select nord —</option>
                    {filteredNords.map(n => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="nords-form__divider" />

          {/* ── MCP Toggles ── */}
          <label className="nords-form__checkbox">
            <input
              type="checkbox"
              checked={form.mcp_enabled || false}
              onChange={e => setForm({ ...form, mcp_enabled: e.target.checked, ...(!e.target.checked ? { mcp_capture_data: false, mcp_mutable: false } : {}) })}
            />
            <span>Enable MCP (Model Context Protocol)</span>
          </label>

          {form.mcp_enabled && (
            <div className="nords-form__indent">
              <label className="nords-form__checkbox">
                <input
                  type="checkbox"
                  checked={form.mcp_capture_data || false}
                  onChange={e => setForm({ ...form, mcp_capture_data: e.target.checked })}
                />
                <span>Capture Data</span>
              </label>
              <label className="nords-form__checkbox">
                <input
                  type="checkbox"
                  checked={form.mcp_mutable || false}
                  onChange={e => setForm({ ...form, mcp_mutable: e.target.checked })}
                />
                <span>Mutable <span className="nords-form__experimental">(experimental)</span></span>
              </label>

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
                  placeholder="Define the AI agent's behavior, business logic, and workflow rules. Schema context and persona are injected automatically."
                  rows={10}
                />
                <span className="nords-form__hint">
                  💡 NordType schemas, persona context, and graph data are injected automatically — write business logic only.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="nords-form__footer">
          {saved && <span className="nords-form__saved">✓ Saved</span>}
          <button className="nords-form__btn nords-form__btn--secondary" onClick={onClose}>Cancel</button>
          <button className="nords-form__btn nords-form__btn--primary" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
