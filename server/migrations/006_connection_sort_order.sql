-- 006: Add sort_order to connections for within-column ordering on boards.
-- This is a hidden, board-only field — never exposed in UI.
-- Default 0 so existing connections sort by created_at until first reordered.

ALTER TABLE connections ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Index for efficient within-column sort queries
CREATE INDEX IF NOT EXISTS idx_connections_sort_order ON connections (type_id, sort_order);
