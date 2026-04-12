# 10. Technology & Infrastructure Architecture

This document defines the production technology stack, hosting infrastructure, and environment topology for the Nords engine. The overarching strategy is to natively leverage **Google Cloud Platform (GCP)** to minimize devops complexity while ensuring massive horizontal scalability for multiplayer WebSocket operations.

---

## 1. The Technology Stack

### Frontend & Rendering
* **Framework:** React 18+ powered by Vite.
* **Spatial Rendering Engine:** React Flow. 
  * *Why?* React Flow offers a battle-tested rendering loop and `ResizeObserver` node tracking out-of-the-box. 
  * *Constraint:* Default pathfinding edges are strictly bypassed. Nords relies exclusively on custom pure Euclidean edge math calculation (Quadratic Béziers, vector intersections) to preserve the Distance is Data invariant.
* **Styling:** Vanilla CSS with HSL logic for accessibility gating.
* **Component Strategy:** Functional components with aggressive memoization to maintain 60fps at scale.

### Backend APIs & Real-Time Sync
* **Runtime:** Node.js.
* **Multiplayer Paradigm:** Yjs (CRDTs - Conflict-free Replicated Data Types) operating over WebSockets.
  * This allows granular offline-first local states that natively resolve split-brain conflicts during multi-user editing without server-side deadlocks.

### Database Layer
* **Primary Store:** **Google Cloud SQL for PostgreSQL**.
* **Data Pattern:** Relational paradigms for User, Organization, and Project mapping. Graph-JSONB paradigms for standard spatial nodes (which update uniformly and continuously).

---

## 2. Infrastructure & Environments

Nords uses isolated GCP infrastructure ensuring identical architectures with fenced database operations.

### 2.1 The Two Environments
We utilize distinct GCP Projects to ensure hard IAM boundaries.

| Environment | GCP Project Name | Domain | Purpose |
|:---|:---|:---|:---|
| **Staging** | `nords-staging` | `nord-stage.monumental.ax` | QA, pre-release validation, developer integration. Nightly automated database scrubbing. |
| **Production** | `nords-prod` | `nords.monumental.ax` | Live customer traffic. Strict IAM access controls. Automated daily/hourly SQL backups. |

### 2.2 Google Cloud Toolchain
We rely heavily on GCP primitives:

1. **Google Cloud Run (Compute)**
   * **Role:** Hosts the Node.js API servers and WebSocket connection handlers.
   * **Why?** Serverless containers scale horizontally from 0 to N instantly, capable of spinning up sufficient capacity to match spiky multiplayer spatial canvas loads without static VM costs.
2. **Google Cloud SQL (Database)**
   * **Role:** Managed PostgreSQL hosting.
   * **Why?** Automated replication, failover, and maintenance. Directly compatible with Private IPs securely linked to Cloud Run deployments without leaving the GCP network.
3. **Firebase Hosting (Static Delivery)**
   * **Role:** Serves the compiled Vite/React application.
   * **Why?** Globally distributed, highly cached CDN optimized specifically for modern web app payloads. Seamless GitHub Actions deployment integration.
4. **Google Cloud Memorystore (State Syncing)**
   * **Role:** Redis service.
   * **Why?** When Cloud Run instances autoscale (e.g., from 1 instance to 10 instances), WebSocket traffic must still sync multiplayer data between clients connected to *different* instances. Redis serves as the Pub/Sub backbone mapping the distributed Yjs CRDT payloads across all nodes instantly.

---

## 3. Authentication & Security

Nords relies on **Firebase Authentication** natively linked into the overarching GCP project. This allows us to defer login cryptography, session management, and brute-force throttling to Google.

### Supported Methods
1. **Google Single Sign-On (SSO):** One-click ubiquitous authentication path.
2. **Standard Email / Password:** Traditional auth fallback.

### Security Gates
* **Email Validation Requirement:** To prevent spam generation and ensure secure environments, accounts created via the Email/Password strategy are placed in a soft-locked state until the user validates their email address via the native Firebase OTP verification email. Database write operations strictly check for `email_verified: true` in the authenticated Firebase JWT.
* **Role-Based Access Control (RBAC):** Token payloads embed standard Admin/Editor/Viewer metadata, consumed securely by both the Frontend UI boundaries and the Cloud Run backend guardrails. 

---

## 4. Logical System Architecture Diagram

```mermaid
graph TD
    %% Environments
    subgraph Client [Browser Client]
        UI[React / Vite UI]
        Flow[React Flow Canvas]
        Sync[Yjs CRDT Provider]
        UI <--> Flow
        Flow <--> Sync
    end

    Auth[Firebase Authentication\nGoogle SSO + Email/PW]
    
    subgraph GCP Environment [GCP Project: nords-prod]
        CDN[Firebase Hosting CDN]
        API[Cloud Run Node.js\nWebSocket APIs]
        Redis[Cloud Memorystore\nRedis Pub/Sub Sync]
        DB[(Cloud SQL PostgreSQL)]
    end

    %% Flows
    Client -.-> |Login request| Auth
    Auth -.-> |JWT Token| Client
    Client --> |Fetches App Assets| CDN
    Sync <==> |ws:// Real-time Traffic + JWT| API
    
    API <--> |Cache/PubSub| Redis
    API <--> |Persistent Save| DB
```
