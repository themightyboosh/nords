-- 019_measurement_mode.sql
-- Adds measurement_mode column to connection_types table.
-- Controls how connections are measured/displayed:
--   'spectrum'  → 1D column board, single-axis stage labels
--   'quadrant'  → 2D grid board, X + Y stage labels
--   'none'      → No board, no spectrum — context-only connections

ALTER TABLE connection_types
ADD COLUMN IF NOT EXISTS measurement_mode TEXT NOT NULL DEFAULT 'spectrum'
CHECK (measurement_mode IN ('spectrum', 'quadrant', 'none'));
