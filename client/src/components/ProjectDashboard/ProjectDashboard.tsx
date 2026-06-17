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

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderKanban, Plus, MoreHorizontal,
  Star, Users, Type,
  Trash2, Download, Settings, X, AlertTriangle, BookOpen,
  ShieldCheck, BarChart3, CreditCard, Settings2,

} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import ViewportHeader from '../Layout/ViewportHeader';
import { ColorIcon } from '../shared/ColorIcon';
import { ProjectSettings } from '../ProjectSettings/ProjectSettings';
import { useAuth } from '../../context/AuthContext';
import UserAdmin from '../Admin/UserAdmin';
import ManageUIStrings from '../Admin/ManageUIStrings';
import '../Admin/UserAdmin.css';
import './ProjectDashboard.css';

interface Project {
  id: string;
  name: string;
  icon: string | null;
  accent_color: string | null;
  description: string | null;
  purpose: string | null;
  project_mode: 'explore' | 'collect' | 'guided';

  mcp_capture_data: boolean;
  mcp_mutable: boolean;
  goals_enabled: boolean;
  is_starred: boolean;
  is_demo: boolean;
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

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null);

  // Settings modal state
  const [settingsProjectId, setSettingsProjectId] = useState<string | null>(null);

  // Admin panel state
  const { isAdmin } = useAuth();
  const [adminView, setAdminView] = useState<'projects' | 'users' | 'strings'>('projects');

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

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);


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

  // ── Star Toggle ──
  const handleToggleStar = useCallback(async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, is_starred: !p.is_starred } : p
    ));
    try {
      await api.post(`/api/projects/${projectId}/star`, {});
    } catch (err) {
      // Revert on failure
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, is_starred: !p.is_starred } : p
      ));
      console.error('Failed to toggle star:', err);
    }
  }, []);

  // ── Toggle Demo Flag ──
  const handleToggleDemo = useCallback(async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const newValue = !project.is_demo;
    // Optimistic
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, is_demo: newValue } : p
    ));
    try {
      await api.put(`/api/projects/${projectId}`, { is_demo: newValue });
    } catch (err) {
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, is_demo: !newValue } : p
      ));
      console.error('Failed to toggle demo:', err);
    }
    setContextMenu(null);
  }, [projects]);

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
        pageTitle={adminView === 'users' ? 'Users' : adminView === 'strings' ? 'UI Strings' : 'Projects'}
      />
      <div className="nords-dashboard__body">
      <aside className="nords-dashboard__sidebar">
        <div className="nords-dashboard__sidebar-header">
          <span className="nords-dashboard__sidebar-title">Workspace</span>
        </div>

        <nav className="nords-dashboard__sidebar-nav">
          <button
            className={`nords-dashboard__nav-item ${adminView === 'projects' ? 'is-active' : ''}`}
            onClick={() => setAdminView('projects')}
          >
            <FolderKanban size={14} strokeWidth={1.5} />
            All Projects
            <span className="nords-dashboard__nav-count">{projects.length}</span>
          </button>
        </nav>

        <div style={{ flex: 1 }} />

        {/* ── Admin Section (feature-flagged) ── */}
        {isAdmin && (
          <>
            <div className="nords-dashboard__sidebar-header" style={{ marginTop: 8 }}>
              <span className="nords-dashboard__sidebar-title">
                <ShieldCheck size={12} style={{ marginRight: 4 }} />
                Admin
              </span>
            </div>
            <nav className="nords-dashboard__sidebar-nav">
              <button
                className={`nords-dashboard__nav-item ${adminView === 'users' ? 'is-active' : ''}`}
                onClick={() => setAdminView('users')}
              >
                <Users size={14} strokeWidth={1.5} />
                Users
              </button>
              <button
                className={`nords-dashboard__nav-item ${adminView === 'strings' ? 'is-active' : ''}`}
                onClick={() => setAdminView('strings')}
              >
                <Type size={14} strokeWidth={1.5} />
                UI Strings
              </button>
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

        {adminView === 'users' ? (
          <UserAdmin />
        ) : adminView === 'strings' ? (
          <ManageUIStrings />
        ) : (
        <>

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

        {/* ── Favorites Row ── */}
        {projects.some(p => p.is_starred) && (
          <>
            <h2 className="nords-dashboard__section-title">
              <Star size={14} strokeWidth={1.5} style={{ color: '#f59e0b' }} />
              Favorites
            </h2>
            <div className="nords-dashboard__grid">
              {projects.filter(p => p.is_starred).map(project => (
                <div
                  key={`fav-${project.id}`}
                  className="nords-dashboard__card"
                  onClick={() => navigate(`/project/${project.id}`)}
                  data-testid={`project-card-fav-${project.id}`}
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
                      <button
                        className="nords-dashboard__star-btn is-starred"
                        onClick={(e) => handleToggleStar(e, project.id)}
                        title="Unstar"
                      >
                        <Star size={13} strokeWidth={1.5} />
                      </button>

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
                    {project.is_demo && (
                      <span className="nords-dashboard__demo-badge">
                        <BookOpen size={10} /> Demo
                      </span>
                    )}
                    <span className="nords-dashboard__card-time">
                      {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── All Projects (excludes starred) ── */}
        <h2 className="nords-dashboard__section-title">
          <FolderKanban size={14} strokeWidth={1.5} />
          All Projects
        </h2>

        <div className="nords-dashboard__grid">
          {projects.filter(p => !p.is_starred).map(project => (
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
                  <button
                    className={`nords-dashboard__star-btn ${project.is_starred ? 'is-starred' : ''}`}
                    onClick={(e) => handleToggleStar(e, project.id)}
                    title={project.is_starred ? 'Unstar' : 'Star'}
                  >
                    <Star size={13} strokeWidth={1.5} />
                  </button>

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
                {project.is_demo && (
                  <span className="nords-dashboard__demo-badge">
                    <BookOpen size={10} /> Demo
                  </span>
                )}
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
        </>
        )}
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
            {isAdmin && (
              <button onClick={() => handleToggleDemo(contextMenu.projectId)}>
                <BookOpen size={13} />
                {projects.find(p => p.id === contextMenu.projectId)?.is_demo ? 'Remove Demo Flag' : 'Flag as Demo'}
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Create Project (via unified ProjectSettings) ── */}
      {showCreateModal && (
        <ProjectSettings
          isOpen={true}
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onCreate={() => { setShowCreateModal(false); loadProjects(); }}
        />
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
