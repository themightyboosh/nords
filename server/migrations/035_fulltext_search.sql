-- 035: Full-text search support for nords
-- Adds a generated tsvector column indexing title + key properties,
-- with a GIN index for fast full-text search.

ALTER TABLE nords ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(properties->>'description', '') || ' ' ||
      coalesce(properties->>'name', '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_nords_search ON nords USING GIN (search_vector);
