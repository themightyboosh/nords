-- 012_expand_direction_check.sql
-- Expand the direction check constraint to include 'both' and 'neither'
-- for bidirectional and non-directional connections.

ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_direction_check;
ALTER TABLE connections ADD CONSTRAINT connections_direction_check
  CHECK (direction IN ('forward', 'reverse', 'both', 'neither', 'none'));
