# MCP Integration

> Nords ships a native **Model Context Protocol (MCP) server** that exposes your project graph as structured AI tools. Any MCP-compatible client can connect and navigate the graph as a session.

---

## Overview

The [Model Context Protocol](https://modelcontextprotocol.io) is an open standard for connecting AI assistants to external tools and data sources. An MCP server exposes **tools** (callable functions) and **resources** (readable documents) that an AI client can invoke during a conversation.

Nords uses MCP to make your project graph **AI-navigable** — not just readable. An AI session in Nords isn't a text dump; it's a stateful walk through a typed knowledge graph with real-time goal evaluation.

---

## The Problem

- **Connecting AI to project data requires custom plumbing.** Every team that wants an AI agent to understand their work builds a bespoke integration: scrape data from a tool, transform it into a prompt-friendly format, inject it, and hope the model interprets it correctly. There is no reusable protocol for this.
- **No standard protocol for spatial/graph context.** MCP provides a standard for tools and resources, but most implementations expose flat data — documents, tables, search results. Nords implements MCP as a **graph traversal protocol** with spatial semantics, session state, and goal evaluation — capabilities that don't exist in typical MCP servers.
- **Context injection is all-or-nothing.** Without progressive disclosure, AI integrations either dump the entire dataset into the context window (flooding it) or provide too little context (starving it). Nords' MCP server exposes a structured traversal architecture — dictionary → topology → detail → neighborhood — that lets the AI build understanding incrementally.

---

## How It Works

```mermaid
sequenceDiagram
    participant AI as AI Client<br/>(Claude, Cursor, Antigravity)
    participant MCP as Nords MCP Server
    participant DB as PostgreSQL

    AI->>MCP: nords_get_briefing
    MCP->>DB: Load dictionary + horizon + goals
    DB-->>MCP: Typed graph + persona weights
    MCP-->>AI: JSON briefing

    AI->>MCP: nords_traverse_connection
    MCP->>DB: Record traversal, update position
    DB-->>MCP: Updated horizon
    MCP-->>AI: New position + nearby nords

    AI->>MCP: nords_update_session_nord
    MCP->>DB: Persist properties, evaluate goals
    DB-->>MCP: Completion status + goal events
    MCP-->>AI: goal_events (achieved, blocked, etc.)
```

---

## The Nords URI Scheme (Resources)

The MCP server exposes static payload resources via a `nords://` URI scheme:

| URI Pattern | Description |
|-------------|-------------|
| `nords://[workspace]/projects` | List all projects in the workspace |
| `nords://[workspace]/templates` | Global schemas (Nord Types, Connection Types) |
| `nords://[project]/semantic_dictionary` | The project's ontology — types, stage labels, connection verbs. **Step Zero** for any AI session. |
| `nords://[project]/snapshots/[id]` | Historical keyframe — an immutable snapshot of the full graph at a point in time |
| `nords://projects/{project_id}/overview` | Markdown summary of the entire project: nords, connections, goals, goal edges |

---

## The Semantic Dictionary

Before traversing the graph, the AI pulls the **Semantic Dictionary** — the project's "rulebook." This resource acts as Step Zero in the [[AI Integration]] traversal loop.

The dictionary contains:

| Section | Contents |
|---------|----------|
| **Project Meta** | Project name, purpose, mode, and configuration |
| **Nord Lexicon** | All Nord Types with their property schemas, icons, and colors |
| **Connection Definitions** | All Connection Types with stage labels, verbs, direction defaults, and distance semantics |
| **Personas** | Available personas with their weights, voice, and focus areas |

By reading the dictionary first, the AI deduces the specific qualitative meaning of the workspace *before* walking the data. This prevents misinterpretation — the AI knows that a `distance_x` of `0.85` on a "Blocks" connection means "Critical Blocker" before it encounters one.

If the user invokes a "Blank Canvas," the AI operates gracefully on minimal context without forcing heavy rigid deductions.

---

## Nord DNA (Portable Context URLs)

Every nord has a unique **Nord DNA** URL. When an AI tool handles a Nord DNA URL via MCP, it delivers a context-rich payload:

| Payload Section | Contents |
|-----------------|----------|
| **Nord details** | Full title, description, type, all properties |
| **1st-degree neighborhood** | All directly connected nords with connection types |
| **Spatial distances** | Exact `0.0–1.0` values and stage labels for every connection |
| **Connection descriptions** | Textual descriptions of each relationship |

Nord DNA URLs serve as the viral loop — PMs drop them into IDEs, Slack messages, or AI chat sessions, and any MCP-compatible tool can instantly load the full context of that knowledge node and its surroundings.

---

## Setup

### Prerequisites
- Nords server running (or database accessible)
- `PROJECT_ID` — UUID of the project to expose
- `DATABASE_URL` — PostgreSQL connection string

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nords": {
      "command": "npx",
      "args": ["tsx", "/path/to/nords/server/src/mcp-server.ts"],
      "env": {
        "DATABASE_URL": "postgres://user:pass@localhost:5432/nords",
        "PROJECT_ID": "your-project-uuid"
      }
    }
  }
}
```

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_ID` | *(required)* | UUID of the project |
| `DATABASE_URL` | *(required)* | PostgreSQL connection string |
| `PERSONA_ID` | `null` | Default persona for new sessions |
| `START_NORD_ID` | `null` | Override the project's default start nord |
| `MCP_MUTABLE` | `false` | Enable write tools (create/update/delete) |
| `MCP_CAPTURE_DATA` | `true` | Allow session data to persist in the graph |

---

## Project-Level MCP Flags

Controlled in **Project Settings → Integrations**:

| Flag | Off | On |
|------|-----|----|
| `mcp_enabled` | Project invisible to MCP | Graph is readable |
| `mcp_capture_data` | Sessions are read-only | New nords/connections created during sessions persist |
| `mcp_mutable` | Existing graph is read-only | MCP can update titles, properties, connections |

**Recommended configs:**

| Use Case | Flags |
|----------|-------|
| Read-only advisor | `mcp_enabled: true` only |
| Interview / data capture | `mcp_enabled + mcp_capture_data` |
| Full agent (experimental) | All three on |

---

## Tool Reference

### Tier 1 — Read-Only

| Tool | Description |
|------|-------------|
| `nords_get_briefing` | **Cold-start composite** — returns dictionary + horizon + goals in one call. Call this first. |
| `nords_get_dictionary` | Full ontology: nord types, connection types (with stage labels and verbs), personas |
| `nords_get_graph` | Complete graph: all nords, connections, and types |
| `nords_get_nord` | Single nord by ID with all properties |
| `nords_query_nords` | Search nords by type name and/or title substring |
| `nords_get_connections` | All connections to/from a specific nord |
| `nords_get_goals` | All project goals with property bindings, end_type, and DAG edges |
| `nords_get_incomplete_nords` | Nords with unfilled required properties |
| `nords_get_analytics` | Session counts, traversal stats, top-visited nords |

### Tier 2 — Session Tools

| Tool | Description |
|------|-------------|
| `nords_get_horizon` | **Current position** — persona-weighted neighbors, completion %, predicted path, planning queue |
| `nords_get_session_state` | Full session state: position, all session nords, traversal history |
| `nords_traverse_connection` | Move to a connected nord. Returns updated horizon. |
| `nords_visit_nord` | Log a visit event (inspect, update, complete, gate_check) with optional before/after snapshots |
| `nords_update_session_nord` | Save collected properties. Validates against schema. Triggers goal evaluation. Returns `goal_events`. |
| `nords_switch_persona` | Switch the active persona. Returns reweighted horizon. |
| `nords_reset_session` | Abandon current session and start a fresh one |

### Tier 3 — Mutable Tools *(requires `MCP_MUTABLE=true`)*

| Tool | Description |
|------|-------------|
| `nords_create_nord` | Create a new nord with type and initial properties |
| `nords_update_nord` | Update title and/or properties on an existing nord |
| `nords_delete_nord` | Soft-delete a nord |
| `nords_create_connection` | Create a typed connection between two nords |
| `nords_update_connection` | Update connection distance, direction, or properties |
| `nords_delete_connection` | Soft-delete a connection |

---

## The Session Horizon

The **Horizon** is the core navigation primitive. It answers: *"Given where I am in the graph, what should I do next?"*

```json
{
  "current_nord": { "id": "...", "title": "Onboarding Call", "completion": 0.6 },
  "persona": { "name": "Sales Lead", "temperature": 0.8 },
  "neighbors": [
    { "nord": "Contract Review", "connection_type": "Status", "weight": 90, "completion": 0.0 },
    { "nord": "Technical Discovery", "connection_type": "Blocks", "weight": 70, "completion": 1.0 }
  ],
  "incomplete_required": ["Budget Range", "Decision Maker"],
  "goal_status": [
    { "goal": "Qualify Lead", "achieved": false, "missing": ["Budget Range"] }
  ]
}
```

The horizon is **persona-weighted** — a Sales Lead persona boosts Status and Blocks connections, so those neighbors appear more prominently than generic references. See [[Persona Lens]] for how weights are configured.

---

## Goal Events

When you call `nords_update_session_nord`, Nords evaluates all goals bound to that nord's properties. It returns `goal_events` describing what changed:

```json
{
  "goal_events": [
    { "type": "achieved", "goal": "Qualify Lead", "message": "All qualifying criteria met." },
    { "type": "prerequisite_unblocked", "goal": "Send Proposal", "message": "Qualify Lead is now complete." }
  ]
}
```

| Event Type | Meaning |
|------------|---------|
| `achieved` | Goal is now complete |
| `blocked` | Goal cannot be achieved (prerequisite not met) |
| `prerequisite_unblocked` | A downstream goal is now reachable |
| `session_terminated` | An `end_type: terminate` goal was achieved — session should end |
| `exclusion_triggered` | Completing this goal cancels sibling goals in the same exclusion group |

See [[Goals]] for the full goal lifecycle and DAG canvas.

---

## Technical Notes

- Server implementation: `server/src/mcp-server.ts`
- Session state is maintained server-side; clients are stateless.
- Horizon computation runs on every tool call that changes position, properties, or persona.
- Mutable tool access is controlled via a per-project boolean flag in project settings.
- Access token authentication is checked before any tool execution. See [[Access Tokens]] for token management.
- Token scopes support Read-Only, Read-Write, and Admin — matching human permission levels (Permission Parity).
- MCP endpoint URL and Nord DNA base URL are configured in **Project Settings → API & Access**.
