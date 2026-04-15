-- 013_connection_verb.sql
-- Add "verb" field to connection_types.
-- Verb is a secondary label like "applies" / "blocks" / "contains"
-- used in board rollups: "Blocks --applies-- spectrum value to/from - nord"

ALTER TABLE connection_types ADD COLUMN verb TEXT DEFAULT NULL;
