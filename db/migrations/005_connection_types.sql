-- 005_connection_types.sql

CREATE TABLE connection_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  accent_color TEXT,
  stroke_style TEXT DEFAULT 'solid',
  x_stage_labels JSONB DEFAULT '[]'::jsonb,
  y_stage_labels JSONB DEFAULT '[]'::jsonb,
  properties_schema JSONB DEFAULT '[]'::jsonb,
  sort_order INT DEFAULT 0,
  deleted_at TIMESTAMPTZ NULL
);
