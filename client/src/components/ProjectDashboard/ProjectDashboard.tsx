/**
 * ProjectDashboard.tsx — Workspace Switcher / Project List
 *
 * The "front door" of Nords — shown before entering a project.
 * Now loads real projects from the Express API.
 */

import { useState, useEffect } from 'react';
import {
  FolderKanban, Plus, Users, MoreHorizontal,
  Layers, Star, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import NordsLogo from '../NordsLogo';
import './ProjectDashboard.css';

interface Project {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Mock fallback while API loads or if API is unavailable
const MOCK_PROJECTS: Project[] = [
  { id: 'mock-1', name: 'Product Launch Q3', icon: '🚀', description: 'End-to-end planning for the Q3 product release cycle.', created_at: '', updated_at: '2 min ago' },
  { id: 'mock-2', name: 'Architecture Review', icon: '🏗️', description: 'System architecture audit and migration planning.', created_at: '', updated_at: '1 hour ago' },
];

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await api.get<Project[]>('/api/projects');
        setProjects(data);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError(err instanceof Error ? err.message : 'Failed to load');
        setProjects(MOCK_PROJECTS); // Graceful fallback
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  const displayProjects = projects.length > 0 ? projects : MOCK_PROJECTS;

  return (
    <div className="nords-dashboard" data-testid="project-dashboard" data-theme="obsidian">
      <aside className="nords-dashboard__sidebar">
        <div className="nords-dashboard__sidebar-header">
          <NordsLogo size={28} />
        </div>

        <nav className="nords-dashboard__sidebar-nav">
          <button className="nords-dashboard__nav-item is-active">
            <FolderKanban size={14} strokeWidth={1.5} />
            All Projects
            <span className="nords-dashboard__nav-count">{displayProjects.length}</span>
          </button>
          <button className="nords-dashboard__nav-item">
            <Star size={14} strokeWidth={1.5} />
            Starred
            <span className="nords-dashboard__nav-count">0</span>
          </button>
        </nav>

        <div style={{ flex: 1 }} />

        <nav className="nords-dashboard__sidebar-nav">
          <button 
            className="nords-dashboard__nav-item"
            style={{ color: 'var(--nords-color-accent)' }}
            onClick={() => window.open('#', '_blank')}
          >
            <BookOpen size={14} strokeWidth={1.5} />
            Guides & Tutorials
          </button>
        </nav>

        <button className="nords-dashboard__create-btn" data-testid="create-project-btn">
          <Plus size={14} strokeWidth={2} />
          New Project
        </button>
      </aside>

      <main className="nords-dashboard__main">
        <div className="nords-dashboard__main-header">
          <h1 className="nords-dashboard__title">All Projects</h1>
        </div>

        {loading && (
          <div className="nords-dashboard__loading">
            <div className="nords-canvas-loading__spinner" />
            <span>Loading projects…</span>
          </div>
        )}

        <div className="nords-dashboard__grid">
          {displayProjects.map(project => (
            <div
              key={project.id}
              className="nords-dashboard__card"
              onClick={() => navigate(`/project/${project.id}`)}
              data-testid={`project-card-${project.id}`}
            >
              <div className="nords-dashboard__card-header">
                <span className="nords-dashboard__card-icon">{project.icon || '📁'}</span>
                <div className="nords-dashboard__card-header-right">
                  <button className="nords-dashboard__card-menu">
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

          <div className="nords-dashboard__card nords-dashboard__card--create" onClick={() => {}} data-testid="create-project-card">
            <Plus size={32} strokeWidth={1} />
            <span>Create New Project</span>
          </div>
        </div>
      </main>
    </div>
  );
}
