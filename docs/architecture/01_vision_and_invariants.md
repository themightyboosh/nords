# Nards: Vision & Invariants

*"I'm never going to use Trello again."*
— Target user reaction after first 10 minutes

## 1. Vision
Nards is a graph-native ideation and project management tool that replaces flat, column-based tools (Trello, Notion boards) with a spatial canvas where ideas, tasks, people, and concepts exist as nodes in a living network. Relationships are first-class citizens — not afterthoughts.

Core analogy: SQL is to Postgres Graph/Neo4j as Trello is to Nards.
Trello assumes your work belongs in a line. Nards assumes it belongs in a network.

### 1.1 Competitive Positioning
**Why not Miro?** Miro's data model is a drawing — shapes on a canvas with visual connectors. Nards' data model is a graph — typed nodes with typed, semantically-rich relationships. Miro can't query "show me everything that blocks the Q3 launch" because its connectors carry no meaning. This is an architectural difference, not a feature gap. It must be felt in the first 30 seconds.

**Why not Trello/Notion?** They are column-based. A card lives in one list. Nards exist in a network where the same node participates in many relationships, and each relationship type has its own spatial language.

**Defensibility:** Per-line-type spatial semantics, MCP-native AI integration, and the animated view transition system ("The Reveal") create a product experience that cannot be replicated by adding features to a drawing tool or a kanban board.

### 1.2 Glossary & Key Terms
* **Nard:** The fundamental visual node representing an entity (task, person, idea, etc.).
* **Tether (Line):** A relationship connecting two Nards, whose physical length translates to a 0.0-1.0 data value.
* **Semantic Stepper:** The user-defined text labels (e.g., "Blocker" to "Independent") that map to the 0.0-1.0 distance scale.
* **Snapshot:** An immutable, time-stamped keyframe saving the exact state of the entire project graph.
* **Lens (View):** A specific way to visualize the data, such as the Spatial Canvas or the Matrix View.
* **The Reveal:** The fluid physics-based animation that plays when data or views change, letting users track where nodes move.
* **Matrix View (Spatial Pivot Table):** A dual-axis layout combining line types into columns and swimlanes.
* **Elastic Zone (Grouping):** A dynamically morphing boundary drawn around a group of Nards to denote a loose geographic area.

### 1.3 Constitutional Invariants (AI Anti-Drift Architecture)
To prevent drift during implementation or when utilizing external LLM agents, these rules are unbending invariants of the system architecture:
* **INVARIANT 1 (Distance is Truth):** The Nard's geometric distance is the single source of truth. The UI Semantic Stepper text label is a calculated mathematical projection of that distance, never the underlying stored value.
* **INVARIANT 2 (Absolute vs. Relative):** A Nard's relative position is governed by the active force-directed physics engine. However, its absolute resting X/Y coordinates must be explicitly saved per Snapshot, ensuring nodes don't lose their place if the physics simulation is entirely toggled off.
* **INVARIANT 3 (Format Exclusivity):** The MCP server's Dual-Payload protocol (Mermaid topology + JSON parameters) is the one and only permitted bridge between the spatial graph database and an LLM context window. Any feature attempting to "read the graph" must consume this exact payload structure.

---

## 2. Target User

### 2.1 Primary Persona
Project managers and innovation specialists who are:
* Already immersed in AI workflows and obsessed with context generation
* Outgrowing flat tools — they need intensity, relativity, direction, and relationship-to-knowledge to shape a project
* Comfortable with progressive complexity — they want simple to start, powerful when needed

### 2.2 Day-One User
A Trello power user who has tried to make Miro + Trello + spreadsheets work together and feels the friction of forcing non-linear thinking into linear tools.

### 2.3 Triggering Event
"I have a project where the relationships between things matter more than the sequence, and no tool lets me express that."

### 2.4 Path to Mass Market
The AI-obsessed PM is the wedge, not the ceiling. The viral loop is Nard DNA — shareable context URLs that make any AI tool smarter. Non-technical PMs adopt because their AI-native teammate says "just put it in Nards so Claude can see it."

---

## 3. Authentication & Account Management (The SaaS Wrapper)
The platform utilizes standard SaaS authentication flows to reduce friction while acting as the front door to the core engine.

### 3.1 The Landing Page (Logged Out)
The public-facing marketing page. It features high-level copy explaining the "spatial database" concept, looping video examples of the physics engine auto-balancing, and clear Call-to-Action (CTA) buttons.

### 3.2 Authentication
Users can "Create Account" or "Sign In" using standard email/password or Google Single Sign-On (SSO).

### 3.3 User Profile & Settings
A dedicated account screen accessible from the Workspace Dashboard. Users can manage their avatar, name, email, connected Google account, and basic system preferences (e.g., default light/dark mode).
