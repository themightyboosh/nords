/**
 * ProjectDashboard.tsx — Workspace Switcher / Project List
 *
 * The "front door" of Nords — shown before entering a project.
 * Now loads real projects from the Express API.
 *
 * Features:
 *   - List projects from API
 *   - Create project modal with mandatory validation + MCP checkboxes
 *   - Delete project with confirmation
 *   - Export placeholder
 */

import { useState, useEffect, useCallback } from 'react';
import {
  FolderKanban, Plus, MoreHorizontal,
  Layers, Star,
  Trash2, Download, Settings, X, AlertTriangle,
  ShieldCheck, BarChart3, CreditCard, Settings2,
  Compass, ClipboardList, Target,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import ViewportHeader from '../Layout/ViewportHeader';
import { IconPicker } from '../shared/IconPicker';
import { ColorIcon } from '../shared/ColorIcon';
import { resolveIcon } from '../../utils/iconRegistry';
import { ProjectSettings } from '../ProjectSettings/ProjectSettings';
import { HueSlider } from '../shared/HueSlider';
import './ProjectDashboard.css';

/** Feature flag: set to true to show the Admin sidebar section */
const SHOW_ADMIN_SECTION = import.meta.env.VITE_SHOW_ADMIN === 'true';

interface Project {
  id: string;
  name: string;
  icon: string | null;
  accent_color: string | null;
  description: string | null;
  purpose: string | null;
  project_mode: 'explore' | 'collect' | 'guided';
  mcp_enabled: boolean;
  mcp_capture_data: boolean;
  mcp_mutable: boolean;
  goals_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    purpose: '',
    icon: 'Folder',
    accent_color: '#6b7aed',
    mcp_enabled: false,
    project_mode: 'explore' as 'explore' | 'collect' | 'guided',
  });
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCreateIconPicker, setShowCreateIconPicker] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);

  // Settings modal state
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.get<Project[]>('/api/projects');
      setProjects(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // ── Create Project ──
  const handleCreate = async () => {
    const errors: string[] = [];
    if (!createForm.name.trim()) errors.push('Name is required');
    if (!createForm.description.trim()) errors.push('Description is required');
    if (!createForm.purpose.trim()) errors.push('Purpose is required');
    if (errors.length > 0) {
      setCreateErrors(errors);
      return;
    }

    setCreating(true);
    setCreateErrors([]);
    try {
      await api.post('/api/projects', {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        purpose: createForm.purpose.trim(),
        icon: createForm.icon || 'Folder',
        accent_color: createForm.accent_color || '#6b7aed',
        mcp_enabled: createForm.mcp_enabled,
        project_mode: createForm.mcp_enabled ? createForm.project_mode : 'explore',
      });
      setShowCreateModal(false);
      setShowCreateIconPicker(false);
      setCreateForm({ name: '', description: '', purpose: '', icon: 'Folder', accent_color: '#6b7aed', mcp_enabled: false, project_mode: 'explore' });
      await loadProjects();
    } catch (err: any) {
      setCreateErrors([err.message || 'Failed to create project']);
    } finally {
      setCreating(false);
    }
  };

  // ── Delete Project ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/projects/${deleteTarget.id}`);
      setDeleteTarget(null);
      await loadProjects();
    } catch (err: any) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeleting(false);
    }
  };

  // ── Export (placeholder) ──
  const handleExport = (project: Project) => {
    // TODO: Implement export
    alert(`Export for "${project.name}" is coming soon!`);
    setContextMenu(null);
  };

  // Theme state (shared with header)
  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('nords-theme') || 'obsidian');
  const handleThemeChange = useCallback((theme: string) => {
    setCurrentTheme(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nords-theme', theme);
  }, []);

  return (
    <div className="nords-dashboard" data-testid="project-dashboard">
      <ViewportHeader
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        mode="dashboard"
      />
      <div className="nords-dashboard__body">
      <aside className="nords-dashboard__sidebar">
        <div className="nords-dashboard__sidebar-header">
          <span className="nords-dashboard__sidebar-title">Workspace</span>
        </div>

        <nav className="nords-dashboard__sidebar-nav">
          <button className="nords-dashboard__nav-item is-active">
            <FolderKanban size={14} strokeWidth={1.5} />
            All Projects
            <span className="nords-dashboard__nav-count">{projects.length}</span>
          </button>
          <button className="nords-dashboard__nav-item">
            <Star size={14} strokeWidth={1.5} />
            Starred
            <span className="nords-dashboard__nav-count">0</span>
          </button>
        </nav>

        <div style={{ flex: 1 }} />

        {/* ── Admin Section (feature-flagged) ── */}
        {SHOW_ADMIN_SECTION && (
          <>
            <div className="nords-dashboard__sidebar-header" style={{ marginTop: 8 }}>
              <span className="nords-dashboard__sidebar-title">
                <ShieldCheck size={12} style={{ marginRight: 4 }} />
                Admin
              </span>
            </div>
            <nav className="nords-dashboard__sidebar-nav">
              <button className="nords-dashboard__nav-item">
                <BarChart3 size={14} strokeWidth={1.5} />
                Analytics
              </button>
              <button className="nords-dashboard__nav-item">
                <CreditCard size={14} strokeWidth={1.5} />
                Billing
              </button>
              <button className="nords-dashboard__nav-item">
                <Settings2 size={14} strokeWidth={1.5} />
                Platform Settings
              </button>
            </nav>
          </>
        )}

        <button
          className="nords-dashboard__create-btn"
          data-testid="create-project-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={14} strokeWidth={2} />
          New Project
        </button>
      </aside>

      <main className="nords-dashboard__main">

        {error && (
          <div className="nords-modal__errors" style={{ marginBottom: '16px' }}>
            <div className="nords-modal__error">
              <AlertTriangle size={12} /> {error}
            </div>
          </div>
        )}

        {loading && (
          <div className="nords-dashboard__loading">
            <div className="nords-canvas-loading__spinner" />
            <span>Loading projects…</span>
          </div>
        )}

        <div className="nords-dashboard__grid">
          {projects.map(project => (
            <div
              key={project.id}
              className="nords-dashboard__card"
              onClick={() => navigate(`/project/${project.id}`)}
              data-testid={`project-card-${project.id}`}
            >
              <div className="nords-dashboard__card-header">
                <span className="nords-dashboard__card-icon">
                  <ColorIcon
                    icon={project.icon}
                    color={project.accent_color || '#6b7aed'}
                    size={32}
                    strokeWidth={1.4}
                  />
                </span>
                <div className="nords-dashboard__card-header-right">
                  {project.mcp_enabled && (
                    <span
                      className={`nords-dashboard__mode-badge nords-dashboard__mode-badge--${project.project_mode}`}
                      title={`Mode: ${project.project_mode}`}
                    >
                      {project.project_mode === 'explore' && <Compass size={10} />}
                      {project.project_mode === 'collect' && <ClipboardList size={10} />}
                      {project.project_mode === 'guided' && <Target size={10} />}
                      {project.project_mode.charAt(0).toUpperCase() + project.project_mode.slice(1)}
                    </span>
                  )}
                  <button
                    className="nords-dashboard__card-menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setContextMenu(contextMenu?.projectId === project.id ? null : { projectId: project.id, x: rect.left, y: rect.bottom + 4 });
                    }}
                  >
                    <MoreHorizontal size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <h3 className="nords-dashboard__card-name">{project.name}</h3>
              <p className="nords-dashboard__card-desc">{project.description || 'No description'}</p>
              <div className="nords-dashboard__card-footer">
                <span className="nords-dashboard__card-stat">
                  <Layers size={11} strokeWidth={1.5} />
                  project
                </span>
                <span className="nords-dashboard__card-time">
                  {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : ''}
                </span>
              </div>
            </div>
          ))}

          <div
            className="nords-dashboard__card nords-dashboard__card--create"
            onClick={() => setShowCreateModal(true)}
            data-testid="create-project-card"
          >
            <Plus size={32} strokeWidth={1} />
            <span>Create New Project</span>
          </div>
        </div>
      </main>
      </div>

      {/* ── Context Menu for card actions ── */}
      {contextMenu && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }} onClick={() => setContextMenu(null)} />
          <div className="nords-dashboard__context-menu" style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 10000 }}>
            <button onClick={() => { setSettingsProjectId(contextMenu.projectId); setContextMenu(null); }}>
              <Settings size={13} /> Settings
            </button>
            <button onClick={() => { handleExport(projects.find(p => p.id === contextMenu.projectId)!); }}>
              <Download size={13} /> Export
            </button>
            <button className="nords-dashboard__context-danger" onClick={() => { setDeleteTarget(projects.find(p => p.id === contextMenu.projectId)!); setContextMenu(null); }}>
              <Trash2 size={13} /> Delete
            </button>
          </div>
        </>
      )}

      {/* ── Create Project Modal ── */}
      {showCreateModal && (
        <div className="nords-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="nords-modal" onClick={e => e.stopPropagation()}>
            <div className="nords-modal__header">
              <h2>Create Project</h2>
              <button className="nords-modal__close" onClick={() => setShowCreateModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="nords-modal__body">
              {createErrors.length > 0 && (
                <div className="nords-modal__errors">
                  {createErrors.map((e, i) => <div key={i} className="nords-modal__error"><AlertTriangle size={12} /> {e}</div>)}
                </div>
              )}

              <label className="nords-modal__label">
                Name <span className="nords-modal__required">*</span>
                <div className="nords-form__icon-name-row">
                  {(() => {
                    const CreateIcon = resolveIcon(createForm.icon || 'Folder');
                    return (
                      <button
                        type="button"
                        className="nords-form__icon-btn"
                        onClick={() => setShowCreateIconPicker(!showCreateIconPicker)}
                        title="Choose project icon"
                        data-testid="create-project-icon-btn"
                      >
                        <CreateIcon size={20} strokeWidth={1.6} />
                      </button>
                    );
                  })()}
                  <input
                    className="nords-modal__input"
                    value={createForm.name}
                    onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="Product Launch Q3"
                    autoFocus
                  />
                </div>
                {showCreateIconPicker && (
                  <div style={{ marginTop: '8px' }}>
                    <IconPicker
                      currentIcon={createForm.icon || 'Folder'}
                      accentColor={createForm.accent_color || '#6b7aed'}
                      onSelect={(iconName) => {
                        setCreateForm({ ...createForm, icon: iconName });
                        setShowCreateIconPicker(false);
                      }}
                    />
                    <div style={{ marginTop: '12px', padding: '0 8px' }}>
                      <label className="nords-form__label" style={{ marginBottom: '6px' }}>Color</label>
                      <HueSlider
                        color={createForm.accent_color || '#6b7aed'}
                        onChange={(hex) => setCreateForm({ ...createForm, accent_color: hex })}
                        saturation={55}
                        lightness={50}
                      />
                    </div>
                  </div>
                )}
              </label>

              <label className="nords-modal__label">
                Description <span className="nords-modal__required">*</span>
                <textarea
                  className="nords-modal__textarea"
                  value={createForm.description}
                  onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="End-to-end planning for the Q3 product release cycle."
                  rows={3}
                />
              </label>

              <label className="nords-modal__label">
                Purpose <span className="nords-modal__required">*</span>
                <textarea
                  className="nords-modal__textarea"
                  value={createForm.purpose}
                  onChange={e => setCreateForm({ ...createForm, purpose: e.target.value })}
                  placeholder="Track dependencies, milestones, and team assignments."
                  rows={2}
                />
              </label>

              <div className="nords-modal__divider" />

              <label className="nords-modal__checkbox-label">
                <input
                  type="checkbox"
                  checked={createForm.mcp_enabled}
                  onChange={e => setCreateForm({ ...createForm, mcp_enabled: e.target.checked })}
                />
                <span>Enable Agent (MCP)</span>
              </label>

              {createForm.mcp_enabled && (
                <div className="nords-modal__mode-selector">
                  <span className="nords-modal__mode-label">Project Mode</span>
                  <div className="nords-modal__mode-cards">
                    {[
                      { key: 'explore' as const, icon: <Compass size={20} strokeWidth={1.4} />, name: 'Explore', desc: 'Open-ended discovery. No data collection or session goals.' },
                      { key: 'collect' as const, icon: <ClipboardList size={20} strokeWidth={1.4} />, name: 'Collect', desc: 'Opportunistic data capture. The agent collects properties as they surface.' },
                      { key: 'guided' as const, icon: <Target size={20} strokeWidth={1.4} />, name: 'Guided', desc: 'Goal-directed sessions. The agent steers toward completing defined objectives.' },
                    ].map(mode => (
                      <button
                        key={mode.key}
                        type="button"
                        className={`nords-modal__mode-card ${createForm.project_mode === mode.key ? 'is-active' : ''}`}
                        onClick={() => setCreateForm({ ...createForm, project_mode: mode.key })}
                      >
                        <span className="nords-modal__mode-card-icon">{mode.icon}</span>
                        <span className="nords-modal__mode-card-name">{mode.name}</span>
                        <span className="nords-modal__mode-card-desc">{mode.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="nords-modal__footer">
              <button className="nords-modal__btn nords-modal__btn--secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="nords-modal__btn nords-modal__btn--primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating…' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="nords-modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="nords-modal nords-modal--sm" onClick={e => e.stopPropagation()}>
            <div className="nords-modal__header">
              <h2>Delete Project</h2>
              <button className="nords-modal__close" onClick={() => setDeleteTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="nords-modal__body">
              <p className="nords-modal__warning">
                <AlertTriangle size={16} />
                This will permanently delete <strong>{deleteTarget.name}</strong> and all of its data. This action cannot be undone.
              </p>
            </div>
            <div className="nords-modal__footer">
              <button className="nords-modal__btn nords-modal__btn--secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="nords-modal__btn nords-modal__btn--danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Project Settings Modal ── */}
      {settingsProjectId && (
        <ProjectSettings
          isOpen={true}
          onClose={() => { setSettingsProjectId(null); loadProjects(); }}
          projectId={settingsProjectId}
        />
      )}
    </div>
  );
}
