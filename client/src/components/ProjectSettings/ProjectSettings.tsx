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
import { X, AlertTriangle, Save, Copy, Trash2, Plus, Key, Link, ExternalLink, ChevronDown, ChevronUp, Compass, ClipboardList, Target } from 'lucide-react';
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
  accent_color: string | null;
  mcp_enabled: boolean;
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

export function ProjectSettings({ isOpen, onClose, projectId, onProjectNameChange }: ProjectSettingsProps) {
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
  const [selectedCategoryForEndNord, setSelectedCategoryForEndNord] = useState<string>('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Access Tokens
  interface TokenInfo { id: string; label: string; token_prefix: string; scopes: string[]; created_at: string; }
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);

  // Share Links
  interface ShareLinkInfo {
    id: string;
    label: string;
    token: string;
    welcome_message_override: string | null;
    model: string;
    persona_id_override: string | null;
    max_sessions: number | null;
    expires_at: string | null;
    session_count: number;
    created_at: string;
  }
  const [shareLinks, setShareLinks] = useState<ShareLinkInfo[]>([]);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [newLink, setNewLink] = useState({ label: '', welcome_message_override: '', model: 'gemini-2.5-flash', persona_id_override: '', expires_days: '7' });
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);

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
          icon: data.icon || 'Folder',
          accent_color: data.accent_color || '#6b7aed',
          mcp_enabled: data.mcp_enabled,
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
  }, [isOpen, projectId]);

  // When project data loads, set the category filter to match the current default nord
  useEffect(() => {
    if (form.default_start_nord_id && nords.length > 0) {
      const currentNord = nords.find(n => n.id === form.default_start_nord_id);
      if (currentNord) {
        setSelectedCategoryForNord(currentNord.type_id);
      }
    }
    if (form.default_end_nord_id && nords.length > 0) {
      const endNord = nords.find(n => n.id === form.default_end_nord_id);
      if (endNord) {
        setSelectedCategoryForEndNord(endNord.type_id);
      }
    }
  }, [form.default_start_nord_id, form.default_end_nord_id, nords]);

  // Load access tokens
  useEffect(() => {
    if (!isOpen || !projectId) return;
    api.get<TokenInfo[]>(`/api/projects/${projectId}/tokens`)
      .then(setTokens)
      .catch(() => setTokens([]));
  }, [isOpen, projectId]);

  // Load share links
  useEffect(() => {
    if (!isOpen || !projectId) return;
    api.get<ShareLinkInfo[]>(`/api/projects/${projectId}/share-links`)
      .then(setShareLinks)
      .catch(() => setShareLinks([]));
  }, [isOpen, projectId]);

  // Nords filtered by the selected category
  const filteredNords = useMemo(() => {
    if (!selectedCategoryForNord) return [];
    return nords.filter(n => n.type_id === selectedCategoryForNord);
  }, [nords, selectedCategoryForNord]);

  const filteredEndNords = useMemo(() => {
    if (!selectedCategoryForEndNord) return [];
    return nords.filter(n => n.type_id === selectedCategoryForEndNord);
  }, [nords, selectedCategoryForEndNord]);

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
        accent_color: form.accent_color,
        mcp_enabled: form.mcp_enabled,
        mcp_mutable: form.mcp_mutable,
        graph_only: form.graph_only,
        project_mode: form.mcp_enabled ? form.project_mode : 'explore',
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

          {/* ── Default End Nord (same cascade pattern) ── */}
          <div className={`nords-form__cascade-group${nordTypes.length === 0 ? ' nords-form__cascade-group--disabled' : ''}`}>
            <span className="nords-form__cascade-title">Default End Nord</span>
            {nordTypes.length === 0 ? (
              <span className="nords-form__hint">No nords defined in this project yet.</span>
            ) : (
              <>
                <span className="nords-form__hint" style={{ marginTop: '-6px', marginBottom: '8px' }}>
                  Session auto-transitions here when all required properties are met.
                </span>
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
                      value={selectedCategoryForEndNord}
                      onChange={v => {
                        setSelectedCategoryForEndNord(v);
                        setForm({ ...form, default_end_nord_id: null });
                      }}
                    />
                  </div>
                  <div className="nords-form__field">
                    <label className="nords-form__label">Nord</label>
                    <CustomSelect
                      options={[
                        { value: '', label: '— None —' },
                        ...filteredEndNords.map(n => ({
                          value: n.id,
                          label: n.title,
                        })),
                      ]}
                      value={form.default_end_nord_id || ''}
                      onChange={v => setForm({ ...form, default_end_nord_id: v || null })}
                      disabled={!selectedCategoryForEndNord || filteredEndNords.length === 0}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="nords-form__divider" />

          {/* ── Access Tokens ── */}
          <div className="nords-form__cascade-group">
            <span className="nords-form__cascade-title">
              <Key size={14} style={{ marginRight: 6 }} />
              Access Tokens
            </span>
            <span className="nords-form__hint" style={{ marginTop: '-6px', marginBottom: '8px' }}>
              API keys for external MCP access. Keep these secret.
            </span>

            {newTokenRaw && (
              <div className="nords-form__token-reveal">
                <code>{newTokenRaw}</code>
                <button
                  className="nords-form__icon-btn"
                  title="Copy token"
                  onClick={() => { navigator.clipboard.writeText(newTokenRaw); }}
                >
                  <Copy size={14} />
                </button>
                <span className="nords-form__hint" style={{ color: 'var(--nords-color-warning, #f5a623)' }}>
                  ⚠ Copy now — you won't see this again.
                </span>
              </div>
            )}

            {tokens.length > 0 && (
              <div className="nords-form__token-list">
                {tokens.map(t => (
                  <div key={t.id} className="nords-form__token-row">
                    <code className="nords-form__token-prefix">{t.token_prefix}</code>
                    <span className="nords-form__token-label">{t.label}</span>
                    <span className="nords-form__token-scopes">{t.scopes.join(', ')}</span>
                    <button
                      className="nords-form__icon-btn"
                      title="Revoke"
                      onClick={async () => {
                        await api.delete(`/api/tokens/${t.id}`);
                        setTokens(prev => prev.filter(tk => tk.id !== t.id));
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              className="nords-form__btn nords-form__btn--secondary"
              style={{ marginTop: 8, width: 'auto' }}
              onClick={async () => {
                try {
                  const result = await api.post<{ token: string; id: string; label: string; token_prefix: string; scopes: string[]; created_at: string }>(
                    `/api/projects/${projectId}/tokens`,
                    { label: 'API Key', scopes: ['read', 'write'] }
                  );
                  setNewTokenRaw(result.token);
                  setTokens(prev => [{ id: result.id, label: result.label, token_prefix: result.token_prefix, scopes: result.scopes, created_at: result.created_at }, ...prev]);
                } catch { /* handled */ }
              }}
            >
              <Plus size={14} />
              Generate Token
            </button>
          </div>

          <div className="nords-form__divider" />

          {/* ── Share Links ── */}
          <div className="nords-form__cascade-group">
            <span className="nords-form__cascade-title">
              <Link size={14} style={{ marginRight: 6 }} />
              Share Links
            </span>
            <span className="nords-form__hint" style={{ marginTop: '-6px', marginBottom: '8px' }}>
              Create links for external users to chat with the AI agent. No login required.
            </span>

            {/* Existing links */}
            {shareLinks.length > 0 && (
              <div className="nords-form__token-list">
                {shareLinks.map(link => {
                  const shareUrl = `${window.location.origin}/share/${link.token}`;
                  const isExpanded = expandedLinkId === link.id;
                  return (
                    <div key={link.id} className="nords-form__share-link-card">
                      <div className="nords-form__token-row">
                        <span className="nords-form__token-label" style={{ flex: 1 }}>{link.label}</span>
                        <span className="nords-form__token-scopes">
                          {link.session_count} session{link.session_count !== 1 ? 's' : ''}
                        </span>
                        <button
                          className="nords-form__icon-btn"
                          title={copiedLinkId === link.id ? 'Copied!' : 'Copy link'}
                          onClick={() => {
                            navigator.clipboard.writeText(shareUrl);
                            setCopiedLinkId(link.id);
                            setTimeout(() => setCopiedLinkId(null), 2000);
                          }}
                        >
                          {copiedLinkId === link.id ? <span style={{ fontSize: 12, color: '#4ade80' }}>✓</span> : <Copy size={14} />}
                        </button>
                        <button
                          className="nords-form__icon-btn"
                          title="Open in new tab"
                          onClick={() => window.open(shareUrl, '_blank')}
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          className="nords-form__icon-btn"
                          title={isExpanded ? 'Collapse' : 'Details'}
                          onClick={() => setExpandedLinkId(isExpanded ? null : link.id)}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                          className="nords-form__icon-btn"
                          title="Revoke"
                          onClick={async () => {
                            if (!confirm('Revoke this share link? Anyone using it will lose access.')) return;
                            await api.delete(`/api/projects/${projectId}/share-links/${link.id}`);
                            setShareLinks(prev => prev.filter(l => l.id !== link.id));
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="nords-form__share-link-details">
                          <div className="nords-form__share-link-detail">
                            <span className="nords-form__share-link-detail-label">URL</span>
                            <code className="nords-form__share-link-url">{shareUrl}</code>
                          </div>
                          <div className="nords-form__share-link-detail">
                            <span className="nords-form__share-link-detail-label">Model</span>
                            <span>{link.model}</span>
                          </div>
                          {link.welcome_message_override && (
                            <div className="nords-form__share-link-detail">
                              <span className="nords-form__share-link-detail-label">Welcome Override</span>
                              <span style={{ fontStyle: 'italic', opacity: 0.7 }}>"{link.welcome_message_override.slice(0, 80)}{link.welcome_message_override.length > 80 ? '…' : ''}"</span>
                            </div>
                          )}
                          {link.persona_id_override && (
                            <div className="nords-form__share-link-detail">
                              <span className="nords-form__share-link-detail-label">Persona</span>
                              <span>{personas.find(p => p.id === link.persona_id_override)?.name || 'Custom'}</span>
                            </div>
                          )}
                          {link.expires_at && (
                            <div className="nords-form__share-link-detail">
                              <span className="nords-form__share-link-detail-label">Expires</span>
                              <span>{new Date(link.expires_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Create form */}
            {showCreateLink ? (
              <div className="nords-form__share-link-create">
                <div className="nords-form__field">
                  <label className="nords-form__label">Label *</label>
                  <input
                    className="nords-form__input"
                    value={newLink.label}
                    onChange={e => setNewLink({ ...newLink, label: e.target.value })}
                    placeholder="e.g., Beta Testers Batch 1"
                  />
                </div>
                <div className="nords-form__field">
                  <label className="nords-form__label">Welcome Message Override</label>
                  <textarea
                    className="nords-form__textarea"
                    value={newLink.welcome_message_override}
                    onChange={e => setNewLink({ ...newLink, welcome_message_override: e.target.value })}
                    placeholder="Leave empty to use project default"
                    rows={2}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div className="nords-form__field" style={{ flex: 1 }}>
                    <label className="nords-form__label">Model</label>
                    <select
                      className="nords-form__select"
                      value={newLink.model}
                      onChange={e => setNewLink({ ...newLink, model: e.target.value })}
                    >
                      <option value="gemini-2.5-flash-lite">Flash Lite</option>
                      <option value="gemini-2.5-flash">Flash</option>
                      <option value="gemini-2.5-pro">Pro</option>
                    </select>
                  </div>
                  <div className="nords-form__field" style={{ flex: 1 }}>
                    <label className="nords-form__label">Expires in</label>
                    <select
                      className="nords-form__select"
                      value={newLink.expires_days}
                      onChange={e => setNewLink({ ...newLink, expires_days: e.target.value })}
                    >
                      <option value="1">1 day</option>
                      <option value="3">3 days</option>
                      <option value="7">7 days</option>
                      <option value="14">14 days</option>
                      <option value="30">30 days</option>
                      <option value="90">90 days</option>
                      <option value="">Never</option>
                    </select>
                  </div>
                </div>
                {personas.length > 0 && (
                  <div className="nords-form__field">
                    <label className="nords-form__label">Persona Override</label>
                    <select
                      className="nords-form__select"
                      value={newLink.persona_id_override}
                      onChange={e => setNewLink({ ...newLink, persona_id_override: e.target.value })}
                    >
                      <option value="">Use project default</option>
                      {personas.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    className="nords-form__btn nords-form__btn--secondary"
                    style={{ width: 'auto' }}
                    onClick={() => setShowCreateLink(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="nords-form__btn nords-form__btn--primary"
                    style={{ width: 'auto' }}
                    disabled={!newLink.label.trim()}
                    onClick={async () => {
                      try {
                        const expiresAt = newLink.expires_days
                          ? new Date(Date.now() + parseInt(newLink.expires_days) * 86400000).toISOString()
                          : null;
                        const result = await api.post<ShareLinkInfo>(
                          `/api/projects/${projectId}/share-links`,
                          {
                            label: newLink.label.trim(),
                            welcome_message_override: newLink.welcome_message_override.trim() || null,
                            model: newLink.model,
                            persona_id_override: newLink.persona_id_override || null,
                            expires_at: expiresAt,
                          }
                        );
                        setShareLinks(prev => [{ ...result, session_count: 0 }, ...prev]);
                        setShowCreateLink(false);
                        setNewLink({ label: '', welcome_message_override: '', model: 'gemini-2.5-flash', persona_id_override: '', expires_days: '7' });
                        // Auto-copy the link
                        navigator.clipboard.writeText(`${window.location.origin}/share/${result.token}`);
                        setCopiedLinkId(result.id);
                        setTimeout(() => setCopiedLinkId(null), 3000);
                      } catch (err: any) {
                        console.error('Failed to create share link:', err);
                      }
                    }}
                  >
                    <Link size={14} />
                    Create Link
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="nords-form__btn nords-form__btn--secondary"
                style={{ marginTop: 8, width: 'auto' }}
                onClick={() => setShowCreateLink(true)}
              >
                <Plus size={14} />
                Create Share Link
              </button>
            )}
          </div>

          <div className="nords-form__divider" />

          {/* ── MCP Toggles ── */}
          <label className="nords-form__checkbox">
            <input
              type="checkbox"
              checked={form.mcp_enabled || false}
              onChange={e => setForm({ ...form, mcp_enabled: e.target.checked })}
            />
            <span>Enable Agent (MCP)</span>
          </label>

          {form.mcp_enabled && (
            <div className="nords-form__indent">
              {/* ── Project Mode Selector ── */}
              <div className="nords-modal__mode-selector" style={{ marginBottom: '16px' }}>
                <span className="nords-form__label">Project Mode</span>
                <div className="nords-modal__mode-cards">
                  {[
                    { key: 'explore' as const, icon: <Compass size={20} strokeWidth={1.4} />, name: 'Explore', desc: 'Open-ended discovery. No data collection or session goals.' },
                    { key: 'collect' as const, icon: <ClipboardList size={20} strokeWidth={1.4} />, name: 'Collect', desc: 'Opportunistic data capture. The agent collects properties as they surface.' },
                    { key: 'guided' as const, icon: <Target size={20} strokeWidth={1.4} />, name: 'Guided', desc: 'Goal-directed sessions. The agent steers toward completing defined objectives.' },
                  ].map(mode => (
                    <button
                      key={mode.key}
                      type="button"
                      className={`nords-modal__mode-card ${form.project_mode === mode.key ? 'is-active' : ''}`}
                      onClick={() => setForm({ ...form, project_mode: mode.key })}
                    >
                      <span className="nords-modal__mode-card-icon">{mode.icon}</span>
                      <span className="nords-modal__mode-card-name">{mode.name}</span>
                      <span className="nords-modal__mode-card-desc">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

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
