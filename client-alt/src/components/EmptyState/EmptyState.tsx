/**
 * EmptyState.tsx — Zero-Nord Canvas Onboarding
 *
 * Renders when a project has zero nords. This is the first screen
 * a user sees after creating a new project. It guides them to:
 *   1. Create their first Nord type
 *   2. Add their first Nord
 *   3. Understand the spatial paradigm
 *
 * Design: centered hero with animated gradient border, three
 * action cards underneath in a horizontal row.
 *
 * @see docs/frontend/04_ui_and_interactions.md §1.1 Onboarding
 */

import React from 'react';
import { Plus, Layers, BookOpen, Sparkles } from 'lucide-react';
import './EmptyState.css';

interface EmptyStateProps {
  onAddNord: () => void;
  onManageTypes: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onAddNord, onManageTypes }) => {
  return (
    <div className="nords-empty-state">
      {/* Background grid — same as canvas for visual continuity */}
      <div className="nords-empty-state__grid" />

      {/* Hero section */}
      <div className="nords-empty-state__hero">
        <div className="nords-empty-state__glow" />
        <Sparkles className="nords-empty-state__icon" size={48} strokeWidth={1} />
        <h1 className="nords-empty-state__title">Your Spatial Canvas is Empty</h1>
        <p className="nords-empty-state__subtitle">
          Start building your knowledge graph by creating your first Nord.
          Every idea, task, and relationship begins here.
        </p>

        <button className="nords-empty-state__cta" onClick={onAddNord}>
          <Plus size={18} strokeWidth={2} />
          Create Your First Nord
        </button>
      </div>

      {/* Action cards */}
      <div className="nords-empty-state__actions">
        <div className="nords-empty-state__action-card" onClick={onManageTypes}>
          <Layers size={24} strokeWidth={1.5} />
          <h3>Define Types</h3>
          <p>Create Nord types (Task, Person, Idea) with custom properties and colors.</p>
        </div>

        <div className="nords-empty-state__action-card" onClick={onAddNord}>
          <Plus size={24} strokeWidth={1.5} />
          <h3>Add Nords</h3>
          <p>Drop nodes onto the canvas. Connect them with typed relationships.</p>
        </div>

        <div className="nords-empty-state__action-card">
          <BookOpen size={24} strokeWidth={1.5} />
          <h3>Learn the Paradigm</h3>
          <p>Position encodes meaning. Distance is data. The canvas is the database.</p>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;
