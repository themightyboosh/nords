-- 004_nords.sql

CREATE TABLE nords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES nord_types(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  properties JSONB DEFAULT '{}'::jsonb,
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  scale FLOAT DEFAULT 1.0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ NULL
);

-- GIN index specifically using jsonb_path_ops on properties column 
CREATE INDEX idx_nords_properties_gin ON nords USING GIN (properties jsonb_path_ops);
