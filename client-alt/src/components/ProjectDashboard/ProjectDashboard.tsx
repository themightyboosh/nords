/**
 * ProjectDashboard.tsx — Workspace Switcher / Project List
 *
 * The "front door" of Nords — shown before entering a project.
 * Lists all projects in the workspace with metadata previews.
 *
 * Layout:
 *   - Left sidebar: workspace name, create new, search
 *   - Main area: project cards in a grid
 *   - Each card: project name, icon, nord count, last modified, preview thumbnail
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.0 Workspace Dashboard
 */

import React from 'react';
import {
  FolderKanban, Plus, Search, Clock, Users, MoreHorizontal,
  Layers, Star, Globe,
} from 'lucide-react';
import NordsLogo from '../NordsLogo';
import './ProjectDashboard.css';

interface ProjectDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Mock project data */
const PROJECTS = [
  {
    id: 'p1', name: 'Product Launch Q3', icon: '🚀', nordCount: 42, connectionCount: 86,
    lastModified: '2 min ago', members: 4, starred: true,
    description: 'End-to-end planning for the Q3 product release cycle.',
  },
  {
    id: 'p2', name: 'Architecture Review', icon: '🏗️', nordCount: 28, connectionCount: 51,
    lastModified: '1 hour ago', members: 3, starred: true,
    description: 'System architecture audit and migration planning.',
  },
  {
    id: 'p3', name: 'Design System v2', icon: '🎨', nordCount: 15, connectionCount: 22,
    lastModified: '3 days ago', members: 2, starred: false,
    description: 'Component library refresh and token standardization.',
  },
  {
    id: 'p4', name: 'Competitive Analysis', icon: '📊', nordCount: 67, connectionCount: 134,
    lastModified: '1 week ago', members: 5, starred: false,
    description: 'Market landscape mapping and feature gap analysis.',
  },
  {
    id: 'p5', name: 'Onboarding Flow', icon: '👋', nordCount: 8, connectionCount: 12,
    lastModified: '2 weeks ago', members: 2, starred: false,
    description: 'New user experience and activation funnel design.',
  },
];

const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="nords-dashboard">
      {/* Sidebar */}
      <aside className="nords-dashboard__sidebar">
        <div className="nords-dashboard__sidebar-header">
          <NordsLogo size={28} />
          <span className="nords-dashboard__workspace-name">nords</span>
        </div>

        <div className="nords-dashboard__sidebar-search">
          <Search size={13} strokeWidth={1.5} />
          <input placeholder="Search projects..." />
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

        <button className="nords-dashboard__create-btn">
          <Plus size={14} strokeWidth={2} />
          New Project
        </button>
      </aside>

      {/* Main content */}
      <main className="nords-dashboard__main">
        <div className="nords-dashboard__main-header">
          <h1 className="nords-dashboard__title">All Projects</h1>
          <button className="nords-dashboard__close-btn" onClick={onClose} title="Open active project">
            ← Back to Canvas
          </button>
        </div>

        <div className="nords-dashboard__grid">
          {PROJECTS.map(project => (
            <div
              key={project.id}
              className="nords-dashboard__card"
              onClick={onClose}
            >
              {/* Card header */}
              <div className="nords-dashboard__card-header">
                <span className="nords-dashboard__card-icon">{project.icon}</span>
                <div className="nords-dashboard__card-header-right">
                  {project.starred && <Star size={12} strokeWidth={2} className="nords-dashboard__star" />}
                  <button className="nords-dashboard__card-menu">
                    <MoreHorizontal size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Card body */}
              <h3 className="nords-dashboard__card-name">{project.name}</h3>
              <p className="nords-dashboard__card-desc">{project.description}</p>

              {/* Card footer */}
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

          {/* Create new card */}
          <div className="nords-dashboard__card nords-dashboard__card--create">
            <Plus size={32} strokeWidth={1} />
            <span>Create New Project</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProjectDashboard;
