-- 006_connections.sql

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES connection_types(id) ON DELETE CASCADE,
  source_nord_id UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  target_nord_id UUID NOT NULL REFERENCES nords(id) ON DELETE CASCADE,
  direction TEXT CHECK (direction IN ('forward','reverse','none')) DEFAULT 'none',
  distance_x FLOAT DEFAULT 0.5 CHECK (0.0 <= distance_x AND distance_x <= 1.0),
  distance_y FLOAT DEFAULT 0.5 CHECK (0.0 <= distance_y AND distance_y <= 1.0),
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_connections_unique ON connections(type_id, source_nord_id, target_nord_id) WHERE deleted_at IS NULL;
