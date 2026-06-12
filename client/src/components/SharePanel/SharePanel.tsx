/**
 * SharePanel.tsx — Dedicated panel for managing Share Links & Access Tokens.
 *
 * Extracted from ProjectSettings to give Share its own top-level menu item.
 * Re-uses nords-form__* CSS primitives for consistency.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  X, Plus, Copy, Trash2, Key, Link, ExternalLink,
  ChevronDown, ChevronUp, Share2, Terminal,
} from 'lucide-react';
import { api } from '../../api/client';
import { FloatingPanel } from '../FloatingPanel/FloatingPanel';
import './SharePanel.css';

// ── Types ──

interface SharePanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
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
}

interface NordTypeSummary {
  id: string;
  name: string;
  icon: string;
  accent_color?: string | null;
  properties_schema?: Array<{ name: string; type: string }>;
}

interface TokenInfo {
  id: string;
  label: string;
  token_prefix: string;
  scopes: string[];
  created_at: string;
}

interface VariableSummary {
  id: string;
  name: string;
  type: string;
  collection_group_id: string | null;
  options?: string[] | null;
}

interface CollGroupSummary {
  id: string;
  name: string;
}

export interface ShareLinkPrefill {
  id: string;
  share_link_id: string;
  variable_id: string;
  value: string;
}

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
  prefills?: ShareLinkPrefill[];
}

// ── Component ──

export function SharePanel({ isOpen, onClose, projectId }: SharePanelProps) {
  // ── State ──
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);

  const [shareLinks, setShareLinks] = useState<ShareLinkInfo[]>([]);
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'share' | 'mcp'>('share');
  const [newLink, setNewLink] = useState({
    label: '',
    welcome_message_override: '',
    model: 'gemini-2.5-flash',
    persona_id_override: '',
    expires_days: '7',
  });
  const [newPrefills, setNewPrefills] = useState<Array<{ variable_id: string; value: string; _groupId: string }>>([]);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null);

  // Reference data
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [nords, setNords] = useState<NordSummary[]>([]);
  const [nordTypes, setNordTypes] = useState<NordTypeSummary[]>([]);
  const [variables, setVariables] = useState<VariableSummary[]>([]);
  const [collGroups, setCollGroups] = useState<CollGroupSummary[]>([]);

  // ── Data loading ──

  useEffect(() => {
    if (!isOpen) return;

    api.get<TokenInfo[]>(`/api/projects/${projectId}/tokens`)
      .then(setTokens)
      .catch(() => setTokens([]));

    api.get<ShareLinkInfo[]>(`/api/projects/${projectId}/share-links`)
      .then(setShareLinks)
      .catch(() => setShareLinks([]));

    api.get<PersonaSummary[]>(`/api/projects/${projectId}/personas`)
      .then(setPersonas)
      .catch(() => setPersonas([]));

    api.get<{ nords: NordSummary[]; nord_types: NordTypeSummary[] }>(`/api/projects/${projectId}/graph`)
      .then(data => {
        setNords(data.nords || []);
        setNordTypes(data.nord_types || []);
      })
      .catch(() => { setNords([]); setNordTypes([]); });

    api.get<VariableSummary[]>(`/api/projects/${projectId}/variables`)
      .then(setVariables)
      .catch(() => setVariables([]));

    api.get<{ groups: CollGroupSummary[]; ungrouped: any[] }>(`/api/projects/${projectId}/collection-groups`)
      .then(data => setCollGroups(data?.groups || []))
      .catch(() => setCollGroups([]));
  }, [isOpen, projectId]);

  // ── Handlers ──

  const handleCreateToken = useCallback(async () => {
    try {
      const result = await api.post<{
        token: string; id: string; label: string;
        token_prefix: string; scopes: string[]; created_at: string;
      }>(
        `/api/projects/${projectId}/tokens`,
        { label: 'API Key', scopes: ['read', 'write'] }
      );
      setNewTokenRaw(result.token);
      setTokens(prev => [{
        id: result.id,
        label: result.label,
        token_prefix: result.token_prefix,
        scopes: result.scopes,
        created_at: result.created_at,
      }, ...prev]);
    } catch { /* handled */ }
  }, [projectId]);

  const handleRevokeToken = useCallback(async (tokenId: string) => {
    await api.delete(`/api/tokens/${tokenId}`);
    setTokens(prev => prev.filter(t => t.id !== tokenId));
  }, []);

  const handleCreateLink = useCallback(async () => {
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
          prefills: newPrefills.filter(p => p.variable_id).map(p => ({ variable_id: p.variable_id, value: p.value })),
        }
      );
      setShareLinks(prev => [{ ...result, session_count: 0 }, ...prev]);
      setShowCreateLink(false);
      setNewLink({ label: '', welcome_message_override: '', model: 'gemini-2.5-flash', persona_id_override: '', expires_days: '7' });
      setNewPrefills([]);
      // Auto-copy the link
      navigator.clipboard.writeText(`${window.location.origin}/share/${result.token}`);
      setCopiedLinkId(result.id);
      setTimeout(() => setCopiedLinkId(null), 3000);
    } catch (err: any) {
      console.error('Failed to create share link:', err);
    }
  }, [projectId, newLink, newPrefills]);

  const handleRevokeLink = useCallback(async (linkId: string) => {
    if (!confirm('Revoke this share link? Anyone using it will lose access.')) return;
    await api.delete(`/api/projects/${projectId}/share-links/${linkId}`);
    setShareLinks(prev => prev.filter(l => l.id !== linkId));
  }, [projectId]);

  const handleCopyLink = useCallback((linkId: string, token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    setCopiedLinkId(linkId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  }, []);

  // Prefill CRUD — now uses collection variables (Group → Variable cascade)
  const addPrefill = () => setNewPrefills(prev => [...prev, { variable_id: '', value: '', _groupId: '' }]);
  const updatePrefill = (idx: number, field: string, value: string) => {
    setNewPrefills(prev => prev.map((p, i) =>
      i === idx ? {
        ...p,
        [field]: value,
        // Reset downstream fields on cascade
        ...(field === '_groupId' ? { variable_id: '', value: '' } : {}),
        ...(field === 'variable_id' ? { value: '' } : {}),
      } : p
    ));
  };
  const removePrefill = (idx: number) => setNewPrefills(prev => prev.filter((_, i) => i !== idx));

  if (!isOpen) return null;

  return (
    <FloatingPanel variant="modal" isOpen={isOpen} onClose={onClose} width="min(780px, 96vw)">
      <div className="share-panel">
        {/* Header */}
        <div className="share-panel__header">
          <div>
            <h2 className="share-panel__title nords-panel-title"><Share2 size={18} strokeWidth={1.6} />Share & Connect</h2>
            <p className="share-panel__subtitle">Manage share links and API access for this project.</p>
          </div>
          <button className="nords-close-btn" onClick={onClose} aria-label="Close"><X size={18} strokeWidth={2} /></button>
        </div>

        <div className="share-panel__tabs">
          <button
            className={`share-panel__tab ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            <Share2 size={13} /> Share Links
          </button>
          <button
            className={`share-panel__tab ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp')}
          >
            <Terminal size={13} /> MCP Access
          </button>
        </div>

        <div className="share-panel__body">
          {activeTab === 'share' && <>
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
                          onClick={() => handleCopyLink(link.id, link.token)}
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
                          onClick={() => handleRevokeLink(link.id)}
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

                {/* ── Prefills (Collection Variables) ── */}
                <div className="share-panel__prefills">
                  <label className="nords-form__label">
                    Pre-fill Variables
                    <button className="share-panel__prefill-add" onClick={addPrefill} title="Add prefill">
                      <Plus size={12} /> Add
                    </button>
                  </label>
                  <span className="nords-form__hint" style={{ marginTop: '-4px', marginBottom: '6px' }}>
                    Pre-fill collection variables when the share link is opened.
                  </span>
                  {newPrefills.map((pf, idx) => {
                    // Groups that have variables
                    const groupsWithVars = collGroups.filter(g =>
                      variables.some(v => v.collection_group_id === g.id)
                    );
                    const ungroupedVars = variables.filter(v => !v.collection_group_id);
                    // Variables in the selected group
                    const filteredVars = pf._groupId === '__ungrouped__'
                      ? ungroupedVars
                      : variables.filter(v => v.collection_group_id === pf._groupId);

                    return (
                      <div key={idx} className="share-panel__prefill-row">
                        <select
                          className="nords-form__select"
                          value={pf._groupId}
                          onChange={e => updatePrefill(idx, '_groupId', e.target.value)}
                        >
                          <option value="">Select group…</option>
                          {groupsWithVars.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                          {ungroupedVars.length > 0 && (
                            <option value="__ungrouped__">Ungrouped</option>
                          )}
                        </select>
                        <select
                          className="nords-form__select"
                          value={pf.variable_id}
                          onChange={e => updatePrefill(idx, 'variable_id', e.target.value)}
                          disabled={!pf._groupId}
                        >
                          <option value="">Select variable…</option>
                          {filteredVars.map(v => (
                            <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
                          ))}
                        </select>
                        <PrefillValueInput
                          variable={pf.variable_id ? filteredVars.find(v => v.id === pf.variable_id) || variables.find(v => v.id === pf.variable_id) : undefined}
                          value={pf.value}
                          onChange={v => updatePrefill(idx, 'value', v)}
                          disabled={!pf.variable_id}
                        />
                        <button className="nords-form__icon-btn" onClick={() => removePrefill(idx)} title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    className="nords-form__btn nords-form__btn--secondary"
                    style={{ width: 'auto' }}
                    onClick={() => { setShowCreateLink(false); setNewPrefills([]); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="nords-form__btn nords-form__btn--primary"
                    style={{ width: 'auto' }}
                    disabled={!newLink.label.trim()}
                    onClick={handleCreateLink}
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
          </>}

          {activeTab === 'mcp' && <>
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
              <div className="nords-form__token-reveal-block">
                {/* Token + copy button */}
                <div className="nords-form__token-reveal">
                  <code>{newTokenRaw}</code>
                  <button
                    className="nords-form__icon-btn"
                    title="Copy token"
                    onClick={() => { navigator.clipboard.writeText(newTokenRaw); }}
                  >
                    <Copy size={14} />
                  </button>
                </div>
                <span className="nords-form__hint" style={{ color: 'var(--nords-color-warning, #f5a623)', marginTop: '4px' }}>
                  ⚠ Copy now — you won't see this again.
                </span>

                {/* MCP Connection Details */}
                <div className="nords-form__mcp-details">
                  <span className="nords-form__mcp-details-title">MCP Connection Details</span>

                  <div className="nords-form__mcp-row">
                    <span className="nords-form__mcp-label">Endpoint</span>
                    <code className="nords-form__mcp-value">{`${(import.meta as any).env?.VITE_API_URL || window.location.origin}/mcp`}</code>
                  </div>
                  <div className="nords-form__mcp-row">
                    <span className="nords-form__mcp-label">Access Token</span>
                    <code className="nords-form__mcp-value">{newTokenRaw.slice(0, 16)}…</code>
                  </div>

                  <div className="nords-form__mcp-config">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="nords-form__mcp-config-label">Client Config</span>
                      <button
                        className="nords-form__icon-btn"
                        style={{ width: '28px', height: '28px' }}
                        title="Copy config"
                        onClick={() => {
                          const mcpUrl = `${(import.meta as any).env?.VITE_API_URL || window.location.origin}/mcp`;
                          const config = JSON.stringify({
                            mcpServers: {
                              nords: {
                                type: 'streamable-http',
                                url: mcpUrl,
                                headers: {
                                  Authorization: `Bearer ${newTokenRaw}`,
                                },
                              },
                            },
                          }, null, 2);
                          navigator.clipboard.writeText(config);
                        }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <pre className="nords-form__mcp-config-code">{`{
  "mcpServers": {
    "nords": {
      "type": "streamable-http",
      "url": "${(import.meta as any).env?.VITE_API_URL || window.location.origin}/mcp",
      "headers": {
        "Authorization": "Bearer ${newTokenRaw.slice(0, 16)}…"
      }
    }
  }
}`}</pre>
                  </div>
                </div>
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
                      onClick={() => handleRevokeToken(t.id)}
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
              onClick={handleCreateToken}
            >
              <Plus size={14} />
              Generate Token
            </button>
          </div>
          </>}
        </div>
      </div>
    </FloatingPanel>
  );
}

// ── Type-Aware Prefill Value Input ──

function PrefillValueInput({ variable, value, onChange, disabled }: {
  variable?: VariableSummary;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  if (!variable || disabled) {
    return (
      <input
        className="nords-form__input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Value"
        disabled
      />
    );
  }

  const type = variable.type;

  // Boolean → Yes / No dropdown
  if (type === 'boolean') {
    return (
      <select
        className="nords-form__select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Select —</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
    );
  }

  // Select / Multi-select → options dropdown
  if ((type === 'select' || type === 'multi_select') && variable.options?.length) {
    return (
      <select
        className="nords-form__select"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— Select —</option>
        {variable.options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  // Number / Currency / Percentage → number input
  if (type === 'number' || type === 'currency' || type === 'percentage') {
    return (
      <input
        className="nords-form__input"
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
      />
    );
  }

  // Date → date picker
  if (type === 'date') {
    return (
      <input
        className="nords-form__input"
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  // Tags → text with hint
  if (type === 'tags') {
    return (
      <input
        className="nords-form__input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="tag1, tag2, …"
      />
    );
  }

  // Email
  if (type === 'email') {
    return (
      <input
        className="nords-form__input"
        type="email"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="user@example.com"
      />
    );
  }

  // URL
  if (type === 'url') {
    return (
      <input
        className="nords-form__input"
        type="url"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="https://…"
      />
    );
  }

  // Default: text input (short_text, long_text, phone, etc.)
  return (
    <input
      className="nords-form__input"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Value"
    />
  );
}
