-- Migration 033: Update project_variables type check constraint
-- 
-- The old constraint only allowed legacy type names (string, number, etc.).
-- The shared propertyTypes.ts now defines canonical types (short_text, long_text,
-- currency, percentage, tags, computed, etc.) plus system types.
-- 
-- This migration drops the old constraint and adds one that accepts ALL valid
-- property type strings (canonical + legacy for backwards compatibility).

-- Drop old constraint
ALTER TABLE project_variables
  DROP CONSTRAINT IF EXISTS project_variables_type_check;

-- Add updated constraint with all canonical + legacy types
ALTER TABLE project_variables
  ADD CONSTRAINT project_variables_type_check
  CHECK (type = ANY(ARRAY[
    -- Canonical types (from shared/propertyTypes.ts)
    'short_text', 'long_text', 'url', 'email', 'phone',
    'number', 'currency', 'percentage',
    'date', 'date_range',
    'select', 'multi_select',
    'boolean', 'tags', 'computed',
    'stage', 'user', 'nord_reference', 'file',
    -- Legacy types (for backwards compatibility)
    'string', 'text', 'markdown'
  ]));

-- Normalize any existing legacy type values to canonical
UPDATE project_variables SET type = 'short_text' WHERE type = 'string';
UPDATE project_variables SET type = 'short_text' WHERE type = 'text';
UPDATE project_variables SET type = 'long_text'  WHERE type = 'markdown';
