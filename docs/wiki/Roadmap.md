# Roadmap

> Nords is a spatial graph engine for structured thinking — the human/AI knowledge bridge. This roadmap tracks what we've shipped, what's next, and where we're headed.

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ | Shipped |
| 🔄 | In Progress |
| 🔵 | Planned |
| ⚪ | Under Consideration |

---

## Phase 1: Foundation + Wow ✅

Core product with the three signature features that define Nords' identity. 2D canvas, no native AI layout — pure spatial semantics.

| Status | Feature | Description |
|--------|---------|-------------|
| ✅ | **Spatial Graph Canvas** | 2D canvas powered by React Flow v12. Nords as draggable cards, connections as styled edges with distance anchoring |
| ✅ | **Nords with Full Content** | Typed node cards with dynamic property schemas (14 field types), markdown, comments |
| ✅ | **Connection Schemas** | Custom React Flow quadratic Bézier edges with directional arrows, stroke styles, and semantic stage labels |
| ✅ | **Board View** | Kanban-style columns driven by `distance_x` values on a selected ConnectionType |
| ✅ | **Persona Lens** | Radial heatmap view filtered by Persona category weights and mental models |
| ✅ | **Goals Lens** | DAG canvas for goal orchestration with prerequisite chains, exclusion groups, and property bindings |
| ✅ | **The Reveal** | Physics-based animated transitions when switching views, filtering, or changing data |
| ✅ | **Nord DNA** | Portable context URLs — every Nord has a unique URL that dumps a full context payload |
| ✅ | **Real-time Multiplayer** | Shared canvas via Yjs CRDTs with granular soft-locking |
| ✅ | **Immutable Snapshots** | Point-in-time graph state captures with history |
| ✅ | **Web Access Tokens** | Per-project, SHA-256 hashed, show-once, revokable tokens for external MCP access |
| ✅ | **Global Icon Library** | Lucide icon set for project, type, and goal icons |
| ✅ | **Connection Detail Drawer** | Arrow direction toggle, spectrum slider, per-connection properties and comments |
| ✅ | **MCP Server** | TypeScript direct-DB server with 20+ tools across read-only, session, and mutable tiers |
| ✅ | **Preview Chat** | Built-in AI chat with session management, Dev Mode (system prompt + tool call timeline) |
| ✅ | **Session Management** | Save, load, reset AI sessions with full state tracking |
| ✅ | **Model Switching** | Gemini 2.0 Flash, 2.5 Flash, 2.5 Pro |
| ✅ | **Ethnographic Interview Prompt** | Grand Tour / Probing / Laddering techniques in system prompt |
| ✅ | **Goal DetailDrawer** | Flow config (prerequisites, ends-session, exclusion group), property bindings, default toggle |
| 🔵 | **CSV & JSON Import/Export** | Bulk data in/out for seeding and migration |
| 🔵 | **Full RAG Export** | Optimized context dump (Markdown/JSON/YAML) for external AI pipelines |
| 🔵 | **Ghost Lines** | Ambient connection hints showing potential relationships |
| 🔵 | **Initialization Flow** | Guided project setup with template injection |

---

## Phase 2: Intelligence + Depth

AI-powered analysis, external integrations, and deeper spatial semantics.

| Status | Feature | Description |
|--------|---------|-------------|
| 🔄 | **Mutable MCP Mode** | Full agent write access (create/update/delete Nords and Connections). Controlled by project-level `mcp_mutable` flag |
| 🔵 | **Ingest Pipeline** | Generic framework for automatically creating Nords and Connections from external data sources. See [Ingest Pipeline](#ingest-pipeline) below |
| 🔵 | **Goal Completion Actions** | Trigger automated side-effects when a Goal is achieved. See [Goal Completion Actions](#goal-completion-actions) below |
| 🔵 | **AI Consumer Mode** | Graph analysis, gap detection, pattern recognition across the canvas |
| 🔵 | **Tension Detection** | AI flags spatial contradictions — nords positioned close but semantically distant, or vice versa |
| 🔵 | **Gravity Summary** | Always-on AI summarization of the current visible canvas state |
| 🔵 | **Spatial Pivot Table** | Matrix / Kanban bridge — cross-reference Nords by two ConnectionTypes simultaneously |
| 🔵 | **Semantic Zoom** | Progressive detail levels based on zoom — icons at far, titles at mid, full cards at close |
| 🔵 | **Heat View** | Thermal intensity overlay mapping connection density, staleness, and activity hubs |
| 🔵 | **Temporal Player** | Smooth playback through snapshot history with spring-physics transitions |
| 🔵 | **Snapshot Diffing** | Split-screen and overlay comparison between two snapshots |
| 🔵 | **Perspective Mode** | View the canvas locked to a single Persona's category weights |
| 🔵 | **Template Marketplace** | Admin-published project templates with sample data |
| 🔵 | **Webhook & Event Bus** | Emit events on Nord creation, Connection changes, Snapshot saves — enabling Slack notifications, Jira sync, and custom integrations alongside MCP |
| 🔵 | **Migration Importers** | Dedicated Trello and Notion importers mapping columns to semantic stage values and boards to projects |

---

## Phase 3: Expansion + Growth

Cross-project intelligence, advanced AI authorship, and enterprise features.

| Status | Feature | Description |
|--------|---------|-------------|
| 🔵 | **Wormholes** | Cross-project connections. See [Wormholes](#wormholes) below |
| 🔵 | **AI Author Mode** | AI spawns and suggests spatial setups natively, requiring human approval before committing |
| 🔵 | **Gravity Well** | Optional physics mode for discovery-driven exploratory layouts — nords attract/repel based on connection weight |
| 🔵 | **Sandbox Branching** | Fork a Snapshot to play out "what-if" scenarios without affecting the live state |
| 🔵 | **Flatten to Doc** | Export the spatial layout into a formatted, linear PDF or Notion-style document for executive consumption |
| 🔵 | **Canvas Merge** | Combine two isolated projects, detecting overlaps and resolving duplicates |
| 🔵 | **The Pitch** | One-click story mode — select a path through the graph and Nords generates a slide-by-slide presentation following the camera along the path |
| 🔵 | **Workspace Folders** | Lightweight organizational grouping above the project level for teams managing many projects |
| 🔵 | **3D Canvas** | WebGL/Three.js integration with billboarded labels |
| 🔵 | **Advanced Algorithms** | Centrality plotting, critical path detection, cluster analysis |
| 🔵 | **Enterprise SSO & Audit Logs** | SAML/OIDC SSO, activity audit trails, role-based access |

---

## Under Consideration

| Feature | Notes |
|---------|-------|
| **Session Replay** | Store and replay tool call sequences from mutable MCP sessions for debugging and training |
| **Few-Shot Context Injection** | Extract best tool call sequences from past sessions into system prompts for improved AI performance |
| **Training from Usage** | Refine AI prompts from session logs; session artifacts become reusable templates |
| **Project Templates from Sessions** | Export AI-built sessions as reusable starting points for new projects |

---

## Feature Briefs

### Ingest Pipeline

> **Phase 2** · 🔵 Planned

A generic, extensible framework for automatically creating Nords and Connections from external data sources — turning Nords from a tool you build in to a canvas that also builds itself.

**Core Concept:** External signals flow through a pipeline that transforms raw data into typed Nords + Connections, enriching the graph without requiring manual entry. Humans keep working in their existing tools; the canvas absorbs their output.

**Architecture:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Data Source  │────▶│  Adapter     │────▶│  Transformer │────▶│  Writer  │
│  (webhook,   │     │  (normalize  │     │  (map to     │     │  (MCP    │
│   API poll,  │     │   payload)   │     │   NordType + │     │   create │
│   file drop) │     │              │     │   properties)│     │   tools) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

**Pipeline Components:**

| Component | Purpose |
|-----------|---------|
| **Adapters** | Normalize external data into a common intermediate format. One adapter per source type (webhook, API poll, file upload, CSV/JSON) |
| **Transformers** | Map intermediate data to a target NordType and property schema. Resolve relationships to existing Nords via matching rules (name, external ID, URL) |
| **Writer** | Create Nords and Connections via MCP mutable tools or direct API. Handles deduplication (same source event → same Nord), relationship linking, and `source_url` tracking |
| **Source Registry** | Configuration table defining active pipelines: source type, adapter, target NordType, target ConnectionType, polling interval, field mappings |

**Example Pipelines:**

| Source | Trigger | Created Nords | Created Connections |
|--------|---------|---------------|---------------------|
| Jira webhook | Issue created/updated | Nord (type: Work Item) with status, assignee, priority properties | "Assigned To" → Person Nord; "Implements" → parent Epic Nord |
| GitHub webhook | PR opened/merged | Nord (type: Code Review) with branch, author, URL properties | "Implements" → linked Work Item Nord (via branch naming convention) |
| Meeting transcript | File upload or API | Nord (type: Meeting) + child Decision/Action Nords | "Decided In" → Meeting; "Assigned To" → attendee Person Nords |
| CSV/JSON import | Manual upload | Batch Nords of configured type with column→property mapping | Optional relationship columns mapping to ConnectionTypes |
| Calendar API | Poll cycle | Nord (type: Event) with date, attendees, agenda | "Involves" → Person Nords; "Relates To" → matched topic Nords |

**Key Design Decisions:**
- **NordType-driven:** Every pipeline targets a specific NordType. The NordType's `properties_schema` defines what fields the transformer must populate. Required properties that can't be mapped are flagged as incomplete (Nord completeness system handles the rest)
- **Deduplication via `source_url`:** Each ingested Nord carries a `source_url` property pointing to the original (Jira URL, GitHub PR URL, etc.). Duplicate webhooks for the same URL update rather than duplicate
- **No content copying:** Large content (PR diffs, full transcripts) stays in the source system. The Nord stores a URL-type property pointing to it — the graph is an index, not a copy
- **Relationship inference:** Transformers use configurable matching rules to auto-link ingested Nords to existing graph entities (e.g., branch name `feat/PROJ-123` → find Nord with Jira key `PROJ-123`)

**Depends on:** Webhook & Event Bus (Phase 2), Mutable MCP Mode

---

### Goal Completion Actions

> **Phase 2** · 🔵 Planned

When a Goal is achieved (all bound properties filled, all prerequisites met), trigger automated side-effects beyond the current session-termination behavior.

**Current State:** Goals can already:
- Bind to Nord properties and auto-evaluate completion
- Chain via prerequisite DAGs
- Exclude each other via exclusion groups
- Terminate MCP sessions on achievement

**Proposed Actions:**

| Action Type | Description | Example |
|-------------|-------------|---------|
| **Nord State Transition** | Automatically move connected Nords along a ConnectionType spectrum when a goal completes | Goal "Sprint Review Complete" → all linked Work Item Nords advance to `distance_x = 1.0` (Done) on the Status connection |
| **Nord Creation** | Spawn a new Nord from a template when a goal is achieved | Goal "Requirements Gathered" → create a "Design Spec" Nord pre-linked to all requirement Nords |
| **Connection Creation** | Create new connections between existing Nords | Goal "Stakeholder Approval" → create "Approved By" connections from the deliverable Nord to all reviewer Person Nords |
| **Snapshot Trigger** | Auto-capture an immutable snapshot at the moment of goal completion | Goal "Milestone 1 Complete" → snapshot named "Milestone 1 — {timestamp}" |
| **Webhook/Notification** | Fire an outbound event to the Webhook & Event Bus | Goal "Release Ready" → POST to Slack channel with a summary of all Nords linked to the goal |
| **Goal Chain Advancement** | Unblock downstream goals and optionally auto-activate them | Goal "Design Review" achieved → "Development Sprint" goal becomes achievable and session focus shifts |
| **Ingest Pipeline Trigger** | Kick off an ingest pipeline run as a side-effect | Goal "Sprint Planned" → pull latest Jira tickets into the canvas via the Jira ingest adapter |

**Configuration:** Actions are defined per-goal in the Goal DetailDrawer under a new "On Completion" section. Each action specifies:
- **Action type** (from the table above)
- **Target** (which Nords, ConnectionTypes, or external endpoints are affected)
- **Condition** (optional — only fire if additional criteria are met)

**Depends on:** Goal Orchestration (✅ shipped), Webhook & Event Bus (Phase 2 for notification actions)

---

### Wormholes

> **Phase 3** · 🔵 Planned

Cross-project Connections that establish typed, distance-aware relationships between Nords living in different projects.

**Core Concept:** If a Marketing team drags a dependent deadline outward on their canvas, the Engineering team sees the edge of *their* canvas stretch — a cross-project connection exerting gravitational pull from another project.

**Architecture:**

```
┌─────────────────────┐                    ┌─────────────────────┐
│   Project A         │                    │   Project B         │
│                     │                    │                     │
│   ┌─────┐           │    Wormhole        │           ┌─────┐  │
│   │Nord │───────────┼────────────────────┼──────────▶│Nord │  │
│   │ A1  │           │  (ConnectionType,  │           │ B3  │  │
│   └─────┘           │   distance_x,      │           └─────┘  │
│                     │   direction)        │                     │
└─────────────────────┘                    └─────────────────────┘
```

**Key Properties:**
- **Same connection semantics:** Wormholes use the same ConnectionType system — they have types, distance_x, stages, direction, and properties. They're not a special construct; they're connections that happen to cross project boundaries
- **Permission model:** Creating a wormhole requires write access to *both* projects. Viewing a wormhole only requires read access to the local project (the remote Nord appears as a "ghost" with limited detail)
- **Ghost Nords:** The remote-side Nord appears on the local canvas as a translucent "ghost" card showing title, type icon, and the connection. Clicking it opens a read-only preview or navigates to the source project
- **MCP visibility:** `nords_get_connections` returns wormhole connections with a `cross_project: true` flag and the remote project/nord IDs. AI agents can traverse across projects
- **Tension propagation:** When a remote Nord's properties change (e.g., deadline moves), the wormhole connection can update its distance_x, triggering visual feedback on the local canvas (The Reveal animation showing the "pull")

**Use Cases:**
- Engineering ↔ Marketing dependency tracking (deadline tension)
- Shared component libraries referenced across product projects
- Cross-team blocker visibility without merging projects
- Portfolio-level views connecting strategic goals to execution projects

**Depends on:** Workspace Folders (organizational context for cross-project discovery)

---

## Success Metrics

### North Star

> *"I'm never going to use Trello again."*

### Quantitative

| Metric | What It Measures |
|--------|-----------------|
| Projects created per user/month | Adoption depth |
| Nords per project | Graph complexity (true graphs vs. 3-node toys) |
| Connections per Nord ratio | Are users connecting items or dropping isolated cards? |
| View switches per session | Engagement with The Reveal and multi-lens thinking |
| MCP token usage | AI integration adoption |
| Nord DNA link shares | Viral loop activation |
| Gravity Summary invocations | AI insight engagement |
| Snapshot diff usage | Are users comparing states over time? |
| 7-day return rate | Retention / stickiness |

### Qualitative

- First-session "aha" moment when dragging a Nord and seeing distance values change
- The Reveal reaction when filtering Connections triggers spatial layout transitions
- Tension Detection insights prompting manual behavior shifts

---

## Monetization

- **Launch:** Free. No paywall. Focus on validation and concept adoption
- **Future Tiers:** Gated on Nord count per workspace (50 free → 200+ paid), advanced AI models, admin controls, custom templates, The Pitch, increased MCP API rate limits

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Learning curve blocks adoption | Progressive onboarding, templates with sample data, Ghost Lines, The Reveal making spatial concepts visceral |
| "200 nords is a toy" perception | Semantic Zoom. Free tier caps at 50 to prove value before complexity hits |
| Performance via animation/CRDTs | 2D-only at launch, aggressive rendering optimization, line-hop limits |
| Miro feature overlap | Architectural moat: Miro is a drawing app, Nords is a mapped database with spatial APIs that Miro's connectors mathematically cannot answer |

---

## Architectural Invariants

These rules are constitutional — they do not bend for features or timelines.

1. **Distance is Truth** — `distance_x` is the source of truth. Stage labels are projections of that number. The UI never stores a label; it stores a float
2. **Absolute vs. Relative** — Physics positions are computed; saved `position_x/y` are explicit. Both exist, neither overrides
3. **MCP is the Bridge** — The Model Context Protocol is the one and only path between the spatial graph and AI. No alternative AI access patterns
4. **Three Primitives, One Graph** — Nords, Connections, and Personas are peers in the graph. None is subordinate to another

---

*Last updated: May 2026*
