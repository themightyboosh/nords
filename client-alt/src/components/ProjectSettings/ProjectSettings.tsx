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
    <div className="nords-modal-backdrop" onClick={onClose}>
      <div className="nords-modal nords-glass nords-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="nords-modal__header">
          <h2 className="nords-modal__title">Project Settings</h2>
          <p className="nords-modal__subtitle">Product Launch Q3</p>
          <button className="nords-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="nords-modal__body">
          {/* Sidebar */}
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

          {/* Content */}
          <div className="nords-settings__content">
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
                <div className="nords-settings__field">
                  <label>Default Snapshot Mode</label>
                  <select className="nords-settings__select">
                    <option>Live (real-time)</option>
                    <option>Manual Snapshots</option>
                  </select>
                </div>
              </div>
            )}

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

            {activeSection === 'spectrum' && (
              <div className="nords-settings__section">
                <h3 className="nords-settings__section-title">Spectrum Configuration</h3>
                <p className="nords-settings__section-desc">
                  The <strong>Spectrum</strong> is Nords' universal widget for expressing normalized values on a 0.0–1.0 range. 
                  Configure global defaults for how spectrum values are displayed and quantized across the project.
                </p>

                <div className="nords-settings__spectrum-group">
                  <h4 className="nords-settings__group-title">1D Spectrum (Single Axis)</h4>
                  <p className="nords-settings__group-desc">
                    Used for: connection distances, nord scale, progress, priority, capacity, allocation.
                  </p>
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
                    <span className="nords-settings__field-hint">Per-connection type stepper labels override this default</span>
                  </div>
                </div>

                <div className="nords-settings__spectrum-group">
                  <h4 className="nords-settings__group-title">2D Spectrum (Dual Axis)</h4>
                  <p className="nords-settings__group-desc">
                    Used for: dual-axis mapping (e.g., Urgency × Impact). Displays as an XY coordinate pad.
                  </p>
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
