import React, { useState } from 'react';
import {
  X, FolderKanban, Users, Shield, Palette, Bell, Globe, Trash2,
  ChevronRight, Plus, Copy, ExternalLink,
} from 'lucide-react';
import Spectrum from '../Spectrum/Spectrum';
import '../ManageTypes/ManageTypes.css'; /* reuse modal base styles */
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
    { id: 'spectrum', icon: Palette, label: 'Spectrum Config' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'sharing', icon: Globe, label: 'Sharing' },
    { id: 'danger', icon: Trash2, label: 'Danger Zone' },
  ];

  return (
    <div className="nards-modal-backdrop" onClick={onClose}>
      <div className="nards-modal nards-glass nards-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="nards-modal__header">
          <h2 className="nards-modal__title">Project Settings</h2>
          <p className="nards-modal__subtitle">Product Launch Q3</p>
          <button className="nards-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="nards-modal__body">
          {/* Sidebar */}
          <div className="nards-settings__sidebar">
            {sections.map(s => (
              <button
                key={s.id}
                className={`nards-settings__nav-item ${activeSection === s.id ? 'is-active' : ''}`}
                onClick={() => setActiveSection(s.id)}
              >
                <s.icon size={14} strokeWidth={1.6} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="nards-settings__content">
            {activeSection === 'general' && (
              <div className="nards-settings__section">
                <h3 className="nards-settings__section-title">General</h3>
                <div className="nards-settings__field">
                  <label>Project Name</label>
                  <input className="nards-settings__input" value="Product Launch Q3" readOnly />
                </div>
                <div className="nards-settings__field">
                  <label>Description</label>
                  <textarea className="nards-settings__textarea" rows={3} readOnly
                    value="End-to-end planning workspace for the Q3 product launch including engineering, design, and marketing tracks."
                  />
                </div>
                <div className="nards-settings__field">
                  <label>Default Snapshot Mode</label>
                  <select className="nards-settings__select">
                    <option>Live (real-time)</option>
                    <option>Manual Snapshots</option>
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'members' && (
              <div className="nards-settings__section">
                <h3 className="nards-settings__section-title">Members</h3>
                <div className="nards-settings__member-list">
                  {[
                    { name: 'Daniel Crowder', email: 'daniel@example.com', role: 'Admin', avatar: 'D', color: '#2563eb' },
                    { name: 'Sarah Chen', email: 'sarah@example.com', role: 'Editor', avatar: 'S', color: '#059669' },
                  ].map(m => (
                    <div key={m.email} className="nards-settings__member">
                      <div className="nards-settings__member-avatar" style={{ backgroundColor: m.color }}>{m.avatar}</div>
                      <div className="nards-settings__member-info">
                        <span className="nards-settings__member-name">{m.name}</span>
                        <span className="nards-settings__member-email">{m.email}</span>
                      </div>
                      <select className="nards-settings__role-select" defaultValue={m.role}>
                        <option>Admin</option>
                        <option>Editor</option>
                        <option>Commenter</option>
                        <option>Viewer</option>
                      </select>
                    </div>
                  ))}
                </div>
                <button className="nards-settings__invite-btn">
                  <Plus size={12} />
                  Invite Member
                </button>
              </div>
            )}

            {activeSection === 'spectrum' && (
              <div className="nards-settings__section">
                <h3 className="nards-settings__section-title">Spectrum Configuration</h3>
                <p className="nards-settings__section-desc">
                  The <strong>Spectrum</strong> is Nards' universal widget for expressing normalized values on a 0.0–1.0 range. 
                  Configure global defaults for how spectrum values are displayed and quantized across the project.
                </p>

                <div className="nards-settings__spectrum-group">
                  <h4 className="nards-settings__group-title">1D Spectrum (Single Axis)</h4>
                  <p className="nards-settings__group-desc">
                    Used for: connection distances, nard scale, progress, priority, capacity, allocation.
                  </p>
                  <div className="nards-settings__spectrum-preview">
                    <label>Preview</label>
                    <Spectrum value={0.65} color="var(--nards-color-accent)" width={200} />
                    <span className="nards-settings__spectrum-value">0.65</span>
                  </div>
                  <div className="nards-settings__field">
                    <label>Default Step Count</label>
                    <select className="nards-settings__select">
                      <option>Continuous (no steps)</option>
                      <option>3 steps</option>
                      <option>5 steps</option>
                      <option>10 steps</option>
                    </select>
                    <span className="nards-settings__field-hint">Per-connection type stepper labels override this default</span>
                  </div>
                </div>

                <div className="nards-settings__spectrum-group">
                  <h4 className="nards-settings__group-title">2D Spectrum (Dual Axis)</h4>
                  <p className="nards-settings__group-desc">
                    Used for: dual-axis mapping (e.g., Urgency × Impact). Displays as an XY coordinate pad.
                  </p>
                  <div className="nards-settings__spectrum-2d-preview">
                    <div className="nards-settings__xy-pad">
                      <div className="nards-settings__xy-dot" style={{ left: '65%', bottom: '40%' }} />
                      <span className="nards-settings__xy-label nards-settings__xy-label--x">X Axis</span>
                      <span className="nards-settings__xy-label nards-settings__xy-label--y">Y Axis</span>
                    </div>
                    <span className="nards-settings__spectrum-value">X: 0.65, Y: 0.40</span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'sharing' && (
              <div className="nards-settings__section">
                <h3 className="nards-settings__section-title">Sharing</h3>
                <div className="nards-settings__sharing-card">
                  <div className="nards-settings__sharing-header">
                    <Globe size={14} />
                    <span>Public View-Only Link</span>
                    <span className="nards-settings__sharing-badge">Active</span>
                  </div>
                  <div className="nards-settings__sharing-url">
                    <input className="nards-settings__input" value="https://nards.app/view/pLQ3-a8b2c1" readOnly />
                    <button className="nards-settings__copy-btn"><Copy size={12} /> Copy</button>
                  </div>
                  <span className="nards-settings__field-hint">No account required. Viewers can pan, zoom, and toggle lenses locally.</span>
                </div>
              </div>
            )}

            {activeSection === 'danger' && (
              <div className="nards-settings__section">
                <h3 className="nards-settings__section-title nards-settings__section-title--danger">Danger Zone</h3>
                <div className="nards-settings__danger-card">
                  <div>
                    <strong>Delete this project</strong>
                    <p>Once deleted, all nards, connections, snapshots, and comments will be permanently removed.</p>
                  </div>
                  <button className="nards-settings__danger-btn">Delete Project</button>
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
