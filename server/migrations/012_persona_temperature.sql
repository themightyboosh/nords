-- Migration 012: Add AI temperature setting to personas.
-- Default 1.0 matches Gemini's default.
-- Range 0.0–2.0 (Gemini supports up to 2.0).

BEGIN;

ALTER TABLE personas
  ADD COLUMN temperature FLOAT NOT NULL DEFAULT 1.0
    CHECK (temperature >= 0.0 AND temperature <= 2.0);

COMMENT ON COLUMN personas.temperature IS
  'AI response temperature (0.0 = deterministic, 1.0 = balanced/default, 2.0 = maximum creativity)';

COMMIT;
