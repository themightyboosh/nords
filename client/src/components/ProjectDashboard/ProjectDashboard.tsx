/**
 * ProjectDashboard.tsx — Workspace Switcher / Project List
 *
 * The "front door" of Nords — shown before entering a project.
 * Uses mock data for Sprint 3; wired to API in a future sprint.
 */

import {
  FolderKanban, Plus, Search, Clock, Users, MoreHorizontal,
  Layers, Star, Globe, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NordsLogo from '../NordsLogo';
import './ProjectDashboard.css';

const PROJECTS = [
  { id: 'p1', name: 'Product Launch Q3', icon: '🚀', nordCount: 42, connectionCount: 86, lastModified: '2 min ago', members: 4, starred: true, description: 'End-to-end planning for the Q3 product release cycle.' },
  { id: 'p2', name: 'Architecture Review', icon: '🏗️', nordCount: 28, connectionCount: 51, lastModified: '1 hour ago', members: 3, starred: true, description: 'System architecture audit and migration planning.' },
  { id: 'p3', name: 'Design System v2', icon: '🎨', nordCount: 15, connectionCount: 22, lastModified: '3 days ago', members: 2, starred: false, description: 'Component library refresh and token standardization.' },
  { id: 'p4', name: 'Competitive Analysis', icon: '📊', nordCount: 67, connectionCount: 134, lastModified: '1 week ago', members: 5, starred: false, description: 'Market landscape mapping and feature gap analysis.' },
  { id: 'p5', name: 'Onboarding Flow', icon: '👋', nordCount: 8, connectionCount: 12, lastModified: '2 weeks ago', members: 2, starred: false, description: 'New user experience and activation funnel design.' },
];

export default function ProjectDashboard() {
  const navigate = useNavigate();

  return (
    <div className="nords-dashboard" data-testid="project-dashboard" data-theme="obsidian">
      <aside className="nords-dashboard__sidebar">
        <div className="nords-dashboard__sidebar-header">
          <NordsLogo size={28} />
        </div>

        <div className="nords-dashboard__sidebar-search">
          <Search size={13} strokeWidth={1.5} />
          <input placeholder="Search projects..." data-testid="project-search" />
        </div>

        <nav className="nords-dashboard__sidebar-nav">
          <button className="nords-dashboard__nav-item is-active">
            <FolderKanban size={14} strokeWidth={1.5} />
            All Projects
            <span className="nords-dashboard__nav-count">{PROJECTS.length}</span>
          </button>
          <button className="nords-dashboard__nav-item">
            <Star size={14} strokeWidth={1.5} />
            Starred
            <span className="nords-dashboard__nav-count">{PROJECTS.filter(p => p.starred).length}</span>
          </button>
          <button className="nords-dashboard__nav-item">
            <Clock size={14} strokeWidth={1.5} />
            Recent
          </button>
          <button className="nords-dashboard__nav-item">
            <Globe size={14} strokeWidth={1.5} />
            Shared With Me
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

        <div className="nords-dashboard__grid">
          {PROJECTS.map(project => (
            <div
              key={project.id}
              className="nords-dashboard__card"
              onClick={() => navigate(`/project/${project.id}`)}
              data-testid={`project-card-${project.id}`}
            >
              <div className="nords-dashboard__card-header">
                <span className="nords-dashboard__card-icon">{project.icon}</span>
                <div className="nords-dashboard__card-header-right">
                  {project.starred && <Star size={12} strokeWidth={2} className="nords-dashboard__star" />}
                  <button className="nords-dashboard__card-menu">
                    <MoreHorizontal size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <h3 className="nords-dashboard__card-name">{project.name}</h3>
              <p className="nords-dashboard__card-desc">{project.description}</p>
              <div className="nords-dashboard__card-footer">
                <span className="nords-dashboard__card-stat">
                  <Layers size={11} strokeWidth={1.5} />
                  {project.nordCount} nords
                </span>
                <span className="nords-dashboard__card-stat">
                  <Users size={11} strokeWidth={1.5} />
                  {project.members}
                </span>
                <span className="nords-dashboard__card-time">{project.lastModified}</span>
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
