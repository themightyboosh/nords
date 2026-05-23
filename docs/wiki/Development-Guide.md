# Development Guide

> How to set up, run, test, and contribute to Nords.

---

## Environments

| Environment | Domain | GCP Project | Purpose |
|-------------|--------|-------------|---------|
| **Local** | `localhost:5173` (client) / `localhost:3000` (server) | — | Development and debugging |
| **Staging** | `nord-stage.monumental.ax` | `nords-staging` | QA, pre-release validation, developer integration. Nightly automated database scrubbing. |
| **Production** | `nords.monumental.ax` | `nords-prod` | Live customer traffic. Strict IAM access controls. Automated daily backups with PITR. |

---

## GCP Services

Nords runs on Google Cloud Platform. Understanding the service topology helps when debugging deployment issues or reviewing infrastructure changes.

| Service | Role | Notes |
|---------|------|-------|
| **Cloud Run** | Hosts the Node.js API server and WebSocket handlers | Serverless containers; scales from 0 to N. Handles spiky multiplayer canvas loads without static VM costs. |
| **Cloud SQL** | Managed PostgreSQL | Automated replication, failover, and maintenance. Connected to Cloud Run via Private IP. |
| **Cloud Memorystore** | Redis Pub/Sub backbone | Syncs Yjs CRDT multiplayer data across horizontally-scaled Cloud Run instances. When multiple instances serve WebSocket traffic, Redis ensures all clients stay in sync. |
| **Firebase Hosting** | Serves the compiled Vite/React client | Globally distributed CDN. Deployed via GitHub Actions. |
| **Firebase Authentication** | User auth (Google SSO + email/password) | JWT tokens validated by the backend. Email verification required for write access. |
| **Firebase AI Logic** | Gemini model access | Powers Preview Chat and AI agent capabilities via the Gemini API. |

```mermaid
graph TD
    subgraph Client ["Browser Client"]
        UI["React / Vite UI"]
        Flow["React Flow Canvas"]
        Sync["Yjs CRDT Provider"]
        UI <--> Flow
        Flow <--> Sync
    end

    Auth["Firebase Authentication"]

    subgraph GCP ["GCP Environment"]
        CDN["Firebase Hosting CDN"]
        API["Cloud Run Node.js + WebSocket"]
        Redis["Cloud Memorystore Redis"]
        DB[("Cloud SQL PostgreSQL")]
    end

    Client -.-> |Login| Auth
    Auth -.-> |JWT| Client
    Client --> |App Assets| CDN
    Sync <==> |"ws:// + JWT"| API

    API <--> |Cache / PubSub| Redis
    API <--> |Persistent Save| DB
```

---

## Prerequisites

Before running Nords locally, ensure you have:

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | 20+ | Runtime for both client and server |
| **pnpm** | 9+ | Workspace-aware package manager |
| **PostgreSQL** | 15+ | Local database. Can also use Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15` |
| **Firebase CLI** | Latest | Required for auth emulation and hosting. Install: `npm install -g firebase-tools` |
| **Git** | 2.30+ | Version control |

---

## Environment Variables

Copy `.env.example` to `.env` in both the `client/` and `server/` directories and fill in:

### Server (`server/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/nords` |
| `REDIS_URL` | Redis connection string (optional for local dev) | `redis://localhost:6379` |
| `PORT` | Server port | `3000` |
| `FIREBASE_PROJECT_ID` | Firebase project identifier | `nords-staging` |
| `VITE_SKIP_AUTH` | Set `true` to bypass auth in local dev | `true` |

### Client (`client/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend URL | `http://localhost:3000` |
| `VITE_FIREBASE_API_KEY` | Firebase config — API key | *(from Firebase console)* |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase config — auth domain | `nords-staging.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase config — project ID | `nords-staging` |
| `VITE_SKIP_AUTH` | Set `true` to bypass auth in local dev | `true` |

---

## Quick Start

```bash
# 1. Clone the repo
git clone <repo-url> && cd nords

# 2. Install dependencies (pnpm workspaces)
pnpm install

# 3. Set up local database
createdb nords
pnpm --filter server db:migrate

# 4. Copy env files
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit both .env files with your local config

# 5. Start dev servers (both client + server)
pnpm dev
```

### Running Individual Services

```bash
# Start only the client (Vite dev server on :5173)
pnpm --filter client dev

# Start only the server (Node.js on :3000)
pnpm --filter server dev

# Build client for production
pnpm --filter client build

# Run client tests
pnpm --filter client test run

# Run server tests
pnpm --filter server test run

# Run database migrations
pnpm --filter server db:migrate

# Reset database (drop + recreate + migrate)
pnpm --filter server db:reset
```

---

## Project Structure

```
nords/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── stores/       # State management
│   │   └── utils/        # Shared utilities
│   └── vite.config.ts
├── server/          # Node.js + Express backend
│   ├── src/
│   │   ├── routes/       # REST API routes
│   │   ├── services/     # Business logic
│   │   ├── mcp-server.ts # MCP server implementation
│   │   └── db/           # Database migrations and queries
│   └── tsconfig.json
├── docs/            # Documentation
│   ├── wiki/        # Product wiki pages
│   └── architecture/ # Architecture documents
├── pnpm-workspace.yaml
└── package.json
```

---

## Deployment

| Environment | Trigger | Process |
|-------------|---------|---------|
| **Staging** | Push to `develop` branch | GitHub Actions → Build → Deploy client to Firebase Hosting, server to Cloud Run (`nords-staging`) |
| **Production** | Push to `main` branch | GitHub Actions → Build → Deploy client to Firebase Hosting, server to Cloud Run (`nords-prod`) |

---

## Key Technical Constraints

- **React Flow v12** — Default pathfinding edges are bypassed. Nords uses custom pure Euclidean edge math (quadratic Béziers, vector intersections) to preserve the "Distance is Data" invariant.
- **60fps minimum** — The spatial canvas must sustain 60fps during panning, zooming, and node dragging. Aggressive memoization is required in all canvas components.
- **Yjs CRDTs** — All multiplayer state is synchronized via Yjs over WebSockets. Redis Pub/Sub bridges state across horizontally-scaled Cloud Run instances.
- **JSONB properties** — Nord and Connection properties use PostgreSQL JSONB columns with dynamic schemas defined by NordTypes and ConnectionTypes.

---

*For the full infrastructure architecture, see `docs/architecture/10_technology_and_infrastructure.md`.*
