/**
 * PropertyTable — Shared property grid component.
 *
 * Used by ManageTypes (instance properties) and ManageVariables (collection properties).
 * Renders the standard grid with: arrows | name | type | req | [hide] | actions
 *
 * The `showHide` prop controls whether the HIDE column is rendered (Types = yes, Collections = no).
 * The `renderDetail` slot renders expanded content when a row's pencil button is clicked.
 */

import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil } from 'lucide-react';
import {
  UI_PROPERTY_TYPES, PROPERTY_TYPE_META,
  normalizePropertyType, type PropertyType,
} from '@nords/shared/propertyTypes';
import '../ManageTypes/ManageTypes.css';

// ── Types ──

export interface PropertyRow {
  /** Unique ID (string index for Types, DB id for Collections) */
  id: string;
  name: string;
  type: string;
  required: boolean;
  /** card_row value — null means hidden. Only used when showHide=true */
  cardRow?: number | null;
  /** Any extra data needed by the detail renderer */
  data?: any;
}

export interface PropertyTableProps {
  /** Normalized property rows */
  items: PropertyRow[];
  /** Whether to show the HIDE column (ManageTypes=true, ManageVariables=false) */
  showHide?: boolean;
  /** Currently expanded row id */
  expandedId: string | null;
  /** Toggle expanded state */
  onExpandToggle: (id: string | null) => void;
  /** Update property name */
  onNameChange: (id: string, name: string) => void;
  /** Update property type */
  onTypeChange: (id: string, type: string) => void;
  /** Update required flag */
  onRequiredChange: (id: string, required: boolean) => void;
  /** Update hidden state (card_row). Only called when showHide=true */
  onHideChange?: (id: string, hidden: boolean) => void;
  /** Reorder by index */
  onReorder: (fromIdx: number, toIdx: number) => void;
  /** Delete a property */
  onDelete: (id: string) => void;
  /** Add a new property */
  onAdd: () => void;
  /** Render expanded detail for a given row */
  renderDetail: (item: PropertyRow) => React.ReactNode;
  /** Header label (default: "Instance Properties") */
  label?: string;
  /** Hint below the table */
  hint?: string;
  /** Max property count — shows alert when reached */
  maxCount?: number;
}

// ── Component ──

export function PropertyTable({
  items,
  showHide = false,
  expandedId,
  onExpandToggle,
  onNameChange,
  onTypeChange,
  onRequiredChange,
  onHideChange,
  onReorder,
  onDelete,
  onAdd,
  renderDetail,
  label = 'Properties',
  hint,
  maxCount,
}: PropertyTableProps) {
  return (
    <div className="manage-types__field">
      <div className="manage-types__field-header">
        <label className="manage-types__field-label">{label}</label>
        <button className="manage-types__add-prop-btn" onClick={onAdd}>
          <Plus size={12} />
          <span>Add Property</span>
        </button>
      </div>

      <div className="manage-types__props-table">
        <div
          className="manage-types__props-header"
          style={showHide ? undefined : { gridTemplateColumns: '24px 1fr 100px 36px 56px' }}
        >
          <span></span>
          <span>Name</span>
          <span>Type</span>
          <span>Req</span>
          {showHide && <span>Hide</span>}
          <span></span>
        </div>

        {items.map((item, idx) => {
          const isExpanded = expandedId === item.id;
          const propType = normalizePropertyType(item.type);
          const isComputed = propType === 'computed';

          return (
            <div key={item.id} className="manage-types__props-row-group">
              <div
                className={`manage-types__props-row ${isExpanded ? 'manage-types__props-row--expanded' : ''}`}
                style={showHide ? undefined : { gridTemplateColumns: '24px 1fr 100px 36px 56px' }}
              >
                {/* Up/Down arrows */}
                <div className="manage-types__prop-arrows">
                  <button
                    className="manage-types__prop-arrow"
                    disabled={idx === 0}
                    onClick={() => onReorder(idx, idx - 1)}
                    title="Move up"
                  >
                    <ChevronUp size={12} />
                  </button>
                  <button
                    className="manage-types__prop-arrow"
                    disabled={idx === items.length - 1}
                    onClick={() => onReorder(idx, idx + 1)}
                    title="Move down"
                  >
                    <ChevronDown size={12} />
                  </button>
                </div>

                {/* Name */}
                <input
                  type="text"
                  className="manage-types__prop-input"
                  value={item.name}
                  onChange={e => onNameChange(item.id, e.target.value)}
                  placeholder="Property name"
                />

                {/* Type select */}
                <select
                  className="manage-types__prop-select"
                  value={propType}
                  onChange={e => onTypeChange(item.id, e.target.value)}
                >
                  {UI_PROPERTY_TYPES.map(pt => (
                    <option key={pt} value={pt}>{PROPERTY_TYPE_META[pt].label}</option>
                  ))}
                </select>

                {/* Required checkbox */}
                <div className="manage-types__prop-req-cell">
                  {isComputed ? (
                    <span className="manage-types__prop-req-na" title="Computed fields cannot be required">—</span>
                  ) : (
                    <input
                      type="checkbox"
                      className="manage-types__prop-req-check"
                      checked={item.required}
                      onChange={e => onRequiredChange(item.id, e.target.checked)}
                      disabled={showHide && item.cardRow == null}
                      title={showHide && item.cardRow == null
                        ? 'Unhide this property to make it required'
                        : 'Required'}
                    />
                  )}
                </div>

                {/* Hide checkbox (only for ManageTypes) */}
                {showHide && (
                  <div className="manage-types__prop-req-cell">
                    <input
                      type="checkbox"
                      className="manage-types__prop-req-check"
                      checked={item.cardRow == null}
                      onChange={e => onHideChange?.(item.id, e.target.checked)}
                      title={item.cardRow != null ? 'Hide this property' : 'Show this property'}
                    />
                  </div>
                )}

                {/* Actions: edit + delete */}
                <div className="manage-types__prop-actions">
                  <button
                    className={`manage-types__prop-edit ${isExpanded ? 'is-active' : ''}`}
                    onClick={() => onExpandToggle(isExpanded ? null : item.id)}
                    title="Edit defaults & options"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    className="manage-types__prop-delete"
                    onClick={() => onDelete(item.id)}
                    title="Remove property"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Expandable detail */}
              {isExpanded && (
                <div className="manage-types__prop-detail">
                  {renderDetail(item)}
                </div>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="manage-types__props-empty">
            No properties defined. Click "Add Property" to create one.
          </div>
        )}
      </div>


    </div>
  );
}
