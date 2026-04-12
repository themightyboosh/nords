/**
 * ManageTypes.tsx — Type Schema Editor Modal
 *
 * Full-screen modal for managing the project's type definitions.
 * This is the admin interface for the "Nord-Builder" and "Line Library"
 * concepts from the PRD.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Manage Types                                        [X] │
 *   │ Add or remove properties. Changes apply to all...       │
 *   ├────────────┬─────────────────────────────────────────────┤
 *   │ NORD TYPES │  ☐ Task                         NORD TYPE  │
 *   │ CONN TYPES │                                            │
 *   │            │  Properties          [+ Add Property]      │
 *   │ ☐ Task   > │  ┌──────────────────────────────────────┐  │
 *   │ ☒ Bug    > │  │ Name   │ Type   │ Values  │ Card Row │  │
 *   │ ☐ Person > │  │ Status │ enum   │ To Do...│ Row 1    │  │
 *   │ ☐ Artifact> │  │ ...   │ ...    │ ...     │ ...      │  │
 *   │            │  └──────────────────────────────────────┘  │
 *   │ + New Type │  Common properties (all types): ...        │
 *   └────────────┴─────────────────────────────────────────────┘
 *
 * Two tabs in the sidebar: Nord Types and Connection Types.
 * Connection types additionally show Semantic stage label configuration.
 *
 * Properties table supports:
 *   - Drag reorder (via GripVertical handle)
 *   - Inline editing of name, data type, values
 *   - Card Row assignment (which row the property shows on the nord card)
 *   - Delete button (revealed on hover)
 *
 * Available data types: string, markdown, enum, number, date, person_ref,
 *   tag[], url, spectrum_1d, spectrum_2d, boolean
 *
 * @see docs/product/06_admin_and_templates.md §1.1 Nord-Builder
 * @see docs/product/06_admin_and_templates.md §1.2 Line Library
 */

import React, { useState } from 'react';
import {
  X, Plus, Trash2, GripVertical, ChevronRight,
  Square, Bug, User, FileText, Target, Lightbulb, Layers, AlertTriangle,
} from 'lucide-react';
import './ManageTypes.css';

/* ═══════════════════════════════════════════════════════════════════ */
/* TYPE DEFINITIONS                                                   */
/*                                                                    */
/* Static definitions for the mockup. In production, these would be   */
/* fetched from the project's saved type schema.                      */
/* ═══════════════════════════════════════════════════════════════════ */

/** Nord type definitions with their custom property schemas */
const NORD_TYPES = [
  {
    name: 'Task', icon: Square, color: '#4da6ff',
    properties: [
      { name: 'Status', type: 'enum', values: 'To Do, In Progress, Review, Done', display: 1 },
      { name: 'Assignee', type: 'person_ref', values: '', display: 2 },
      { name: 'Estimate', type: 'string', values: '', display: 0 },
      { name: 'Priority', type: 'enum', values: 'Critical, High, Normal, Low', display: 0 },
      { name: 'Due Date', type: 'date', values: '', display: 0 },
    ],
  },
  {
    name: 'Bug', icon: Bug, color: '#f87171',
    properties: [
      { name: 'Severity', type: 'enum', values: 'Critical, Major, Minor, Trivial', display: 1 },
      { name: 'Browser', type: 'string', values: '', display: 2 },
      { name: 'Steps to Reproduce', type: 'markdown', values: '', display: 0 },
      { name: 'Affected Version', type: 'string', values: '', display: 0 },
    ],
  },
  {
    name: 'Person', icon: User, color: '#34d399',
    properties: [
      { name: 'Role', type: 'string', values: '', display: 1 },
      { name: 'Team', type: 'string', values: '', display: 2 },
      { name: 'Email', type: 'string', values: '', display: 0 },
      { name: 'Capacity', type: 'spectrum_1d', values: '', display: 0 },
    ],
  },
  {
    name: 'Artifact', icon: FileText, color: '#fbbf24',
    properties: [
      { name: 'Status', type: 'enum', values: 'Draft, Review, Approved, Published', display: 1 },
      { name: 'Owner', type: 'person_ref', values: '', display: 2 },
      { name: 'File Type', type: 'string', values: '', display: 0 },
      { name: 'URL', type: 'url', values: '', display: 0 },
    ],
  },
];

/**
 * Connection type definitions with Semantic stage labels.
 * stageLabels define how the continuous 0.0–1.0 spectrum is
 * quantized into named buckets for human readability.
 *
 * @see docs/architecture/02_data_model_and_physics.md §1.4 The Semantic stage
 */
const CONNECTION_TYPES = [
  {
    name: 'Blocks', color: '#4da6ff',
    stageLabels: 'None, Soft Block, Hard Block',
    properties: [
      { name: 'Severity', type: 'enum', values: 'Hard Block, Soft Block' },
      { name: 'Notes', type: 'string', values: '' },
    ],
  },
  {
    name: 'Depends', color: '#fbbf24',
    stageLabels: 'Could, Should, Must',
    properties: [
      { name: 'Dependency Type', type: 'enum', values: 'Must, Should, Could' },
      { name: 'Lag', type: 'number', values: '' },
    ],
  },
  {
    name: 'Relates', color: '#a78bfa',
    stageLabels: 'Weak, Related, Strong',
    properties: [
      { name: 'Relationship', type: 'string', values: '' },
      { name: 'Strength', type: 'spectrum_1d', values: '' },
    ],
  },
  {
    name: 'Assigned', color: '#34d399',
    stageLabels: '25%, 50%, 75%, 100%',
    properties: [
      { name: 'Role', type: 'string', values: '' },
      { name: 'Allocation', type: 'spectrum_1d', values: '' },
    ],
  },
];

/** All supported property data types in the type schema system */
const DATA_TYPES = [
  'string', 'markdown', 'enum', 'number', 'date', 'person_ref',
  'tag[]', 'url', 'spectrum_1d', 'spectrum_2d', 'boolean',
];

/* ═══════════════════════════════════════════════════════════════════ */
/* COMPONENT                                                          */
/* ═══════════════════════════════════════════════════════════════════ */

interface ManageTypesProps {
  /** Callback to close the modal */
  onClose: () => void;
}

const ManageTypes: React.FC<ManageTypesProps> = ({ onClose }) => {
  /** 'nords' or 'connections' — which tab is active in the sidebar */
  const [activeTab, setActiveTab] = useState<'nords' | 'connections'>('nords');
  /** Index of the currently selected type in the active tab's list */
  const [selectedType, setSelectedType] = useState(0);

  // Resolve the currently displayed type based on active tab + selection
  const nordType = NORD_TYPES[selectedType] || NORD_TYPES[0];
  const connType = CONNECTION_TYPES[selectedType > CONNECTION_TYPES.length - 1 ? 0 : selectedType] || CONNECTION_TYPES[0];
  const activeType = activeTab === 'nords' ? nordType : connType;
  const TypeIcon = activeTab === 'nords' ? nordType.icon : Square;

  return (
    <div className="nords-modal-backdrop" onClick={onClose}>
      <div className="nords-modal nords-glass" onClick={(e) => e.stopPropagation()}>

        {/* ── Modal Header ── */}
        <div className="nords-modal__header">
          <h2 className="nords-modal__title">Manage Types</h2>
          <p className="nords-modal__subtitle">Add or remove properties. Changes apply to all instances of a type.</p>
          <button className="nords-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="nords-modal__body">

          {/* ── Sidebar: Tab toggle + type list ── */}
          <div className="nords-manage__sidebar">
            {/* Nord Types / Connection Types tab toggle */}
            <div className="nords-manage__tabs">
              <button
                className={`nords-manage__tab ${activeTab === 'nords' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('nords'); setSelectedType(0); }}
              >
                Nord Types
              </button>
              <button
                className={`nords-manage__tab ${activeTab === 'connections' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('connections'); setSelectedType(0); }}
              >
                Connection Types
              </button>
            </div>

            {/* Type list — shows all types in the active tab */}
            <div className="nords-manage__type-list">
              {(activeTab === 'nords' ? NORD_TYPES : CONNECTION_TYPES).map((type, i) => {
                const Icon = 'icon' in type ? (type as any).icon : Square;
                return (
                  <button
                    key={type.name}
                    className={`nords-manage__type-item ${selectedType === i ? 'is-active' : ''}`}
                    onClick={() => setSelectedType(i)}
                  >
                    {activeTab === 'nords' ? (
                      <Icon size={14} strokeWidth={2} color={type.color} />
                    ) : (
                      <span className="nords-manage__type-swatch" style={{ background: type.color }} />
                    )}
                    <span>{type.name}</span>
                    <ChevronRight size={12} className="nords-manage__type-chevron" />
                  </button>
                );
              })}
              {/* Create new type button */}
              <button className="nords-manage__type-add">
                <Plus size={12} />
                <span>New {activeTab === 'nords' ? 'Nord' : 'Connection'} Type</span>
              </button>
            </div>
          </div>

          {/* ── Detail Panel: type configuration ── */}
          <div className="nords-manage__detail">
            {/* Type header — icon/swatch + name + badge */}
            <div className="nords-manage__detail-header">
              {activeTab === 'nords' ? (
                <TypeIcon size={18} strokeWidth={2} color={activeType.color} />
              ) : (
                <span className="nords-manage__detail-swatch" style={{ background: activeType.color }} />
              )}
              <h3 className="nords-manage__detail-name">{activeType.name}</h3>
              <span className="nords-manage__detail-badge" style={{ color: activeType.color }}>
                {activeTab === 'nords' ? 'Nord Type' : 'Connection Type'}
              </span>
            </div>

            {/* Connection-specific: Semantic stage label configuration
             * These labels map to the quantized buckets of the 0.0–1.0 spectrum.
             */}
            {activeTab === 'connections' && 'stageLabels' in activeType && (
              <div className="nords-manage__stage-section">
                <label className="nords-manage__field-label">Spectrum stage Labels</label>
                <input
                  className="nords-manage__field-input"
                  value={(activeType as any).stageLabels}
                  readOnly
                  title="Comma-separated labels for quantizing the 0.0–1.0 distance value"
                />
                <span className="nords-manage__field-hint">Quantize the 0.0–1.0 spectrum into named buckets</span>
              </div>
            )}

            {/* ── Properties Table ── */}
            <div className="nords-manage__props-header">
              <h4 className="nords-manage__props-title">Properties</h4>
              <button className="nords-manage__props-add">
                <Plus size={12} />
                Add Property
              </button>
            </div>

            <div className="nords-manage__props-table">
              {/* Table header */}
              <div className="nords-manage__props-thead">
                <span className="nords-manage__props-th nords-manage__props-th--drag" />
                <span className="nords-manage__props-th nords-manage__props-th--name">Name</span>
                <span className="nords-manage__props-th nords-manage__props-th--type">Data Type</span>
                <span className="nords-manage__props-th nords-manage__props-th--values">Values / Config</span>
                {activeTab === 'nords' && (
                  <span className="nords-manage__props-th nords-manage__props-th--display">Card Row</span>
                )}
                <span className="nords-manage__props-th nords-manage__props-th--actions" />
              </div>

              {/* Property rows */}
              {activeType.properties.map((prop, i) => (
                <div key={prop.name} className="nords-manage__props-row" draggable>
                  {/* Drag handle */}
                  <span className="nords-manage__props-cell nords-manage__props-cell--drag">
                    <GripVertical size={10} />
                  </span>
                  {/* Property name */}
                  <span className="nords-manage__props-cell nords-manage__props-cell--name">
                    <input className="nords-manage__inline-input" value={prop.name} readOnly />
                  </span>
                  {/* Data type selector */}
                  <span className="nords-manage__props-cell nords-manage__props-cell--type">
                    <select className="nords-manage__inline-select" value={prop.type} readOnly>
                      {DATA_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                    </select>
                  </span>
                  {/* Values/config (enum values, etc.) */}
                  <span className="nords-manage__props-cell nords-manage__props-cell--values">
                    <input
                      className="nords-manage__inline-input nords-manage__inline-input--small"
                      value={prop.values || '—'}
                      readOnly
                      placeholder="—"
                    />
                  </span>
                  {/* Card Row assignment (nord types only) */}
                  {activeTab === 'nords' && 'display' in prop && (
                    <span className="nords-manage__props-cell nords-manage__props-cell--display">
                      {(prop as any).display > 0 ? `Row ${(prop as any).display}` : '—'}
                    </span>
                  )}
                  {/* Delete button (visible on row hover) */}
                  <span className="nords-manage__props-cell nords-manage__props-cell--actions">
                    <button className="nords-manage__row-delete" title="Remove property from all instances">
                      <Trash2 size={11} />
                    </button>
                  </span>
                </div>
              ))}
            </div>

            {/* Common properties note */}
            <div className="nords-manage__common-note">
              <strong>Common properties</strong> (all types): Title (string), Scale (spectrum_1d), Description (markdown), Tags (tag[])
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageTypes;
