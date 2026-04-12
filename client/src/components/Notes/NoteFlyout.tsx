import React from 'react';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NoteAddScreen() {
  const navigate = useNavigate();

  return (
    <div className="nords-dashboard" data-testid="notes-screen" style={{ flexDirection: 'column' }}>
      <header className="nords-settings__header" style={{ borderBottom: '1px solid var(--nords-color-border-subtle)', background: 'var(--nords-color-bg-surface)' }}>
        <button 
          className="nords-settings__action-btn"
          style={{ background: 'transparent', border: 'none' }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <h2 className="nords-settings__title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} /> New Global Note
        </h2>
        <button className="nords-settings__save" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Save size={14} /> Submit Note
        </button>
      </header>

      <main className="nords-settings__content" style={{ display: 'flex', justifyContent: 'center', background: 'var(--nords-color-bg-canvas)' }}>
        <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: 'var(--nords-space-lg)', marginTop: '2rem' }}>
          
          <input 
            type="text" 
            placeholder="Note Title" 
            className="nords-settings__input" 
            style={{ fontSize: '1.5rem', height: '60px', padding: '0 20px', background: 'var(--nords-color-bg-surface)', border: 'none', borderRadius: 'var(--nords-radius-md)', boxShadow: 'var(--nords-shadow-sm)' }}
          />

          <textarea 
            placeholder="Write your note here using Markdown..." 
            className="nords-settings__input"
            style={{ 
              minHeight: '400px', 
              padding: '20px', 
              fontSize: '1rem', 
              resize: 'vertical', 
              background: 'var(--nords-color-bg-surface)',
              border: 'none',
              borderRadius: 'var(--nords-radius-md)',
              boxShadow: 'var(--nords-shadow-sm)',
              fontFamily: 'var(--nords-font-primary)'
            }}
          />

          <div className="nords-settings__pref-row" style={{ padding: '20px', background: 'var(--nords-color-bg-surface)', borderRadius: 'var(--nords-radius-md)' }}>
            <div className="nords-settings__pref-info">
              <span className="nords-settings__pref-label">Pin to Dashboard</span>
              <span className="nords-settings__pref-desc">Make this note visible on the main workspace selector.</span>
            </div>
            <label className="nords-settings__toggle">
              <input type="checkbox" />
              <div className="nords-settings__toggle-slider"></div>
            </label>
          </div>

        </div>
      </main>
    </div>
  );
}
