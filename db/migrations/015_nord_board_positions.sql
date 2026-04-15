-- 015_nord_board_positions.sql
-- Introduces nord_board_positions: a per-nord, per-connection-type
-- position record that drives kanban board placement.
--
-- KEY INVARIANTS:
--   - One record per (nord_id, type_id) — UNIQUE constraint
--   - distance_x ∈ [0.0, 1.0] — maps to x-axis stage label
--   - distance_y ∈ [0.0, 1.0] — maps to y-axis stage label (quadrant)
--   - A nord appears on a board ONLY if it has a record here
--   - True orphans (nords with zero connections anywhere) appear in
--     the orphan column on EVERY board regardless of this table
--   - Nords with connections but no record here are simply not shown
--     on that board (hidden, not "unplaced")

CREATE TABLE IF NOT EXISTS nord_board_positions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nord_id     UUID        NOT NULL REFERENCES nords(id)            ON DELETE CASCADE,
  type_id     UUID        NOT NULL REFERENCES connection_types(id) ON DELETE CASCADE,
  distance_x  FLOAT       NOT NULL DEFAULT 0.5 CHECK (distance_x BETWEEN 0.0 AND 1.0),
  distance_y  FLOAT       NOT NULL DEFAULT 0.5 CHECK (distance_y BETWEEN 0.0 AND 1.0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_nord_board_position UNIQUE (nord_id, type_id)
);

CREATE INDEX IF NOT EXISTS idx_nbp_nord_id ON nord_board_positions(nord_id);
CREATE INDEX IF NOT EXISTS idx_nbp_type_id ON nord_board_positions(type_id);

-- ── Migrate existing data ─────────────────────────────────────────────
-- Seed positions from existing connections.distance_x/y.
-- For nords that appear as source on a connection, import that position.
-- For nords that appear as target on a connection, import that position.
-- DISTINCT ON ensures we only get the first position per (nord, type).

INSERT INTO nord_board_positions (nord_id, type_id, distance_x, distance_y)
SELECT DISTINCT ON (source_nord_id, type_id)
  source_nord_id AS nord_id,
  type_id,
  COALESCE(distance_x, 0.5) AS distance_x,
  COALESCE(distance_y, 0.5) AS distance_y
FROM connections
WHERE deleted_at IS NULL
ORDER BY source_nord_id, type_id, created_at ASC
ON CONFLICT (nord_id, type_id) DO NOTHING;

INSERT INTO nord_board_positions (nord_id, type_id, distance_x, distance_y)
SELECT DISTINCT ON (target_nord_id, type_id)
  target_nord_id AS nord_id,
  type_id,
  COALESCE(distance_x, 0.5) AS distance_x,
  COALESCE(distance_y, 0.5) AS distance_y
FROM connections
WHERE deleted_at IS NULL
ORDER BY target_nord_id, type_id, created_at ASC
ON CONFLICT (nord_id, type_id) DO NOTHING;
