/**
 * ProjectSettings.tsx — Project Settings Modal
 *
 * Full-screen modal accessible from the gear icon in the ViewportHeader.
 * Sections:
 *   General → Members → Permissions → Snapshots → Spectrum Config →
 *   Icon Library → API & Access → Full Export → Sharing → Danger Zone
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.14 Project Settings
 */

import React, { useState } from 'react';
import {
  X, FolderKanban, Users, Shield, Palette, Bell, Globe, Trash2,
  ChevronRight, Plus, Copy, ExternalLink, Camera, Play, Download,
  Key, FileText, RefreshCw, Smile,
} from 'lucide-react';
import Spectrum from '../Spectrum/Spectrum';
import '../ManageTypes/ManageTypes.css';
import './ProjectSettings.css';

interface ProjectSettingsProps {
  onClose: () => void;
}

const ProjectSettings: React.FC<ProjectSettingsProps> = ({ onClose }) => {
  const [activeSection, setActiveSection] = useState('general');

  const sections = [
    { id: 'general', icon: FolderKanban, label: 'General' },
    { id: 'members', icon: Users, label: 'Members' },
    { id: 'permissions', icon: Shield, label: 'Permissions' },
    { id: 'snapshots', icon: Camera, label: 'Snapshots' },
    { id: 'spectrum', icon: Palette, label: 'Spectrum Config' },
    { id: 'icons', icon: Smile, label: 'Icon Library' },
    { id: 'api', icon: Key, label: 'API & Access' },
    { id: 'export', icon: FileText, label: 'Full Export' },
    { id: 'sharing', icon: Globe, label: 'Sharing' },
    { id: 'danger', icon: Trash2, label: 'Danger Zone' },
  ];

  /** Mock snapshot data */
  const snapshots = [
    { id: '1', name: 'Sprint 3 Retro', date: '2026-04-08 14:30', desc: 'End of sprint 3 — all blockers resolved' },
    { id: '2', name: 'Pre-Launch Review', date: '2026-04-10 09:15', desc: 'Final review before beta launch' },
    { id: '3', name: 'Sprint 4 Kickoff', date: '2026-04-11 10:00', desc: 'Initial sprint planning state' },
  ];

  return (
    <div className="nords-modal-backdrop" onClick={onClose}>
      <div className="nords-modal nords-glass nords-modal--wide" onClick={(e) => e.stopPropagation()}>

        <div className="nords-modal__header">
          <h2 className="nords-modal__title">Project Settings</h2>
          <p className="nords-modal__subtitle">Product Launch Q3</p>
          <button className="nords-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="nords-modal__body">
          {/* ── Sidebar Navigation ── */}
          <div className="nords-settings__sidebar">
            {sections.map(s => (
              <button
                key={s.id}
                className={`nords-settings__nav-item ${activeSection === s.id ? 'is-active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <s.icon size={14} strokeWidth={1.6} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* ── Content Area ── */}
          <div className="nords-settings__content">

            {/* ══ General ══ (no snapshot mode — removed) */}
            {activeSection === 'general' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">General</h3>
                <div className="nords-settings__field">
                  <label>Project Name</label>
                  <input className="nords-settings__input" value="Product Launch Q3" readOnly />
                </div>
                <div className="nords-settings__field">
                  <label>Description</label>
                  <textarea className="nords-settings__textarea" rows={3} readOnly
                    value="End-to-end planning workspace for the Q3 product launch including engineering, design, and marketing tracks."
                  />
                </div>
              </div>
            )}

            {/* ══ Members ══ */}
            {activeSection === 'members' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Members</h3>
                <div className="nords-settings__member-list">
                  {[
                    { name: 'Daniel Crowder', email: 'daniel@example.com', role: 'Admin', avatar: 'D', color: '#2563eb' },
                    { name: 'Sarah Chen', email: 'sarah@example.com', role: 'Editor', avatar: 'S', color: '#059669' },
                  ].map(m => (
                    <div key={m.email} className="nords-settings__member">
                      <div className="nords-settings__member-avatar" style={{ backgroundColor: m.color }}>{m.avatar}</div>
                      <div className="nords-settings__member-info">
                        <span className="nords-settings__member-name">{m.name}</span>
                        <span className="nords-settings__member-email">{m.email}</span>
                      </div>
                      <select className="nords-settings__role-select" defaultValue={m.role}>
                        <option>Admin</option>
                        <option>Editor</option>
                        <option>Commenter</option>
                        <option>Viewer</option>
                      </select>
                    </div>
                  ))}
                </div>
                <button className="nords-settings__invite-btn">
                  <Plus size={12} />
                  Invite Member
                </button>
              </div>
            )}

            {/* ══ Snapshots ══
             * Load, export, delete, and animate through captured snapshots.
             * Snapshots are always named, event-driven saves (no type selection).
             */}
            {activeSection === 'snapshots' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Snapshots</h3>
                <p className="nords-settings__section-desc">
                  Immutable keyframes capturing the exact state of all nords, connections, positions, and metadata.
                </p>

                {/* Animate through all snapshots */}
                <button className="nords-settings__animate-btn">
                  <Play size={14} strokeWidth={2} />
                  Animate Through All ({snapshots.length} snapshots)
                </button>

                {/* Snapshot list */}
                <div className="nords-settings__snapshot-list">
                  {snapshots.map(snap => (
                    <div key={snap.id} className="nords-settings__snapshot-card">
                      <div className="nords-settings__snapshot-header">
                        <div className="nords-settings__snapshot-meta">
                          <Camera size={12} className="nords-settings__snapshot-icon" />
                          <span className="nords-settings__snapshot-name">{snap.name}</span>
                        </div>
                        <span className="nords-settings__snapshot-date">{snap.date}</span>
                      </div>
                      <p className="nords-settings__snapshot-desc">{snap.desc}</p>
                      <div className="nords-settings__snapshot-actions">
                        <button className="nords-settings__snapshot-action" title="Load this snapshot">
                          <RefreshCw size={11} /> Load
                        </button>
                        <button className="nords-settings__snapshot-action" title="Export as JSON">
                          <Download size={11} /> Export
                        </button>
                        <button className="nords-settings__snapshot-action nords-settings__snapshot-action--danger" title="Delete snapshot">
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══ Spectrum Config ══ */}
            {activeSection === 'spectrum' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Spectrum Configuration</h3>
                <p className="nords-settings__section-desc">
                  Configure global defaults for how spectrum values are displayed and quantized.
                </p>
                <div className="nords-settings__spectrum-group">
                  <h4 className="nords-settings__group-title">1D Spectrum (Single Axis)</h4>
                  <div className="nords-settings__spectrum-preview">
                    <label>Preview</label>
                    <Spectrum value={0.65} color="var(--nords-color-accent)" width={200} />
                    <span className="nords-settings__spectrum-value">0.65</span>
                  </div>
                  <div className="nords-settings__field">
                    <label>Default Step Count</label>
                    <select className="nords-settings__select">
                      <option>Continuous (no steps)</option>
                      <option>3 steps</option>
                      <option>5 steps</option>
                      <option>10 steps</option>
                    </select>
                  </div>
                </div>
                <div className="nords-settings__spectrum-group">
                  <h4 className="nords-settings__group-title">2D Spectrum (Dual Axis)</h4>
                  <div className="nords-settings__spectrum-2d-preview">
                    <div className="nords-settings__xy-pad">
                      <div className="nords-settings__xy-dot" style={{ left: '65%', bottom: '40%' }} />
                      <span className="nords-settings__xy-label nords-settings__xy-label--x">X Axis</span>
                      <span className="nords-settings__xy-label nords-settings__xy-label--y">Y Axis</span>
                    </div>
                    <span className="nords-settings__spectrum-value">X: 0.65, Y: 0.40</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══ Icon Library ══
             * Browse and assign icons from the Lucide icon set.
             * Used for: project icon, nord type icons.
             */}
            {activeSection === 'icons' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Icon Library</h3>
                <p className="nords-settings__section-desc">
                  Browse the icon set used for Nord types and project branding. Icons are from the <strong>Lucide</strong> library.
                </p>
                <div className="nords-settings__field">
                  <label>Project Icon</label>
                  <div className="nords-settings__icon-preview">
                    <FolderKanban size={24} strokeWidth={1.6} />
                    <button className="nords-settings__icon-change-btn">Change Icon</button>
                  </div>
                </div>
                <div className="nords-settings__field">
                  <label>Search Icons</label>
                  <input className="nords-settings__input" placeholder="Search Lucide icons..." />
                </div>
                <div className="nords-settings__icon-grid">
                  {['Square', 'Circle', 'Triangle', 'Star', 'Heart', 'Zap',
                    'Cloud', 'Sun', 'Moon', 'Flame', 'Anchor', 'Compass',
                    'Flag', 'Map', 'Bookmark', 'Award', 'Shield', 'Target',
                    'Coffee', 'Music', 'Camera', 'Palette', 'Puzzle', 'Rocket',
                  ].map(name => (
                    <button key={name} className="nords-settings__icon-item" title={name}>
                      <span className="nords-settings__icon-name">{name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ══ API & Access ══
             * Web access token, MCP endpoint URL, Nord DNA base URL.
             */}
            {activeSection === 'api' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">API & Access Tokens</h3>
                <p className="nords-settings__section-desc">
                  Manage programmatic access for MCP agents, integrations, and Nord DNA context URLs.
                </p>

                <div className="nords-settings__token-card">
                  <div className="nords-settings__token-header">
                    <Key size={14} />
                    <span>Web Access Token</span>
                  </div>
                  <div className="nords-settings__token-value">
                    <input className="nords-settings__input nords-settings__input--mono" value="nds_tok_a8b2c1d4e5f6••••••••" readOnly />
                    <button className="nords-settings__copy-btn"><Copy size={12} /> Copy</button>
                  </div>
                  <div className="nords-settings__field">
                    <label>Token Scope</label>
                    <select className="nords-settings__select">
                      <option>Read-Only</option>
                      <option>Read-Write</option>
                      <option>Admin</option>
                    </select>
                  </div>
                  <button className="nords-settings__danger-action">
                    <RefreshCw size={11} /> Regenerate Token
                  </button>
                </div>

                <div className="nords-settings__field" style={{ marginTop: '24px' }}>
                  <label>MCP Endpoint URL</label>
                  <div className="nords-settings__url-row">
                    <input className="nords-settings__input nords-settings__input--mono" value="https://api.nords.app/mcp/v1/pLQ3-a8b2c1" readOnly />
                    <button className="nords-settings__copy-btn"><Copy size={12} /></button>
                  </div>
                </div>

                <div className="nords-settings__field">
                  <label>Nord DNA Base URL</label>
                  <div className="nords-settings__url-row">
                    <input className="nords-settings__input nords-settings__input--mono" value="https://nords.app/dna/{nord-id}" readOnly />
                    <button className="nords-settings__copy-btn"><Copy size={12} /></button>
                  </div>
                  <span className="nords-settings__field-hint">Each nord has a unique DNA URL for portable AI context sharing.</span>
                </div>
              </div>
            )}

            {/* ══ Full Export (RAG Context) ══
             * Exports the entire project as a structured document
             * optimized for LLM context windows and Vertex RAG.
             */}
            {activeSection === 'export' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Full Export (RAG Context)</h3>
                <p className="nords-settings__section-desc">
                  Export the entire project as a single structured document optimized for RAG ingestion,
                  LLM context windows, and graph analysis. Think of it as the complete semantic dump.
                </p>

                <div className="nords-settings__export-preview">
                  <h4 className="nords-settings__group-title">Export Contents</h4>
                  <ul className="nords-settings__export-list">
                    <li>✓ Project metadata (name, description, members, type schemas)</li>
                    <li>✓ All nords — full properties, descriptions, tags, scale values</li>
                    <li>✓ All connections — line types, distance values (0.0–1.0), stage labels</li>
                    <li>✓ Graph topology (Mermaid diagram representation)</li>
                    <li>✓ Spatial coordinates snapshot (X/Y positions at export time)</li>
                    <li>✓ All comments with author, timestamp, target entity</li>
                    <li>✓ All snapshots metadata (names + descriptions)</li>
                  </ul>
                </div>

                <div className="nords-settings__field">
                  <label>Export Format</label>
                  <select className="nords-settings__select">
                    <option>Markdown (LLM-optimized — hierarchical headers + inline values)</option>
                    <option>JSON (Structured — full graph + metadata payloads)</option>
                    <option>YAML (Human-readable structured format)</option>
                  </select>
                </div>

                <div className="nords-settings__export-stats">
                  <span className="nords-settings__export-stat">
                    <strong>10</strong> nords
                  </span>
                  <span className="nords-settings__export-stat">
                    <strong>15</strong> connections
                  </span>
                  <span className="nords-settings__export-stat">
                    <strong>3</strong> snapshots
                  </span>
                  <span className="nords-settings__export-stat">
                    <strong>~12,400</strong> tokens (est.)
                  </span>
                </div>

                <div className="nords-settings__export-actions">
                  <button className="nords-settings__export-btn">
                    <Copy size={13} /> Copy to Clipboard
                  </button>
                  <button className="nords-settings__export-btn nords-settings__export-btn--secondary">
                    <Download size={13} /> Download File
                  </button>
                </div>
              </div>
            )}

            {/* ══ Sharing ══ */}
            {activeSection === 'sharing' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Sharing</h3>
                <div className="nords-settings__sharing-card">
                  <div className="nords-settings__sharing-header">
                    <Globe size={14} />
                    <span>Public View-Only Link</span>
                    <span className="nords-settings__sharing-badge">Active</span>
                  </div>
                  <div className="nords-settings__sharing-url">
                    <input className="nords-settings__input" value="https://nords.app/view/pLQ3-a8b2c1" readOnly />
                    <button className="nords-settings__copy-btn"><Copy size={12} /> Copy</button>
                  </div>
                  <span className="nords-settings__field-hint">No account required. Viewers can pan, zoom, and toggle lenses locally.</span>
                </div>
              </div>
            )}

            {/* ══ Danger Zone ══ */}
            {activeSection === 'danger' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title nords-settings__section-title--danger">Danger Zone</h3>
                <div className="nords-settings__danger-card">
                  <div>
                    <strong>Delete this project</strong>
                    <p>Once deleted, all nords, connections, snapshots, and comments will be permanently removed.</p>
                  </div>
                  <button className="nords-settings__danger-btn">Delete Project</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectSettings;
