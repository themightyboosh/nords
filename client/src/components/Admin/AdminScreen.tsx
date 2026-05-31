import React, { useState } from 'react';
import { Settings, Users, Shield, Database, Layout, Type, FileText } from 'lucide-react';
import NordsLogo from '../NordsLogo';
import { useNavigate } from 'react-router-dom';
import UserAdmin from './UserAdmin';
import ManageUIStrings from './ManageUIStrings';

type AdminTab = 'overview' | 'users' | 'roles' | 'registry' | 'settings' | 'strings';

/** Placeholder for tabs that aren't built yet */
function ComingSoon({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '300px', color: 'var(--nords-color-text-disabled)',
    }}>
      <span style={{ fontSize: 14, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, marginTop: 6, opacity: 0.6 }}>Coming soon</span>
    </div>
  );
}

export default function AdminScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const tabs: Array<{ key: AdminTab; label: string; icon: React.ElementType }> = [
    { key: 'overview', label: 'Overview', icon: Layout },
    { key: 'users', label: 'User Management', icon: Users },
    { key: 'strings', label: 'UI Strings', icon: Type },
    { key: 'roles', label: 'Roles & Permissions', icon: Shield },
    { key: 'registry', label: 'Type Registry', icon: Database },
    { key: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="nords-dashboard" data-testid="admin-screen" data-theme="obsidian">
      <aside className="nords-dashboard__sidebar">
        <div className="nords-dashboard__sidebar-header">
          <NordsLogo size={28} />
          <span className="nords-dashboard__workspace-name" style={{ marginLeft: '-4px', opacity: 0.6 }}>admin</span>
        </div>

        <nav className="nords-dashboard__sidebar-nav" style={{ marginTop: '2rem' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`nords-dashboard__nav-item ${activeTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={14} strokeWidth={1.5} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

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
          <h1 className="nords-dashboard__title">
            {tabs.find(t => t.key === activeTab)?.label || 'Admin'}
          </h1>
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
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
        )}

        {activeTab === 'users' && <UserAdmin />}
        {activeTab === 'strings' && <ManageUIStrings />}
        {activeTab === 'roles' && <ComingSoon label="Roles & Permissions" />}
        {activeTab === 'registry' && <ComingSoon label="Type Registry" />}
        {activeTab === 'settings' && <ComingSoon label="System Settings" />}
      </main>
    </div>
  );
}
