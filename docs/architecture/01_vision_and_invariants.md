# Nords: Vision & Invariants

*"I built this in Nords and now my AI actually understands my project."*
— Target user reaction after first session

## 1. Vision

Nords is a **human/AI knowledge bridge** — a hybrid tool that makes graph thinking accessible through a familiar canvas-and-card interface. It gives people a natural way to organize knowledge as a network of relationships, and gives AI agents a structured, traversable graph to reason over and act on.

The insight: humans think in relationships, not rows. AI reasons better with structured context, not flat documents. Nords is the meeting point — a tool that feels like a card-based canvas to the human, and exposes a semantically rich, MCP-traversable graph to AI.

### 1.1 The Three Primitives

Everything in Nords is built from three core entity types that form an interconnected graph:

1. **Nords** — Cards representing any entity: tasks, ideas, decisions, artifacts, milestones. Typed via user-defined Nord Types with custom property schemas.
2. **Connection Categories** — Typed relationships between nords that carry spatial meaning. Each category defines its own measurement system (spectrum, quadrant, or unranked), verb language, and stage labels.
3. **Personas** — Representations of people, roles, or AI agents that participate in the graph. Personas connect to nords and to each other through the same relationship system.

All three primitives are **fully interconnected** — any entity can relate to any other through typed connections. All three are **MCP-accessible** — AI agents can traverse, query, and mutate the entire graph. And all three support **session-based information** — contextual data can be attached to any entity during a working session, creating a live memory layer that bridges human context and AI context.

### 1.2 Core Analogy

Trello assumes your work belongs in a column. Notion assumes it belongs in a page. Nords assumes it belongs in a **network** — and that network should be legible to both humans and machines.

The UX is deliberately familiar: cards, boards, drag-and-drop. The architecture underneath is a graph database with typed nodes, typed edges, and spatial semantics. Users get the comfort of tools they already know; AI agents get the structured context they need to be genuinely useful.

### 1.3 Competitive Positioning

**Why not Miro?** Miro's data model is a drawing — shapes on a canvas with visual connectors. Nords' data model is a graph — typed nodes with typed, semantically-rich relationships. Miro can't query "show me everything that blocks the Q3 launch" because its connectors carry no meaning. And Miro has no MCP surface — AI can't traverse it.

**Why not Trello/Notion?** They are column-based or page-based. A card lives in one list. A page lives in one hierarchy. Nords exist in a network where the same entity participates in many relationships, each with its own spatial language — and every relationship is machine-readable.

**Why not a raw graph database?** Neo4j and its peers are powerful but require query languages and technical expertise. Nords wraps graph thinking in a canvas/card UX that anyone can use. You don't write Cypher — you drag a card between columns and the graph updates.

**Defensibility:** The combination of (1) per-category spatial semantics, (2) MCP-native AI traversal with session context, (3) the three-primitive relational model, and (4) the animated view transition system ("The Reveal") creates a product experience that cannot be replicated by adding features to a drawing tool, a kanban board, or a graph database.

---

## 2. Glossary & Key Terms

* **Nord:** A typed card representing any entity (task, person, idea, artifact). Nords carry custom properties defined by their Nord Type.
* **Connection Category:** A typed relationship class (e.g. "Blocks", "Depends On", "Owns") with its own spatial measurement system, stage labels, verb, and direction semantics.
* **Persona:** A graph-native representation of a person, role, or AI agent. Personas participate in the same relationship system as nords.
* **Connection (Line):** An instance of a Connection Category linking two entities, carrying direction, distance (0.0–1.0), and custom properties.
* **Semantic Stage:** User-defined text labels (e.g. "Blocker" → "Independent") that map to the 0.0–1.0 distance scale on a Connection Category.
* **Session Context:** Ephemeral or persistent data attached to any entity during a working session — the bridge between what a human is thinking and what an AI agent can access.
* **MCP Surface:** The Model Context Protocol interface that exposes the full graph for AI agent traversal, query, and mutation.
* **Snapshot:** An immutable, time-stamped keyframe saving the exact state of the entire project graph.
* **Lens (View):** A specific way to visualize the data — Spatial Canvas, Board (Matrix), or future views.
* **The Reveal:** The fluid physics-based animation that plays when data or views change, letting users track where nodes move.

---

## 3. Constitutional Invariants (AI Anti-Drift Architecture)

To prevent drift during implementation or when utilizing external LLM agents, these rules are unbending invariants of the system architecture:

* **INVARIANT 1 (Distance is Truth):** A connection's geometric distance is the single source of truth. The UI Semantic Stage text label is a calculated mathematical projection of that distance, never the underlying stored value.
* **INVARIANT 2 (Absolute vs. Relative):** A Nord's relative position is governed by the active force-directed physics engine. However, its absolute resting X/Y coordinates must be explicitly saved per Snapshot, ensuring nodes don't lose their place if the physics simulation is entirely toggled off.
* **INVARIANT 3 (MCP is the Bridge):** The MCP server is the one and only permitted bridge between the spatial graph and an AI context window. Any feature — human-facing or agent-facing — that reads or writes the graph through AI must go through the MCP surface. Session context is attached to entities, not floating in chat history.
* **INVARIANT 4 (Three Primitives, One Graph):** Nords, Connection Categories, and Personas are peers in the graph. No primitive is subordinate to another. Any entity can connect to any other entity through any Connection Category. This universality is what makes the graph traversable.

---

## 4. Target User

### 4.1 Primary Persona
People who work at the intersection of human decision-making and AI capability:
* Project managers, innovation leads, and strategists who need to externalize complex relationship thinking
* AI-forward professionals who want their tools to generate context that AI agents can actually use
* Anyone outgrowing flat tools — they need relationships, intensity, direction, and structured knowledge, not just lists

### 4.2 Day-One User
Someone who has tried to make Trello + Miro + ChatGPT work together and feels the friction of context evaporating between tools. They want one place where they can think visually, organize relationally, and hand context to AI seamlessly.

### 4.3 Triggering Event
"I have a project where the relationships between things matter more than the sequence, and I need my AI to understand those relationships — not just read my notes."

### 4.4 Path to Mass Market
The AI-native PM is the wedge, not the ceiling. The viral loop is **Nord DNA** — shareable MCP-accessible project graphs that make any AI tool smarter. Non-technical teammates adopt because their AI-native colleague says "just put it in Nords so Claude can see the whole picture."

---

## 5. Authentication & Account Management (The SaaS Wrapper)

The platform utilizes standard SaaS authentication flows to reduce friction while acting as the front door to the core engine.

### 5.1 The Landing Page (Logged Out)
The public-facing marketing page. It features high-level copy explaining the "human/AI knowledge bridge" concept, looping video examples of the canvas and board views, and clear Call-to-Action (CTA) buttons.

### 5.2 Authentication
Users can "Create Account" or "Sign In" using standard email/password or Google Single Sign-On (SSO).

### 5.3 User Profile & Settings
A dedicated account screen accessible from the Workspace Dashboard. Users can manage their avatar, name, email, connected Google account, and basic system preferences (e.g., default light/dark mode).
