# What is Nords?

Nords is **a visual platform for building knowledge graphs that humans and AI both read.** You drag cards onto a canvas, draw lines between them, and the graph builds itself. Each card is a typed data object. Each line is a typed relationship with a real value. No query languages, no database engineering. You think in relationships; Nords lets you draw them.

This is **Graph RAG made accessible.** Instead of handing AI raw documents to summarize, you give it a structured map of relationships to reason over. The result: answers that are grounded, contextual, and aware of what's blocked, what's complete, and what matters to your role.

**Personas** are how you inject expertise into the process. They encode your team's domain knowledge into the AI's reasoning: what it *knows about*, what it *prioritizes*, and what it *won't do*. Activate the Engineering Lead and blockers pull to the center. Switch to the Product Owner and customer-facing features take focus. Tribal knowledge becomes a reusable lens that any AI session can adopt.

In most tools you define your data model in one place, collect information in another, and build dashboards in a third. In Nords, **all three happen on the same surface.** The schema you design is the form the AI uses to collect data, and the graph you build is the dashboard your team reads. There is no sync step, no export, no "generate report." The act of building the project *is* the deliverable.

---

## The Problem

The biggest bottleneck in AI isn't the model. It's the context.

When you ask an AI assistant to help with your project, it receives a giant, messy dump of text. It has no sense of direction. It cannot tell which tasks are blocked, which milestones are close, or what matters most to your role. It can summarize, but it cannot *navigate*. It can answer questions, but it cannot *work*.

This happens because current tools throw structure away. Documents are long pages of prose. Spreadsheets are disconnected rows. Task trackers are flat lists. None of them capture how things actually connect. The relationships between ideas (what blocks what, who owns what, what depends on what) exist only in people's heads, shared through meetings, lost in chat threads, filtered through hierarchy.

Graph RAG solves this by giving AI a structured graph to reason over instead of raw text. But building a graph RAG system today requires database engineers and query languages. Working with one day-to-day is impossible for non-technical teams. The technology exists; the accessibility doesn't.

---

## The Solution

Nords brings four capabilities together on a single visual canvas:

### 1. Visual Graph RAG
Instead of giving AI a long document to read, Nords connects your data points in a structured graph. This is Graph RAG made simple: you build it visually by drawing lines. The AI understands the relationships between your ideas, which makes its answers accurate, grounded, and contextually aware.

### 2. The Determinism Sweet Spot
Every AI deployment faces the same tension: too rigid and it breaks when reality doesn't match the script; too loose and it wanders off track, hallucinating or asking irrelevant questions. Most tools force you to pick a side. Workflow automations are fully deterministic but brittle. Chatbots are fully open but directionless. Neither is right for real work.

Nords gives you a tunable middle ground. When an AI connects to your canvas, it enters a live **session** with a position on the graph, a role, and a clear view of its surroundings (its **Horizon**). The graph's structure constrains *where* the AI can go: it can only traverse connections that exist, and connection types encode prerequisites, dependencies, and gates. Goals constrain *what* the AI works toward: bound properties define completion criteria, and the DAG enforces sequencing. Personas constrain *how* the AI thinks: mental models shape reasoning, category weights shape priority, and guardrails set behavioral boundaries.

But within those constraints, the AI reasons freely. It chooses which neighbor to visit next based on the Horizon's weighted suggestions. It decides how to ask questions based on the persona's voice. It follows the participant's story even when it deviates from the planned path, because the graph is always there to pull it back. The result is AI that feels conversational but stays productive, structured enough to finish the job but flexible enough to handle surprises.

### 3. Human-in-the-Loop Control
Nords is built around the human-in-the-loop cycle, and the interface is designed to make that control feel effortless.

The spatial canvas is an infinite, pannable workspace built on React Flow v12, with custom-rendered edges that carry real data. Semantic zoom reveals progressive detail: zoom out and you see cluster topology and connection density; zoom in and you see full property sheets with inline editing. Three views (graph canvas, kanban board, and persona heatmap) show the same data through different spatial metaphors, and switching between them triggers smooth, physics-based animated transitions ("The Reveal") so you never lose your place.

Because the interface is spatial, steering AI is physical. If an agent goes off track, you don't rewrite a prompt. You drag a card to change its distance value, disconnect a line to remove a relationship, or edit a property to update the data the AI is reading. Every manipulation you make on the canvas is instantly reflected in the AI's Horizon. The canvas isn't just a display layer. It's a shared control surface where human spatial reasoning directly shapes AI behavior.

### 4. One Map, Many Lenses
Because the canvas is backed by real data, you can view your project through different lenses, and each lens reshapes not just what the AI prioritizes, but **how it thinks.**

**Personas** are the key. Each persona is a full cognitive profile with three layers:

- **Mental models** (up to five) define what the persona *knows about*, its areas of expertise and focus. These are injected into the AI's system prompt, shaping how it reasons, what frameworks it applies, and what questions it asks. An Engineering Lead persona with mental models like "system reliability" and "technical debt prioritization" will reason differently than a Product Owner with "customer value mapping" and "competitive positioning."
- **Category weights** (−100 to +100 per connection type) define what the persona *cares about.* High weights on "Blocks" and "Depends On" pull blockers to the center of the heatmap; negative weights on "Nice To Have" push those nords to the periphery. The AI's traversal follows the same weights: it visits high-weight connections first, spends more time on high-priority neighborhoods, and deprioritizes low-weight paths.
- **Temperature and guardrails** define how the persona *communicates.* A conservative compliance persona (low temperature, strict guardrails) gives precise, citation-heavy answers. A creative strategy persona (high temperature, loose guardrails) generates speculative options and provocative framings.

When you activate a persona, the graph re-renders as a radial heatmap: nords connected by high-priority relationships pull closer to the center, while low-priority items recede to the edges. **Distance becomes relevance.** An engineering lead sees blockers and technical debt front and center. A product owner sees customer-facing features and business value. Same graph, fundamentally different reasoning.

Switch from the canvas to a kanban board, a persona heatmap, or a goal dependency map instantly. The data stays the same; only the perspective changes. And when AI adopts a persona, it inherits all three layers: the expertise, the priorities, *and* the voice.

---

## Nords in Action

### Managing an Engineering Project
A team lead creates Nord types for Features, Bugs, and Team Members. Connection types define "Blocks," "Assigned To," and "Depends On," each with stage labels mapping to the team's workflow (Backlog → Sprint → Review → Shipped). The board view becomes a live kanban driven by `distance_x`. When a developer drags a Bug from "Sprint" to "Review," the AI, running a session with the Engineering Lead persona, sees the horizon shift, checks for unblocked downstream Features, and flags that a release goal is now 80% complete. No standups needed to know the state of the sprint.

### Running Stakeholder Interviews
A product researcher sets up a project with Nord types for Stakeholders, Quotes, Themes, and Insights. The AI enters a session using Nords' built-in ethnographic interview prompt (Grand Tour questions, probing follow-ups, laddering techniques) and navigates from Stakeholder to Stakeholder, filling in properties as the researcher feeds it interview transcripts. As Quotes accumulate, the AI draws connections to Themes. Switch to the Persona lens as a Product Owner and the heatmap reshapes: high-value customer themes pull to the center, edge cases recede. The graph doesn't just store the research; it *synthesizes* it.

### Mapping a Competitive Landscape
A strategy team models competitors, market segments, capabilities, and differentiators as Nords. Connections capture "Competes With," "Targets Segment," and "Lacks Capability," each with distance values reflecting strength of overlap. The AI traverses the graph and surfaces: *"Three competitors target Enterprise Healthcare but none offer real-time collaboration. This is your gap."* Switch the board to the "Differentiator" connection type, and the team sees exactly where they're unique versus undifferentiated, organized as columns rather than a tangled diagram.

### Qualifying a Sales Pipeline
A sales team defines Nord types for Deals, Contacts, Objections, and Success Criteria. Connection types include "Decision Maker," "Champion," and "Blocker" with stages from Cold → Warm → Committed. A Goal binds to four required properties on each Deal: Budget Confirmed, Timeline Agreed, Technical Fit Verified, Decision Maker Identified. The AI enters a session scoped to the "Qualify Pipeline" goal. It walks from Deal to Deal, checks which required properties are empty, and asks targeted questions: *"Deal 'Acme Rollout' is missing Decision Maker and Budget. Should I draft a discovery call agenda targeting those gaps?"* When all four properties are filled, the goal auto-completes.

### Onboarding New Team Members
A manager creates a project template called "Team Onboarding" with Nord types for Systems, Processes, People, and Tribal Knowledge. Each System Nord has properties for access URL, owner, and gotchas. The new hire opens the canvas and sees the full landscape of what they need to learn, connected by "Requires Access To," "Reports To," and "Ask About." The AI, using a Mentor persona, navigates the graph with them: *"You've completed Systems Setup. Next, you need to meet Sarah Chen. She owns the deployment pipeline and can explain why we skip staging for hotfixes."* As the new hire fills in "Completed" properties, the onboarding goal tracks progress automatically. No checklist doc. No "ask around."

### Compliance and Policy Mapping
A legal team models Regulations, Internal Policies, Controls, and Evidence as Nords. Connections define "Satisfies," "Conflicts With," and "Audited By." Each Control has a required property: last audit date. The AI enters a session with the Compliance Officer persona, with category weights tuned to prioritize "Conflicts With" and "Audited By" over lower-risk connections. It surfaces: *"Control C-14 (Data Retention) was last audited 11 months ago. Two regulations it satisfies have been updated since. Flagging for review."* The goal "Annual Audit Readiness" tracks completion across all Controls. The graph becomes the living compliance map, not a spreadsheet someone updates quarterly and nobody trusts.

---

## Who Is Nords For?

Nords is built for **AI-forward PMs, strategists, and teams outgrowing flat tools.** The day-one user is someone already making Trello + Miro + ChatGPT work together with duct tape, pasting context into prompts, manually syncing boards, and wishing the AI could just *see* the project. If you've ever copy-pasted a Kanban board into a chat window so an AI could help you plan, Nords replaces that entire workflow with a single canvas where structure and AI coexist natively.

---

## How Nords Is Different

The market is splitting into two camps: **AI-integrated project tools** (ClickUp, Notion, Atlassian) that bolt AI onto existing paradigms, and **knowledge graph tools** (Obsidian, Heptabase, Capacities) that structure information but don't connect to AI agents. Nords sits at the intersection, a visual knowledge graph that is also a live AI workspace.

- **vs. Notion AI:** Notion's AI is a powerful layer on top of pages and databases, but it operates on flat document context. It can summarize a page or query a database, but it can't traverse relationships between entities, track its own position, or work toward goals. Nords gives AI a stateful session with spatial awareness: the AI knows where it is, what's nearby, and what's incomplete.

- **vs. Atlassian Rovo:** Rovo leverages Atlassian's Teamwork Graph, 20 years of Jira/Confluence relationship data, which gives it strong organizational context. But that graph is invisible. Users can't see it, shape it, or correct it. Nords makes the graph the primary interface: you see the structure, you drag it, and every change is immediately reflected in the AI's reasoning. Rovo also requires the Atlassian ecosystem; Nords is a standalone platform with MCP for any AI client.

- **vs. Taskade:** Taskade treats projects as a graph with AI agents that "walk" references. But its graph is implicit, built from task hierarchies and links, not explicitly typed relationships with continuous distance values. Nords' connections carry typed semantics, directional arrows, and a 0.0–1.0 distance spectrum with named stages. You can ask "show me everything 70% through the review process" because the connections encode that meaning mathematically.

- **vs. ClickUp Brain:** ClickUp Brain searches across tasks, docs, and chats to answer questions and trigger workflows. It's a retrieval layer over existing project data, powerful for finding things, but it doesn't give AI a spatial model to navigate or a session to maintain state. There's no concept of the AI being "at" a specific work item and seeing its neighborhood.

- **vs. Fibery:** Fibery is the closest architectural cousin: custom entities, custom relations, a connected workspace. But Fibery's AI operates on database views and reports, not a spatial graph. It can generate formulas and analyze data history, but it doesn't have persona-driven traversal, distance-based semantics, or goal-bound sessions. Nords' connections aren't just links; they're measurements.

- **vs. Miro:** Miro is a drawing app. Its connectors are visual lines that carry no data, no stages, no distance values. You can't ask "show me everything 70% complete" because the lines don't know what 70% means. In Nords, every connection is a typed, queryable data point.

- **vs. Trello:** Trello cards live in exactly one column. Move a card to "In Review" and it stops being "In Progress." In Nords, a single Nord can be at different stages on different relationship types simultaneously: 80% done on the engineering track, 30% on the legal review.

- **vs. Raw graph databases (Neo4j, etc.):** Neo4j and friends are powerful, but they require Cypher or SPARQL to do anything. Nords gives you the same graph structure with a visual canvas anyone can use, plus an AI layer that speaks the graph natively via MCP. No query language. No database administration.

---

## Features

### Current

- [[Spatial Canvas]] — Infinite, freeform graph canvas where cards and connections come to life
- [[Board View]] — Dynamic kanban boards generated from any relationship type
- [[Persona Lens]] — Role-filtered heatmap that reshapes the graph around what matters to a given stakeholder
- [[Goals]] — Property-bound objectives with prerequisite chains and a dedicated dependency map
- [[Projects]] — Three project modes (Explore, Collect, Guided) that control how deterministic the AI behaves
- [[AI Integration]] — Session-based MCP server that gives AI agents a sense of place, progress, and purpose
- [[MCP Integration]] — Full tool reference, setup guide, URI scheme, and session lifecycle
- [[Preview Chat]] — Built-in conversational AI with a Dev Mode inspector for debugging
- [[Access Tokens]] — Per-project authentication tokens for connecting external MCP clients
- [[Data Model]] — Nords, Connections, NordTypes, ConnectionTypes: the core graph schema
- [[Property Types]] — 14 supported property field types and their behaviors
- [[Templates and Onboarding]] — Project templates, initialization flow, and first-run experience

### Planned

- [[Ingest Pipeline]] — Auto-create Nords and Connections from external sources (Jira, GitHub, transcripts, CSV)
- [[Wormholes]] — Cross-project Connections with Ghost Nords and tension propagation
- [[Goal Completion Actions]] — Automated side-effects on goal achievement: notifications, webhooks, downstream activation

