# [EPIC] Sprint 0: DevOps & Environment Foundation

**Objective:** Bootstrap reproducible local dev environment with cloud emulators, test harness, and CI scaffolding.
**Invariant:** All tests must pass locally before any upstream push. Zero remote dependencies in dev mode.
**Tech:** Vite, Firebase CLI, GCP CLI, Playwright, Vitest, Docker (Postgres local)

---

## [FEATURE] 0.1: Project Scaffold & Toolchain

### [STORY] 0.1.1: Initialize Vite + React + TypeScript Project
* **Target:** `package.json`, `vite.config.ts`, `tsconfig.json`
* **Directive:** Create production Vite project with React 18+, TypeScript strict mode, path aliases (`@/components`, `@/hooks`, etc.).
* **Ref:** `client-alt/vite.config.ts` for baseline config
* **AC:** `npm run dev` starts dev server. `npx tsc --noEmit` exits 0.

### [STORY] 0.1.2: Port Design System (CSS Variables & Tokens)
* **Target:** `src/index.css`, `src/styles/tokens.css`
* **Directive:** Extract all CSS custom properties from `client-alt/src/index.css` — HSL color tokens, spacing scale, font families (Inter/Playfair), border-radius tokens, z-index layers. Establish dark/light theme variables.
* **Ref:** `client-alt/src/index.css` (2609 bytes), `client-alt/src/styles/`
* **AC:** Both `[data-theme="light"]` and `[data-theme="dark"]` selectors exist. All tokens are CSS custom properties, no hardcoded hex values in component CSS.

### [STORY] 0.1.3: Configure ESLint + Prettier + Husky Pre-commit
* **Target:** `.eslintrc.cjs`, `.prettierrc`, `.husky/pre-commit`
* **Directive:** Strict TypeScript ESLint rules. Pre-commit hook runs `lint-staged` on `.ts/.tsx/.css` files.
* **AC:** `npx eslint . --ext .ts,.tsx` exits 0. Committing a malformed file triggers lint failure.

---

## [FEATURE] 0.2: Local Cloud Emulators

### [STORY] 0.2.1: Configure Firebase Local Emulator Suite
* **Target:** `firebase.json`, `.firebaserc`
* **Directive:** Bind Auth emulator to `127.0.0.1:9099`. No Firestore emulator needed (using Postgres). Set `FIREBASE_AUTH_EMULATOR_HOST` env var in `.env.local`.
* **Ref:** `10_technology_and_infrastructure.md` §3
* **AC:** `firebase emulators:start --only auth` starts cleanly within 10s. Auth UI accessible at `localhost:4000`.

### [STORY] 0.2.2: Local PostgreSQL via Docker Compose
* **Target:** `docker-compose.yml`, `db/init.sql`
* **Directive:** Postgres 15 container on port 5432. Default database `nords_dev`. Volume mount for persistence. Health check configured.
> [!NOTE] **Current State:** Development currently runs against live Cloud SQL instance `nords-db-main` at `136.115.68.48:5432` in GCP project `nords-spatial-1776012153`. Docker Compose remains available as a local fallback. The Cloud SQL Auth Proxy sidecar must be configured before production deployment.
* **Ref:** `10_technology_and_infrastructure.md` §2.2 (Cloud SQL for PostgreSQL)
* **AC:** `docker compose up -d db` starts Postgres. `psql -h localhost -U nords -d nords_dev -c "SELECT 1"` returns 1.

### [STORY] 0.2.3: Configure GCP CLI Profiles (Staging + Prod)
* **Target:** `scripts/gcp_setup.sh`
* **Directive:** Script creates two named gcloud configurations: `nords-staging` and `nords-prod`. Sets project IDs, default regions (us-central1). GCP Project ID: `nords-spatial-1776012153`. Cloud SQL instance: `nords-db-main`.
* **Ref:** `10_technology_and_infrastructure.md` §2.1
> [!WARNING] **GCP Architect Note:** Ensure networking provisions a Serverless VPC Access Connector for the Cloud Run environment. Cloud Run must use Private IPs to communicate securely with Cloud SQL and Memorystore without traversing the public internet.

* **AC:** `gcloud config configurations list` shows both profiles. `gcloud config configurations activate nords-staging` succeeds.

---

## [FEATURE] 0.3: Test Harness

### [STORY] 0.3.1: Configure Vitest for Unit & Integration Tests
* **Target:** `vitest.config.ts`, `src/test/setup.ts`
* **Directive:** Vitest with jsdom environment, React Testing Library, coverage thresholds (80% statements).
* **AC:** `npm run test` executes with 0 failures on a placeholder test. `npm run test:coverage` generates coverage report.

### [STORY] 0.3.2: Configure Playwright for E2E Tests
* **Target:** `playwright.config.ts`, `e2e/smoke.spec.ts`
* **Directive:** Chromium-only for speed. Base URL `http://localhost:5173`. Screenshot-on-failure enabled. Global setup starts dev server.
* **AC:** `npx playwright test` runs smoke test (page loads, title contains "Nords"). Exit code 0.

### [STORY] 0.3.3: CI Pipeline (GitHub Actions)
* **Target:** `.github/workflows/ci.yml`
* **Directive:** On push to `main` and PRs: install, lint, type-check, unit test, build. Playwright runs in separate job with Docker Compose for Postgres.
* **AC:** Push to a test branch triggers the workflow. All jobs pass green.

### [STORY] 0.3.4: Environment Variables & Config Management
* **Target:** `.env.example`, `src/config/env.ts`
* **Directive:** Define all env vars: `VITE_FIREBASE_*` (6 keys), `VITE_API_URL` (Express server), `VITE_WS_URL`, `DATABASE_URL` (server-side Postgres connection string). Type-safe config module with runtime validation (throws on missing required vars).
* **AC:** Importing `config` in any module returns typed, validated env values. Missing `VITE_FIREBASE_API_KEY` throws descriptive error at startup.
