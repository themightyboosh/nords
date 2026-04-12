# [EPIC] 2: Core Data Model & PostgreSQL

**Objective:** Define the canonical database schema, migration tooling, and typed API layer for all Nords primitives.
**Invariant:** All spatial data stored as normalized 0.0–1.0 floats. JSONB for flexible metadata. Soft deletes everywhere.
**Tech:** PostgreSQL 15, node-pg, JSONB, SQL migrations
**Ref:** `02_data_model_and_physics.md`, `08_property_types_reference.md`

---

## [FEATURE] 2.1: Migration Framework & Core Tables

### [STORY] 2.1.1: Migration Runner Setup
* **Target:** `db/migrate.ts`, `db/migrations/`
* **Directive:** Lightweight migration runner using raw SQL files (no ORM). Tracks applied migrations in `schema_migrations` table. Supports `up` and `down` commands.
* **AC:** `npm run db:migrate` applies all pending migrations. `npm run db:rollback` reverts the last migration. Idempotent — running migrate twice is a no-op.

### [STORY] 2.1.2: Users & Organizations Tables
* **Target:** `db/migrations/001_users_orgs.sql`
* **Directive:** `users` table: `id UUID PK`, `firebase_uid TEXT UNIQUE`, `email TEXT`, `display_name TEXT`, `avatar_url TEXT`, `role TEXT DEFAULT 'member'`, `created_at TIMESTAMPTZ`, `deleted_at TIMESTAMPTZ NULL`. `organizations` table: `id UUID PK`, `name TEXT`, `slug TEXT UNIQUE`. `org_members` junction: user_id, org_id, role.
* **AC:** Migration applies cleanly. `INSERT INTO users` succeeds. Unique constraint on `firebase_uid` enforced.

### [STORY] 2.1.3: Projects Table
* **Target:** `db/migrations/002_projects.sql`
* **Directive:** `projects` table: `id UUID PK`, `org_id UUID FK`, `name TEXT`, `description TEXT`, `icon TEXT`, `created_by UUID FK`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `deleted_at TIMESTAMPTZ NULL`. Index on `org_id`.
* **AC:** Migration applies. FK constraint to organizations enforced. Soft delete via `deleted_at IS NULL` filter.

---

## [FEATURE] 2.2: Graph Primitives

### [STORY] 2.2.1: Nord Types Table
* **Target:** `db/migrations/003_nord_types.sql`
* **Directive:** `nord_types` table: `id UUID PK`, `project_id UUID FK`, `name TEXT`, `icon TEXT`, `accent_color TEXT` (HSL), `properties_schema JSONB`, `scale_property TEXT NULL`, `sort_order INT`, `deleted_at TIMESTAMPTZ NULL`. The `properties_schema` JSONB stores array of `{name, type, config}` objects.
* **Ref:** `02_data_model.md` §1.2, `08_property_types_reference.md`
* **AC:** Inserting a nord_type with `properties_schema: [{"name":"Status","type":"select","config":{"options":["To Do","Done"]}}]` succeeds.

### [STORY] 2.2.2: Nords Table
* **Target:** `db/migrations/004_nords.sql`
* **Directive:** `nords` table: `id UUID PK`, `project_id UUID FK`, `type_id UUID FK → nord_types`, `title TEXT`, `description TEXT` (markdown), `properties JSONB`, `position_x FLOAT`, `position_y FLOAT`, `scale FLOAT DEFAULT 1.0`, `created_by UUID FK`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `deleted_at TIMESTAMPTZ NULL`. GIN index on `properties`.
* **AC:** Insert nord with `properties: {"Status": "To Do", "Assignee": "user-uuid"}` succeeds. Query `WHERE properties->>'Status' = 'To Do'` returns rows.
> [!TIP] **DBA Note:** Implement `GIN` indexes specifically using `jsonb_path_ops` on the `properties` column. Since the MCP AI agent will perform dynamic multi-key filtering across these arbitrary schemas, standard B-Trees will fail to optimize these queries.


### [STORY] 2.2.3: Connection Types Table
* **Target:** `db/migrations/005_connection_types.sql`
* **Directive:** `connection_types` table: `id UUID PK`, `project_id UUID FK`, `name TEXT`, `accent_color TEXT`, `stroke_style TEXT DEFAULT 'solid'`, `x_stage_labels JSONB`, `y_stage_labels JSONB`, `properties_schema JSONB`, `sort_order INT`, `deleted_at TIMESTAMPTZ NULL`. Stage labels are arrays of strings (e.g., `["To Do","Doing","Done"]`).
* **Ref:** `08_property_types_reference.md` (dual-axis stages), `04_ui.md` §1.13
* **AC:** Insert with `x_stage_labels: ["To Do","Doing","Done"]` succeeds. Query retrieves labels for Matrix column headers.

### [STORY] 2.2.4: Connections Table
* **Target:** `db/migrations/006_connections.sql`
* **Directive:** `connections` table: `id UUID PK`, `project_id UUID FK`, `type_id UUID FK → connection_types`, `source_nord_id UUID FK → nords`, `target_nord_id UUID FK → nords`, `direction TEXT CHECK (direction IN ('forward','reverse','none'))`, `distance_x FLOAT DEFAULT 0.5 CHECK (0.0 <= distance_x AND distance_x <= 1.0)`, `distance_y FLOAT DEFAULT 0.5`, `properties JSONB`, `created_at TIMESTAMPTZ`, `deleted_at TIMESTAMPTZ NULL`. Composite unique on `(type_id, source_nord_id, target_nord_id)`.
* **Ref:** `02_data_model.md` §1.3, §1.5
* **AC:** Insert connection with `distance_x: 0.75` succeeds. Inserting `distance_x: 1.5` fails CHECK constraint. Duplicate type+source+target fails unique constraint.

---

## [FEATURE] 2.3: Snapshots & Comments

### [STORY] 2.3.1: Snapshots Table
* **Target:** `db/migrations/007_snapshots.sql`
* **Directive:** `snapshots` table: `id UUID PK`, `project_id UUID FK`, `name TEXT`, `description TEXT`, `snapshot_data JSONB` (full graph state: nords with positions, connections with distances, type schemas), `created_by UUID FK`, `created_at TIMESTAMPTZ`. Snapshots are immutable — no `updated_at`.
* **Ref:** `02_data_model.md` §2.2
* **AC:** Insert snapshot with full JSONB payload. No UPDATE allowed (enforce via application layer initially, DB trigger later).

### [STORY] 2.3.2: Comments Table
* **Target:** `db/migrations/008_comments.sql`
* **Directive:** `comments` table: `id UUID PK`, `project_id UUID FK`, `target_type TEXT CHECK (IN ('nord','connection','general'))`, `target_id UUID NULL`, `parent_comment_id UUID NULL FK → comments` (for threading), `author_id UUID FK → users`, `body TEXT`, `resolved BOOLEAN DEFAULT false`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`, `deleted_at TIMESTAMPTZ NULL`.
* **Ref:** `04_ui.md` §1.8
* **AC:** Insert general comment (target_id NULL). Insert nord comment. Insert reply (parent_comment_id set). Query threaded comments ordered by created_at.

---

## [FEATURE] 2.4: API Data Access Layer

### [STORY] 2.4.1: Database Connection Pool
* **Target:** `src/server/db.ts`
* **Directive:** `node-pg` Pool with connection string from `DATABASE_URL`. Max 20 connections. Idle timeout 30s.
> [!WARNING] **DBA Note:** Because Cloud Run scales containers horizontally from 0 to N instantly, raw Postgres connections can be exhausted across the cluster. You **must** utilize the Cloud SQL Auth Proxy with built-in pooling or configure PgBouncer on the database side. Drop the idle timeout much lower (e.g., 5-10s) because Cloud Run suspends background CPU, which can leave dead connections hanging.
 SSL required in production. Typed query helper wrapping `pool.query()` with generics.
* **Ref:** `10_technology_and_infrastructure.md` §5.2 (connection pooling)
* **AC:** Unit test: `db.query<User>('SELECT * FROM users WHERE id = $1', [id])` returns typed result. Pool metrics accessible for monitoring.

### [STORY] 2.4.2: TypeScript Type Definitions for All Entities
* **Target:** `src/types/entities.ts`
* **Directive:** Export interfaces: `Nord`, `NordType`, `Connection`, `ConnectionType`, `Project`, `Snapshot`, `Comment`, `User`. All JSONB fields typed as `Record<string, unknown>` with specific narrowing types for known shapes (e.g., `PropertySchema[]`).
* **AC:** All interfaces compile with `tsc --noEmit`. No `any` types. Import used by at least one other module.

### [STORY] 2.4.3: CRUD Repository Pattern
* **Target:** `src/server/repositories/nords.ts`, `connections.ts`, `projects.ts`
* **Directive:** Each entity gets a repository with: `findById()`, `findByProject()`, `create()`, `update()`, `softDelete()`. All queries filter `WHERE deleted_at IS NULL` by default. Return typed results.
* **AC:** Integration test: create a nord, retrieve it, update title, soft-delete it, verify `findById` no longer returns it.
