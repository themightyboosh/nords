import React, { useState } from 'react';
import { X, Square, Plus, User } from 'lucide-react';
import './DetailDrawer.css';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nardId: string | null;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'connections' | 'comments'>('properties');

  return (
    <>
      <div className={`nards-drawer-scrim ${isOpen ? 'is-visible' : ''}`} onClick={onClose} />

      <aside className={`nards-detail-drawer ${isOpen ? 'is-open' : ''}`}>
        <header className="nards-drawer__header">
          <div className="nards-drawer__type-badge">
            <span className="nards-drawer__type-icon" style={{ backgroundColor: '#4da6ff' }}>
              <Square size={10} strokeWidth={2.5} color="white" />
            </span>
            <span>Task</span>
          </div>
          <button className="nards-drawer__close" onClick={onClose} aria-label="Close drawer">
            <X size={14} strokeWidth={2} />
          </button>
        </header>

        <div className="nards-drawer__title-area">
          <h2 className="nards-drawer__title" contentEditable suppressContentEditableWarning>
            Physics Engine Evaluation Spike
          </h2>
        </div>

        <div className="nards-drawer__tabs">
          {(['properties', 'connections', 'comments'] as const).map(tab => (
            <button
              key={tab}
              className={`nards-drawer__tab ${activeTab === tab ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="nards-drawer__content">
          {activeTab === 'properties' && (
            <div className="nards-drawer__properties">
              <div className="nards-property">
                <span className="nards-property__label">Status</span>
                <span className="nards-property__value nards-property__value--status-active">In Progress</span>
              </div>
              <div className="nards-property">
                <span className="nards-property__label">Assignee</span>
                <div className="nards-property__value nards-property__value--user">
                  <span className="nards-property__avatar" style={{ backgroundColor: '#059669' }}>
                    <User size={10} color="white" />
                  </span>
                  Sarah Chen
                </div>
              </div>
              <div className="nards-property">
                <span className="nards-property__label">Priority</span>
                <span className="nards-property__value nards-property__value--priority">High</span>
              </div>
              <div className="nards-property">
                <span className="nards-property__label">Sprint</span>
                <span className="nards-property__value">Sprint 4</span>
              </div>
              <div className="nards-property">
                <span className="nards-property__label">Points</span>
                <span className="nards-property__value nards-property__value--mono">8</span>
              </div>
              <button className="nards-drawer__add-property">
                <Plus size={12} strokeWidth={2} />
                Add property
              </button>

              <div className="nards-drawer__description">
                <h3 className="nards-drawer__section-title">Description</h3>
                <div className="nards-drawer__markdown">
                  <p>Evaluate potential physics libraries for the force-directed graph engine. Primary candidates:</p>
                  <ul>
                    <li><strong>d3-force</strong> — Battle-tested, massive community, flexible simulation</li>
                    <li><strong>react-force-graph</strong> — React wrapper around d3-force with WebGL renderer</li>
                    <li><strong>matter.js</strong> — Full rigid-body physics (overkill?)</li>
                  </ul>
                  <p>Key criteria: spring tension accuracy for the 0.0→1.0 semantic scale, performance at 200+ nodes, and compatibility with "The Reveal" tweening.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'connections' && (
            <div className="nards-drawer__connections">
              <div className="nards-connection">
                <div className="nards-connection__line-type">
                  <span className="nards-connection__line-color" style={{ background: '#4da6ff' }} />
                  Blocks
                </div>
                <div className="nards-connection__target">Implement Detail Drawer</div>
                <div className="nards-connection__stepper">
                  <span className="nards-connection__value">0.72</span>
                  <span className="nards-connection__label-text">Partial Block</span>
                </div>
              </div>
              <div className="nards-connection">
                <div className="nards-connection__line-type">
                  <span className="nards-connection__line-color" style={{ background: '#34d399' }} />
                  Assigned To
                </div>
                <div className="nards-connection__target">Sarah Chen</div>
                <div className="nards-connection__stepper">
                  <span className="nards-connection__value">0.15</span>
                  <span className="nards-connection__label-text">Primary</span>
                </div>
              </div>
              <button className="nards-drawer__add-property">
                <Plus size={12} strokeWidth={2} />
                Add connection
              </button>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="nards-drawer__comments">
              <div className="nards-comment">
                <div className="nards-comment__header">
                  <span className="nards-comment__avatar" style={{ backgroundColor: '#2563eb' }}>D</span>
                  <span className="nards-comment__author">Daniel</span>
                  <span className="nards-comment__time">2h ago</span>
                </div>
                <p className="nards-comment__body">Let's make sure we benchmark at 500+ nodes. PRD says 200 but we need headroom.</p>
              </div>
              <div className="nards-comment">
                <div className="nards-comment__header">
                  <span className="nards-comment__avatar" style={{ backgroundColor: '#a78bfa' }}>AI</span>
                  <span className="nards-comment__author">Claude</span>
                  <span className="nards-comment__time">1h ago</span>
                </div>
                <p className="nards-comment__body">d3-force with WebGL via @react-three/fiber should handle 2000+ nodes at 60fps. I can prepare a benchmark comparison.</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default DetailDrawer;
