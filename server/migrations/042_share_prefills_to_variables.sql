-- Migration 042: Share link prefills → Collection Variables
-- Changes prefills from nord_id/property_name/property_value to variable_id/value
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Add new columns
ALTER TABLE share_link_prefills
  ADD COLUMN IF NOT EXISTS variable_id UUID REFERENCES project_variables(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS value TEXT;

-- Drop old columns (data loss is acceptable — prefills are admin-configured, not user data)
ALTER TABLE share_link_prefills
  DROP COLUMN IF EXISTS nord_id,
  DROP COLUMN IF EXISTS property_name,
  DROP COLUMN IF EXISTS property_value;

-- Add index for variable lookup
CREATE INDEX IF NOT EXISTS idx_share_link_prefills_variable
  ON share_link_prefills (variable_id);

-- Make variable_id required for new rows
ALTER TABLE share_link_prefills
  ALTER COLUMN variable_id SET NOT NULL;

COMMIT;
