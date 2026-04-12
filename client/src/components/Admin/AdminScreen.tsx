import React from 'react';
import { Settings, Users, Shield, Database, Layout, BookOpen } from 'lucide-react';
import NordsLogo from '../NordsLogo';
import { useNavigate } from 'react-router-dom';

export default function AdminScreen() {
  const navigate = useNavigate();

  return (
    <div className="nords-dashboard" data-testid="admin-screen" data-theme="obsidian">
      <aside className="nords-dashboard__sidebar">
        <div className="nords-dashboard__sidebar-header">
          <NordsLogo size={28} />
          <span className="nords-dashboard__workspace-name" style={{ marginLeft: '-4px', opacity: 0.6 }}>admin</span>
        </div>

        <nav className="nords-dashboard__sidebar-nav" style={{ marginTop: '2rem' }}>
          <button className="nords-dashboard__nav-item is-active">
            <Layout size={14} strokeWidth={1.5} />
            Overview
          </button>
          <button className="nords-dashboard__nav-item">
            <Users size={14} strokeWidth={1.5} />
            User Management
          </button>
          <button className="nords-dashboard__nav-item">
            <Shield size={14} strokeWidth={1.5} />
            Roles & Permissions
          </button>
          <button className="nords-dashboard__nav-item">
            <Database size={14} strokeWidth={1.5} />
            Type Registry
          </button>
          <button className="nords-dashboard__nav-item">
            <Settings size={14} strokeWidth={1.5} />
            System Settings
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

        <button 
          className="nords-dashboard__create-btn"
          style={{ background: 'transparent', color: 'var(--nords-color-text-tertiary)', border: '1px solid var(--nords-color-border-subtle)', marginTop: 'var(--nords-space-md)' }}
          onClick={() => navigate('/')}
        >
          Back to Projects
        </button>
      </aside>

      <main className="nords-dashboard__main">
        <div className="nords-dashboard__main-header">
          <h1 className="nords-dashboard__title">Organization Settings</h1>
        </div>

        <div className="nords-settings-panel" style={{ width: '100%', maxWidth: '800px', boxShadow: 'none' }}>
          <div className="nords-settings__content">
            <section className="nords-settings__section">
              <h2 className="nords-settings__section-title">General Information</h2>
              <div className="nords-settings__field">
                <label className="nords-settings__label">Organization Name</label>
                <input className="nords-settings__input" defaultValue="Acme Corp" />
              </div>
              <div className="nords-settings__field">
                <label className="nords-settings__label">Admin Email</label>
                <input className="nords-settings__input" defaultValue="admin@example.com" disabled />
              </div>
              <button className="nords-settings__save">Save Changes</button>
            </section>
            
            <div className="nords-settings__divider" style={{ margin: '2rem 0' }}></div>

            <section className="nords-settings__section">
              <h2 className="nords-settings__section-title nords-settings__section-title--danger">Danger Zone</h2>
              <div className="nords-settings__danger-card">
                <div className="nords-settings__danger-info">
                  <span className="nords-settings__danger-action">Delete Organization</span>
                  <span className="nords-settings__danger-detail">
                    Permanently remove your organization and all related spatial project data. This action cannot be undone.
                  </span>
                </div>
                <button className="nords-settings__danger-btn">Delete Organization</button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
