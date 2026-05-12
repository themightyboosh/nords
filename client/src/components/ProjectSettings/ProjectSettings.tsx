/**
 * ProjectSettings.tsx — Project-level settings panel
 *
 * Opened by clicking the project title in ViewportHeader.
 * Allows editing:
 *   - Name, Description, Purpose (mandatory)
 *   - MCP toggles (Enable, Capture Data, Mutable)
 *   - Default Persona (dropdown)
 *   - Default Start Nord (dropdown)
 */

import { useState, useEffect, useCallback } from 'react';
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

export function ProjectSettings({ isOpen, onClose, projectId, onProjectNameChange }: ProjectSettingsProps) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [form, setForm] = useState<Partial<ProjectData>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load project data
  useEffect(() => {
    if (!isOpen || !projectId) return;
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
        });
      })
      .catch(err => console.error('Failed to load project:', err));
  }, [isOpen, projectId]);

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
