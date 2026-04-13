-- 011_measurement_modes.sql
-- Add measurement_mode to connection_types to control how distance is interpreted.
--
-- Measurement modes:
--   spectrum  → 1D: Euclidean distance, resolved to X-axis stage labels
--   quadrant  → 2D: X/Y deltas, resolved to quadrant labels
--   none      → No distance computation (e.g. Relevance, visual-only connections)

ALTER TABLE connection_types ADD COLUMN measurement_mode TEXT NOT NULL DEFAULT 'spectrum'
  CHECK (measurement_mode IN ('spectrum', 'quadrant', 'none'));

-- Set Relevance to 'none' since it's computed, not measured
UPDATE connection_types SET measurement_mode = 'none' WHERE is_system = true;
