import React from 'react';
import { useReactFlow } from '@xyflow/react';
import './DetailDrawer.css';

interface DetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nordId: string | null;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({ isOpen, onClose, nordId }) => {
  const { getNode } = useReactFlow();
  if (!isOpen || !nordId) return null;

  const node = getNode(nordId);
  const title = node?.data?.title as string || 'Unknown Node';
  const type = node?.data?.type as string || 'Task';

  return (
    <>
      {/* Optional: Add a subtle overlay for mobile, but keep canvas clickable on desktop if possible.
          Let's just use a slide-in for now. */}
      <div className="nords-drawer nords-glass">
        <header className="nords-drawer-header">
          <div className="nords-drawer-type">🔳 {type}</div>
          <button className="nords-close-btn" onClick={onClose}>×</button>
        </header>

        <div className="nords-drawer-content">
          <h1 className="nords-drawer-title" contentEditable suppressContentEditableWarning>
            {title}
          </h1>
          
          <div className="nords-properties-list">
            <div className="nords-property-row">
              <span className="nords-prop-label">Assignee</span>
              <span className="nords-prop-value nords-pill">Daniel</span>
            </div>
            <div className="nords-property-row">
              <span className="nords-prop-label">Status</span>
              <span className="nords-prop-value nords-pill status-doing">In Progress</span>
            </div>
            <div className="nords-property-row nords-add-property">
              <span>+ Add Property</span>
            </div>
          </div>

          <div className="nords-drawer-markdown">
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
