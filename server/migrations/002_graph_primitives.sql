-- ═══════════════════════════════════════════════════════════
-- Migration 002: Graph Primitives — Types, Nords, Connections
-- ═══════════════════════════════════════════════════════════
-- The four core spatial primitives of the Nords engine.
-- JSONB is used for flexible property schemas and instance data.
-- Positions are normalized floats. Distances are CHECK-constrained 0.0–1.0.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('002_graph_primitives');

-- ═══════════════════════════════════════════════════════════
-- NORD TYPES (Schema definitions for node cards)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE nord_types (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  icon               TEXT DEFAULT 'Square',
  accent_color       TEXT,
  properties_schema  JSONB NOT NULL DEFAULT '[]'::jsonb,
  scale_property     TEXT,
  sort_order         INT NOT NULL DEFAULT 0,
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX idx_nord_types_project ON nord_types (project_id) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- NORDS (Node card instances)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE nords (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id      UUID NOT NULL REFERENCES nord_types(id) ON DELETE RESTRICT,
  title        TEXT NOT NULL DEFAULT 'Untitled',
  description  TEXT DEFAULT '',
  properties   JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x   FLOAT NOT NULL DEFAULT 0.0,
  position_y   FLOAT NOT NULL DEFAULT 0.0,
  scale        FLOAT NOT NULL DEFAULT 1.0,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at   TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════
-- CONNECTION TYPES (Schema definitions for edges/lines)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE connection_types (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  accent_color       TEXT,
  stroke_style       TEXT NOT NULL DEFAULT 'solid',
  default_direction  TEXT NOT NULL DEFAULT 'none' CHECK (default_direction IN ('to', 'from', 'none')),
  x_stage_labels     JSONB NOT NULL DEFAULT '[]'::jsonb,
  y_stage_labels     JSONB NOT NULL DEFAULT '[]'::jsonb,
  properties_schema  JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order         INT NOT NULL DEFAULT 0,
  deleted_at         TIMESTAMPTZ
);

CREATE INDEX idx_connection_types_project ON connection_types (project_id) WHERE deleted_at IS NULL;

-- ═══════════════════════════════════════════════════════════
-- CONNECTIONS (Edge instances linking two nords)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id         UUID NOT NULL REFERENCES connection_types(id) ON DELETE RESTRICT,
  source_nord_id  UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  target_nord_id  UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  direction       TEXT NOT NULL DEFAULT 'none' CHECK (direction IN ('forward', 'reverse', 'none')),
  distance_x      FLOAT NOT NULL DEFAULT 0.5 CHECK (distance_x >= 0.0 AND distance_x <= 1.0),
  distance_y      FLOAT NOT NULL DEFAULT 0.5 CHECK (distance_y >= 0.0 AND distance_y <= 1.0),
  properties      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMPTZ,

  -- Prevent duplicate edges of the same type between the same two nords
  CONSTRAINT uq_connection_type_source_target UNIQUE (type_id, source_nord_id, target_nord_id)
);

COMMIT;
