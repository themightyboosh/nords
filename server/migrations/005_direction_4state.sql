-- ═══════════════════════════════════════════════════════════
-- Migration 005: Expand Direction Enum to 4-State Model
-- ═══════════════════════════════════════════════════════════
-- Adds 'both' and 'neither' to the direction CHECK constraints
-- on both connections and connection_types tables.
--
-- Direction semantics:
--   'forward'  → arrowhead at target, chevron label, spectrum enabled
--   'reverse'  → arrowhead at source, chevron label, spectrum enabled
--   'both'     → arrowheads at both ends, shared distance value
--   'neither'  → no arrowheads, metadata-only (spectrum disabled)

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('005_direction_4state');

-- ── connections.direction: expand from 3-state to 4-state ──
ALTER TABLE connections DROP CONSTRAINT IF EXISTS connections_direction_check;
ALTER TABLE connections ADD CONSTRAINT connections_direction_check
  CHECK (direction IN ('forward', 'reverse', 'both', 'neither', 'none'));

-- ── connection_types.default_direction: expand ──
ALTER TABLE connection_types DROP CONSTRAINT IF EXISTS connection_types_default_direction_check;
ALTER TABLE connection_types ADD CONSTRAINT connection_types_default_direction_check
  CHECK (default_direction IN ('to', 'from', 'both', 'neither', 'none'));

COMMIT;
