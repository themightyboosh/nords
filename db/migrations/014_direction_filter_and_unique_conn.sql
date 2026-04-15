-- 014_direction_filter_and_unique_conn.sql
-- 1. Add direction_filter to connection_types (type-level board view setting)
-- 2. Add unique constraint: one connection per (type, source, target) pair

-- Direction filter: controls which directions are visible on the board.
-- Values: 'all', 'forward', 'reverse', 'both', 'none'
-- This is a LINE-LEVEL setting (like name, verb, properties) — NOT per-user.
ALTER TABLE connection_types ADD COLUMN IF NOT EXISTS direction_filter TEXT NOT NULL DEFAULT 'all';

-- Unique constraint: a nord pair can only have ONE connection of each type.
-- Prevents duplicates like A→B "Blocks" appearing twice.
-- Note: (source, target, type) is directional — A→B and B→A are separate.
ALTER TABLE connections
  ADD CONSTRAINT uq_connection_type_source_target
  UNIQUE (type_id, source_nord_id, target_nord_id);
