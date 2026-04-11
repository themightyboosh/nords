import React from 'react';
import './CanvasMock.css';

interface CanvasMockProps {
  onNardClick: (id: string) => void;
  selectedNard: string | null;
}

const CanvasMock: React.FC<CanvasMockProps> = ({ onNardClick, selectedNard }) => {
  // A simple static layout simulating a few Nards connected by tethers
  return (
    <div className="nards-canvas-container">
      {/* SVG layer for Tethers (Lines) */}
      <svg className="nards-tethers-layer" width="100%" height="100%">
        {/* Line 1 */}
        <line 
          x1="35%" y1="40%" x2="55%" y2="55%" 
          stroke="var(--nards-color-tether-active)" 
          strokeWidth="3" 
          strokeDasharray="5,5" 
        />
        <text x="45%" y="46%" className="nards-tether-label">Blocks</text>
        
        {/* Line 2 */}
        <line 
          x1="55%" y1="55%" x2="65%" y2="35%" 
          stroke="var(--nards-color-tether-ghost)" 
          strokeWidth="2" 
        />
      </svg>

      {/* HTML layer for Nards */}
      <div 
        className={`nards-node ${selectedNard === 'nard-1' ? 'selected' : ''}`}
        style={{ left: '35%', top: '40%' }}
        onClick={() => onNardClick('nard-1')}
      >
        <div className="nards-node-icon">🔳</div>
        <div className="nards-node-title">Implement Detail Drawer UI</div>
        <div className="nards-node-meta">
          <span className="pill doing">In Progress</span>
          <span className="pill">Daniel</span>
        </div>
      </div>

      <div 
        className={`nards-node ${selectedNard === 'nard-2' ? 'selected' : ''}`}
        style={{ left: '55%', top: '55%' }}
        onClick={() => onNardClick('nard-2')}
      >
        <div className="nards-node-icon">✨</div>
        <div className="nards-node-title">Physics Engine Spike</div>
        <div className="nards-node-meta">
          <span className="pill todo">To Do</span>
          <span className="pill">Sarah</span>
        </div>
      </div>

      <div 
        className={`nards-node ${selectedNard === 'nard-3' ? 'selected' : ''}`}
        style={{ left: '65%', top: '35%' }}
        onClick={() => onNardClick('nard-3')}
      >
        <div className="nards-node-icon">👤</div>
        <div className="nards-node-title">Client Review</div>
      </div>
    </div>
  );
};

export default CanvasMock;
