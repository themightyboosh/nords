-- ═══════════════════════════════════════════════════════════
-- Migration 003: Snapshots & Comments
-- ═══════════════════════════════════════════════════════════
-- Snapshots are immutable graph keyframes (enforced by trigger in 004).
-- Comments support threading via parent_comment_id self-reference.

BEGIN;

INSERT INTO schema_migrations (version) VALUES ('003_snapshots_comments');

-- ═══════════════════════════════════════════════════════════
-- SNAPSHOTS (Immutable graph state captures)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  snapshot_data  JSONB NOT NULL,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  -- No updated_at — snapshots are immutable
);

-- ═══════════════════════════════════════════════════════════
-- COMMENTS (Threaded, polymorphic target)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE comments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  target_type        TEXT NOT NULL CHECK (target_type IN ('nord', 'connection', 'general')),
  target_id          UUID,
  parent_comment_id  UUID REFERENCES comments(id) ON DELETE CASCADE,
  author_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  body               TEXT NOT NULL DEFAULT '',
  resolved           BOOLEAN NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at         TIMESTAMPTZ
);

COMMIT;
