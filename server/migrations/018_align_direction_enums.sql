-- 018_align_direction_enums.sql
--
-- Aligns the DB CHECK constraint for connection_types.default_direction
-- with the Zod schema enum: 'forward', 'reverse', 'both', 'none'.
-- Also accepts legacy values 'to', 'from', 'neither' for backward compat.

ALTER TABLE connection_types DROP CONSTRAINT IF EXISTS connection_types_default_direction_check;
ALTER TABLE connection_types ADD CONSTRAINT connection_types_default_direction_check
  CHECK (default_direction IN ('forward', 'reverse', 'both', 'none', 'to', 'from', 'neither'));
