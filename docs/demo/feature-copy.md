# Nords — Feature Copy

> Marketing copy for each feature section. Each entry includes headline, subheadline, three key points, and CTA.
>
> **Byline:** Map Knowledge. Wire Meaning. Deliver Expertise.

---

## 1. Projects

### Three modes. One dial for AI determinism.

Every project starts open and tightens as you learn. **Explore** mode gives AI free reign to navigate your graph — no tracking, no finish line. **Collect** mode adds structured data capture with completion tracking, perfect for interviews and audits. **Guided** mode unlocks full goal orchestration: prerequisite chains, exclusion groups, and sessions that end when the mission is complete.

- **Explore** — Open-ended graph navigation for discovery, brainstorming, and knowledge mapping. The AI reads everything but tracks nothing.
- **Collect** — Structured data capture with automatic completion tracking. An implicit goal binds to every required property across every card. The AI knows what's missing and works to fill it.
- **Guided** — Full goal orchestration with prerequisite chains, exclusion groups, and session-terminating objectives. The AI has a mission, a critical path, and a finish line.

**Switch modes any time. Your data stays. Only the AI's mission changes.**

---

## 2. Data Model

### Every card is data. Every line is meaning.

Nords is built on three primitives: **Nords** (typed cards with custom property schemas), **Connections** (typed relationships with continuous 0.0–1.0 distance values), and **Personas** (role-based lenses that reshape the entire graph). All three are peers — any entity connects to any other through any relationship type.

- **Typed nodes, typed edges** — Define your own card types (Requirements, Risks, Team Members) with custom property schemas. Define your own relationship types (Blocks, Depends On, Mitigates) with semantic stage labels.
- **Distance is data** — Every connection carries a continuous 0.0–1.0 value. Drag two cards closer and you're writing structured data. The AI reads these exact same distances.
- **Dual-axis encoding** — Connections carry independent X and Y distances, each with their own stage labels. One relationship type, two dimensions of meaning.

**No query language. No database engineering. You think in relationships — Nords lets you draw them.**

---

## 3. Spatial Canvas

### An infinite canvas where distance is data.

The Spatial Canvas is an infinite, pannable workspace where every sticky note is a structured data object and every line drawn between them is a typed relationship with real meaning. Drag cards to change data. Draw connections to create relationships. Zoom from bird's-eye topology to inline property editing. The canvas is simultaneously a human-friendly workspace and a machine-readable spatial database.

- **Semantic zoom** — Three tiers of detail. Zoomed out, see cluster topology and connection density. Zoomed in, see full property sheets with inline editing.
- **Physics engine** — Connections act as springs. Drag one card and connected cards pull and relax to maintain their semantic distances. The graph finds its own equilibrium.
- **Live AI feedback** — When an AI agent updates a connection value via MCP, the physics engine animates the canvas in real time. You see what the AI is doing, spatially.

**The canvas isn't a display layer. It's a shared control surface where human spatial reasoning directly shapes AI behavior.**

---

## 4. Board View

### Any relationship becomes a kanban board.

Board View transforms any relationship type into a dynamic kanban layout. Columns are auto-generated from the stage labels defined on your connection types — no manual board setup. Drag a card between columns and you're updating the same 0.0–1.0 value that drives the canvas, the heatmap, and every active AI session.

- **Switch dimensions instantly** — Click a dropdown to change which relationship type drives the board. Status → Priority → Ownership → any custom type. Same cards, different question.
- **Drag to advance** — Move a card between columns and the underlying value updates everywhere — canvas, persona lens, goal status, and active AI sessions.
- **Matrix mode** — When a connection type defines both X and Y stages, the board renders as a spatial pivot table. Columns from one axis, rows from another. Two dimensions of meaning in one view.

**No board configuration. No setup wizard. Every relationship type you create is already a board.**

---

## 5. Persona Lens

### Same project. Every perspective.

The Persona Lens renders your graph as a radial heatmap centered on what matters to a specific role. Activate the Engineering Lead and blockers snap to the center. Switch to the Product Owner and customer-facing features take focus. Every persona is a full cognitive profile: mental models that shape AI reasoning, category weights that reshape the graph, and a voice that changes how the AI communicates.

- **Radial heatmap** — High-priority connections pull their nords to the center. Low-priority items recede to the edges. Distance becomes relevance.
- **Mental models** — Up to five focus areas per persona that shape what the AI pays attention to. An Engineering Lead with "system reliability" and "technical debt prioritization" reasons differently than a Product Owner with "customer value" and "time to market."
- **AI persona adoption** — When AI adopts a persona, it inherits the priorities, the expertise, and the communication style. The same question gets fundamentally different answers depending on who's asking.

**One workspace. Every stakeholder's view. No separate dashboards. No duplicated data.**

---

## 6. Goals

### Objectives that complete themselves.

Goals bind directly to your graph's data. When the bound properties are filled, the goal auto-completes — no manual status toggle, no ceremonies. Goals form prerequisite chains (can't start B until A is done), exclusion groups (choosing A cancels B), and can terminate AI sessions when achieved (scoped missions with a finish line).

- **Property-bound completion** — A goal binds to specific properties on specific cards. Fill them and it completes. Empty them and it reopens. Status is a computed fact, not a judgment call.
- **Prerequisite DAG** — Goals depend on other goals, forming a visual dependency map. Blocked goals show exactly what's upstream. The critical path is always visible.
- **Session termination** — Mark a goal to end the AI session when achieved. The AI has a clear mission, works toward it, and stops when it's done. No overrun. No manual cutoff.

**The data IS the status. Goals don't ask "is this done?" They compute it.**

---

## 7. AI Integration

### AI that knows where it is.

When an AI agent connects to Nords, it doesn't receive a text dump. It enters a **session** — with a position in the graph, an active persona, and a live **Horizon**: a real-time view of what's nearby, what's incomplete, what's blocked, and what goals are within reach. The agent navigates the graph the way a team member would: moving between nodes, filling gaps, switching perspectives, and working toward objectives.

- **Session-based navigation** — The AI has a position, a history of visited nodes, and a live Horizon that updates with every action. It's not answering questions about your project — it's working inside it.
- **Persona inheritance** — Switch the AI's persona and it inherits the weights, the voice, and the mental models. A regulatory persona gives precise, citation-heavy answers. A product persona gives strategic, market-focused insights.
- **Goal-driven workflows** — The AI sees which goals are blocked, what properties are missing, and what it can advance. It works toward objectives with a clear finish line — not an open-ended conversation.

**The result: AI that doesn't just answer questions about your project. It works in it.**

---

## 8. MCP Integration

### The bridge between your graph and any AI.

Nords ships a native Model Context Protocol (MCP) server with 20+ tools across three tiers: read-only graph queries, session-based navigation, and mutable graph operations. Any MCP-compatible client — Claude, Cursor, custom agents — connects with a project token and navigates your graph as a stateful session.

- **20+ tools, three tiers** — Read-only tools for graph queries and goal inspection. Session tools for traversal, property updates, and persona switching. Mutable tools for creating and modifying nords and connections — gated by project-level flags.
- **Progressive disclosure** — The AI builds understanding incrementally: dictionary → topology → detail → neighborhood. No context window flooding. No starvation.
- **Nord DNA** — Every card has a portable context URL. Drop it into any MCP client and the AI gets the full node, its connections, all distances, and the surrounding neighborhood. The viral loop of structured context.

**One protocol. Any AI client. Your graph becomes navigable to every tool in the MCP ecosystem.**

---

## 9. Preview Chat

### Chat with your project. See what AI sees.

Preview Chat is a built-in conversational AI wired directly to your project graph. Ask questions. Fill gaps. Explore connections. And with Dev Mode, see exactly what the AI is thinking: the full system prompt, every tool call, session state snapshots, and token metrics. Debug your AI integration without leaving the app.

- **Natural language graph interaction** — Ask "What's blocking the launch milestone?" and get an answer grounded in actual graph data — traversed relationships, real distances, specific missing properties.
- **Dev Mode inspector** — Toggle to reveal the system prompt, chronological tool call timeline, session state snapshots, and token usage for every message. The trust layer.
- **Model switching** — Choose between Gemini 2.0 Flash (fastest), 2.5 Flash (balanced), and 2.5 Pro (deepest reasoning). Switch mid-conversation based on task complexity.

**No black box. You see what the AI sees, why it said what it said, and every tool call that got it there.**
