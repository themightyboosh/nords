/**
 * ProjectSettings.tsx — Project-level settings panel
 *
 * Opened by clicking the project title in ViewportHeader.
 * Allows editing:
 *   - Name, Description, Purpose (mandatory)
 *   - MCP toggles (Enable, Capture Data, Mutable)
 *   - Default Persona (dropdown, if personas exist)
 *   - Default Start Nord (category → nord cascading dropdown, if nords exist)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, AlertTriangle, Save } from 'lucide-react';
import { api } from '../../api/client';
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
    <div className="nords-modal-overlay" onClick={onClose}>
      <div className="nords-modal nords-project-settings" onClick={e => e.stopPropagation()}>
        <div className="nords-modal__header">
          <h2>Project Settings</h2>
          <button className="nords-modal__close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="nords-modal__body">
          {errors.length > 0 && (
            <div className="nords-modal__errors">
              {errors.map((e, i) => <div key={i} className="nords-modal__error"><AlertTriangle size={12} /> {e}</div>)}
            </div>
          )}

          <label className="nords-modal__label">
            Name <span className="nords-modal__required">*</span>
            <input
              className="nords-modal__input"
              value={form.name || ''}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Project name"
            />
          </label>

          <label className="nords-modal__label">
            Description <span className="nords-modal__required">*</span>
            <textarea
              className="nords-modal__textarea"
              value={form.description || ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the project"
              rows={3}
            />
          </label>

          <label className="nords-modal__label">
            Purpose <span className="nords-modal__required">*</span>
            <textarea
              className="nords-modal__textarea"
              value={form.purpose || ''}
              onChange={e => setForm({ ...form, purpose: e.target.value })}
              placeholder="Define the project's purpose"
              rows={2}
            />
          </label>

          <div className="nords-modal__divider" />

          {/* ── Default Persona ── */}
          {personas.length > 0 && (
            <label className="nords-modal__label">
              Default Persona
              <select
                className="nords-modal__select"
                value={form.default_persona_id || ''}
                onChange={e => setForm({ ...form, default_persona_id: e.target.value || null })}
              >
                <option value="">— None —</option>
                {personas.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          )}

          {/* ── Default Start Nord (Category → Nord cascade) ── */}
          {nordTypes.length > 0 && nords.length > 0 && (
            <div className="nords-modal__cascade-group">
              <span className="nords-modal__cascade-title">Default Start Nord</span>
              <div className="nords-modal__cascade-row">
                <label className="nords-modal__label nords-modal__label--half">
                  Nord Type
                  <select
                    className="nords-modal__select"
                    value={selectedCategoryForNord}
                    onChange={e => {
                      setSelectedCategoryForNord(e.target.value);
                      setForm({ ...form, default_start_nord_id: null }); // Reset nord when type changes
                    }}
                  >
                    <option value="">— Select type —</option>
                    {nordTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>
                <label className="nords-modal__label nords-modal__label--half">
                  Nord
                  <select
                    className="nords-modal__select"
                    value={form.default_start_nord_id || ''}
                    onChange={e => setForm({ ...form, default_start_nord_id: e.target.value || null })}
                    disabled={!selectedCategoryForNord || filteredNords.length === 0}
                  >
                    <option value="">— Select nord —</option>
                    {filteredNords.map(n => (
                      <option key={n.id} value={n.id}>{n.title}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          <div className="nords-modal__divider" />

          {/* ── MCP Toggles ── */}
          <label className="nords-modal__checkbox-label">
            <input
              type="checkbox"
              checked={form.mcp_enabled || false}
              onChange={e => setForm({ ...form, mcp_enabled: e.target.checked, ...(!e.target.checked ? { mcp_capture_data: false, mcp_mutable: false } : {}) })}
            />
            <span>Enable MCP (Model Context Protocol)</span>
          </label>

          {form.mcp_enabled && (
            <div className="nords-modal__indent">
              <label className="nords-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={form.mcp_capture_data || false}
                  onChange={e => setForm({ ...form, mcp_capture_data: e.target.checked })}
                />
                <span>Capture Data</span>
              </label>
              <label className="nords-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={form.mcp_mutable || false}
                  onChange={e => setForm({ ...form, mcp_mutable: e.target.checked })}
                />
                <span>Mutable <span className="nords-modal__experimental">(experimental)</span></span>
              </label>
            </div>
          )}
        </div>

        <div className="nords-modal__footer">
          {saved && <span className="nords-project-settings__saved">✓ Saved</span>}
          <button className="nords-modal__btn nords-modal__btn--secondary" onClick={onClose}>Cancel</button>
          <button className="nords-modal__btn nords-modal__btn--primary" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
