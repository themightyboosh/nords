-- ═══════════════════════════════════════════════════════════
-- Migration 026: User Favorites (star projects)
-- ═══════════════════════════════════════════════════════════
-- Tracks which projects a user has starred/favorited.
-- Uses a simple join table with composite PK.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('026_user_favorites');

CREATE TABLE user_favorites (
  user_id    UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, project_id)
);

CREATE INDEX idx_user_favorites_user ON user_favorites(user_id);

COMMIT;
