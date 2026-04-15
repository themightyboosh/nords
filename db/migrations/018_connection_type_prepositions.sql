-- 018_connection_type_prepositions.sql
-- Per-direction preposition words for connection types.
-- Paired with the verb to form readable relationship labels:
--   e.g. verb="blocks", forward preposition="from" → "A blocks from B"
--
-- Shape: { "forward": "from", "reverse": "to", "both": "together" }
-- The "neither" direction is omitted from labels (shows as "related").
-- Each value must be a single word (enforced in UI).

ALTER TABLE connection_types
  ADD COLUMN IF NOT EXISTS direction_prepositions JSONB NOT NULL DEFAULT
    '{"forward": "from", "reverse": "to", "both": "together"}'::jsonb;
