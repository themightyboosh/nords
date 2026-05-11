-- ═══════════════════════════════════════════════════════════
-- Migration 009: Personas — AI persona definitions
-- ═══════════════════════════════════════════════════════════
-- Project-scoped persona profiles with mental models,
-- guardrails, and per-category relevance weights.
-- Avatars use DiceBear Notionists with a stored seed string.

BEGIN;

INSERT INTO schema_migrations (name) VALUES ('009_personas');

-- ═══════════════════════════════════════════════════════════
-- PERSONAS (Project-scoped AI persona definitions)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE personas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                TEXT NOT NULL DEFAULT 'New Persona',
  avatar_seed         TEXT NOT NULL DEFAULT '',           -- DiceBear Notionists seed
  background          TEXT NOT NULL DEFAULT '',           -- required: 1-2 sentence history
  primary_motivation  TEXT NOT NULL DEFAULT '',           -- required: ultimate goal
  voice_and_tone      TEXT NOT NULL DEFAULT '',           -- communication style
  guardrails          JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{mode:'always'|'never', text:'...'}]
  sort_order          INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_personas_project ON personas (project_id) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- MENTAL MODELS (ordered list, max 5 per persona — enforced at API level)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE persona_mental_models (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id  UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL DEFAULT '',
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_mental_models_persona ON persona_mental_models (persona_id);

-- ═══════════════════════════════════════════════════════════
-- CATEGORY WEIGHTS (persona ↔ connection_type relevance)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE persona_category_weights (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id         UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  connection_type_id UUID NOT NULL REFERENCES connection_types(id) ON DELETE CASCADE,
  weight             INT NOT NULL DEFAULT 0 CHECK (weight >= -100 AND weight <= 100),

  CONSTRAINT uq_persona_category UNIQUE (persona_id, connection_type_id)
);

CREATE INDEX idx_category_weights_persona ON persona_category_weights (persona_id);

COMMIT;
