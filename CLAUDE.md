# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NORDS is a spatial project management application with AI capabilities. It uses a canvas-based interface for visualizing and managing project elements ("nords"), personas, goals, and test scenarios.

## Monorepo Structure

This is a pnpm workspace monorepo with three main packages:

- **client/** - React + Vite frontend application (port 5173)
- **server/** - Express.js backend API (Node.js with TypeScript)
- **shared/** - Shared TypeScript types and utilities

## Essential Commands

### Development
```bash
# Start all packages in development mode
pnpm dev

# Start individual packages
cd client && pnpm dev      # Frontend on port 5173
cd server && pnpm dev      # Backend with watch mode
```

### Build & Test
```bash
# Build all packages
pnpm build

# Run all tests
pnpm test

# Client-specific testing
cd client
pnpm test              # Run Vitest unit tests
pnpm test:coverage     # Run with coverage
pnpm test:e2e          # Run Playwright E2E tests

# Server-specific testing
cd server
pnpm test              # Run server tests with environment variables loaded
pnpm test:watch        # Watch mode
```

### Linting
```bash
cd client && pnpm lint
```

### Database Operations
```bash
# Run migrations (from root)
pnpm db:migrate

# Rollback migrations
pnpm db:rollback

# Server-specific migration (from server/)
cd server && pnpm db:migrate

# Cloud SQL proxy (for production database)
cd server && pnpm db:proxy
```

### Demo & Screenshots
```bash
# Run demo test suite (from client/)
cd client
npx playwright test --config=playwright-demo.config.ts

# Generate screenshots
npx playwright test --config=../playwright.config.ts
```

## Architecture

### Frontend (client/)

**Core Patterns:**
- **Canvas-based spatial UI**: Main workspace uses `@xyflow/react` for a node-graph canvas where project elements ("nords") are positioned spatially
- **Lens system**: Persona-based filtering that shows different views of the same data based on selected persona
- **Three main views**:
  - **Canvas** (`CanvasEngine.tsx`) - Spatial node graph for project elements
  - **Board** (`MatrixView.tsx`) - Matrix/table view grouped by categories
  - **Goals** - DAG (Directed Acyclic Graph) visualization of goals and their relationships

**Key Components:**
- `App.tsx` - Main router and workspace shell
- `components/Canvas/CanvasEngine.tsx` - Core canvas rendering engine
- `components/Matrix/MatrixView.tsx` - Board/matrix view
- `components/ManageGoals/` - Goal DAG management
- `components/ManagePersonas/` - Persona management
- `components/TestRunner/` - Test scenario execution interface
- `components/SessionExplorer/` - AI chat session management

**State Management:**
- Context providers in `context/`:
  - `AuthContext` - Firebase authentication
  - `LensContext` - Persona lens filtering
  - `TypeRegistryContext` - Dynamic type system
  - `BoardSettingsContext` - Board view configuration

**Custom Hooks:**
- `hooks/useProjectGraph.ts` - Main project data graph
- `hooks/usePersonas.ts` - Persona management
- `hooks/useGoals.ts` - Goal DAG operations
- `hooks/useVariables.ts` - Project variables

### Backend (server/)

**Structure:**
- `routes/` - Express route handlers (REST API endpoints)
- `repositories/` - Database access layer (PostgreSQL with pg library)
- `services/` - Business logic layer
- `middleware/` - Express middleware (auth, logging, etc.)
- `schemas/` - Zod validation schemas
- `mcp-server.ts` - Model Context Protocol server for AI integration

**Key Files:**
- `index.ts` - Express app initialization and routing
- `db.ts` - PostgreSQL connection pool
- `swagger.ts` - OpenAPI/Swagger documentation
- `seed-demo.ts` - Demo data seeding script

### Database (db/)

- **migrations/** - node-pg-migrate schema migrations
- **init.sql** - Initial database schema
- **seed-board-test.ts** - Test data seeding

PostgreSQL database with spatial data model supporting:
- Projects with hierarchical structure
- Nords (project elements) with spatial positioning
- Personas with access control
- Goals with dependency DAG
- Test scenarios and AI chat sessions

## Technology Stack

**Frontend:**
- React 19 + TypeScript 6
- Vite 8 (build tool)
- @xyflow/react (canvas/graph visualization)
- Vitest (unit testing)
- Playwright (E2E testing)
- Firebase (authentication)
- Lucide React (icons)

**Backend:**
- Node.js + Express 5
- TypeScript 5.3
- PostgreSQL with pg library
- Firebase Admin SDK (auth validation)
- @google/genai (Gemini AI integration)
- Zod (validation)
- Winston (logging)
- Swagger/OpenAPI (API documentation)

## Development Notes

### Running a Single Test
```bash
# Client unit test
cd client
npx vitest run path/to/test.spec.ts

# Client E2E test
cd client
npx playwright test path/to/test.spec.ts

# Server test
cd server
npx vitest run path/to/test.spec.ts
```

### Environment Variables
- Client: Uses `VITE_` prefixed variables for Vite
- Server: Uses `.env` file loaded by tsx/ts-node
- Key variables include Google Cloud Project ID, Vertex AI model configuration, and Firebase credentials

### Playwright Configurations
- `playwright.config.ts` (root) - Screenshots and video generation from scripts/
- `client/playwright-demo.config.ts` - Demo recording suite with auth bypass (port 5174)
- `client/playwright.config.ts` - Standard E2E tests (port 5173)

### Authentication
- Firebase Authentication on frontend
- Firebase Admin SDK token verification on backend
- Demo mode can bypass auth with `VITE_SKIP_AUTH=true`

### AI Integration
- Gemini 2.5 Flash for general AI tasks
- MCP (Model Context Protocol) server for AI tool use
- Chat sessions stored in database with replay capability
