import React from 'react';
import './DetailDrawer.css';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nardId: string | null;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({ isOpen, onClose, nardId }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Optional: Add a subtle overlay for mobile, but keep canvas clickable on desktop if possible.
          Let's just use a slide-in for now. */}
      <div className="nards-drawer nards-glass">
        <header className="nards-drawer-header">
          <div className="nards-drawer-type">🔳 Task</div>
          <button className="nards-close-btn" onClick={onClose}>×</button>
        </header>

        <div className="nards-drawer-content">
          <h1 className="nards-drawer-title" contentEditable suppressContentEditableWarning>
            Implement Detail Drawer UI
          </h1>
          
          <div className="nards-properties-list">
            <div className="nards-property-row">
              <span className="nards-prop-label">Assignee</span>
              <span className="nards-prop-value nards-pill">Daniel</span>
            </div>
            <div className="nards-property-row">
              <span className="nards-prop-label">Status</span>
              <span className="nards-prop-value nards-pill status-doing">In Progress</span>
            </div>
            <div className="nards-property-row nards-add-property">
              <span>+ Add Property</span>
            </div>
          </div>

          <div className="nards-drawer-markdown">
            <p>This is a simulated markdown description of what needs to be done. It acts exactly like a Notion page. You can add images, bullet points, etc.</p>
            <ul>
              <li>Build Drawer component</li>
              <li>Add properties list</li>
              <li>Make editable</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default DetailDrawer;
