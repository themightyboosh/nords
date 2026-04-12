# Nords: Roadmap, Tech Stack, & Metrics

## 1. Roadmap Phases

### Phase 1: Foundation + Wow
Core product with the three signature features defining Nords' identity capabilities (2D only, no AI features natively drawing layout).
* Canvas (2D)
* Nords with full content (markdown, fields, attachments, comments)
* Lines with schemas, directional arrows, styles
* Spatial Semantic Paradigm (Size global, distance/direction mapped via Semantic Stage)
* Real-time multiplayer (shared canvas, Granular soft-locking)
* Immutable Snapshots & History scrubbing
* CSV & JSON Import/Export
* Initialization Flow & Template Injection workflows
* **Signature Fast-Follows:** The Reveal (Animated Tweening Transitions), Ghost Lines (Ambient connection hints), and Nord DNA (context URLs).
* Web Access Tokens & API URLs (MCP endpoint, Nord DNA base URL)
* Full Export (RAG-optimized context dump — Markdown/JSON/YAML)
* Global Icon Library (Lucide icon set for project + type icons)
* Line Detail Drawer (arrow direction, spectrum, per-connection comments)

### Phase 2: Intelligence + Depth
* MCP Server with token-based access scaling (Full AI human-parity API logic)
* AI Consumer Mode (Graph Analysis, Gap Detection)
* Tension Detection (AI flags spatial contradictions)
* The Spatial Pivot Table (Matrix / Kanban Bridge)
* Semantic Zoom scaling
* Heat View (thermal intensity overlay mapping hubs)
* The Temporal Player (Smooth playback histories)
* Snapshot Diffing (Split-screen and overlay comparison modes)
* Perspective Mode
* The Gravity Summary (Always-on AI view summarization)
* Template Marketplace capabilities (Admin publish)
* **Webhook & Event Bus:** Emit events on Nord creation, Connection changes, Snapshot saves, etc., enabling Slack notifications, Jira sync, and custom integrations alongside MCP.
* **Migration Importers:** Dedicated Trello and Notion importers that map columns to Semantic Stage values and boards to projects, dramatically reducing onboarding friction for switchers.

### Phase 3: Expansion + Growth
* AI Author Mode (AI spawning and suggesting spatial setups natively requiring approval)
* The Gravity Well (Optional physics mode for discovery-driven exploratory layouts)
* **Wormholes (Cross-Project Tension):** Establish connections across active projects. If Marketing drags a dependent deadline outward on their screen, the Engineering team watches the edge of their canvas stretch as the Marketing team exerts gravitational pull from another dimension.
* **Sandbox Branching:** Forking a Snapshot to play out "What-If" scenarios (e.g. destroying 30 Nords to watch the physics react) without affecting the Live State.
* **Flatten to Doc Export:** Exporting the spatial layout into a beautifully formatted, linear, readable PDF or Notion-style document for executive consumption.
* **Canvas Merge:** Combine two isolated projects natively, detecting overlaps, and resolving duplicates securely.
* **The Pitch (One-Click Story Mode):** Select a path through the graph; Nords generates a slide-by-slide presentation where transitions map physically to the camera following the path.
* **Workspace Folders:** Lightweight organizational grouping above the project level for enterprise teams managing dozens of projects.
* 3D Canvas toggle (WebGL/Three.js integration utilizing billboarding labels). 
* Advanced Algorithms (Centrality plotting, Critical Paths)
* Enterprise SSO & Audit logs

---

## 2. Tech Stack & Platform Strategy
* **Platform:** Responsive Web Application (Desktop-first, mobile/tablet layout optimized resolving touch interactions).
* **Hosting:** Cloud-hosted SaaS with separate MCP routing servers.
* **Database (Relational/Spatial Storage):** Postgres natively handling graph/relational patterns.
* **Rendering:** 2D canvas at launch (WebGL or Canvas2D with force-directed graph rendering libraries). 
* **Performance:** Must handle 200+ active Nords per workspace rendered natively using Semantic Zoom boundaries.
* **Animation Engine:** Spring-physics & Easing engines dedicated for The Reveal and Temporal Player transitions.

## 3. Monetization Strategy
* **Launch:** Free. No paywall. Focus purely on validation and concept adoption.
* **Future Monetization Levers:** Nord count per workspace. The free tier carries a generous Nord limit (e.g. 50 nords). Paid tiers unlock 200+ bounds, advanced AI analyses models, administrative controls, custom workspace templates, The Pitch features, and increased MCP API rate limits.

## 4. Success Metrics
### North Star Indicator
*"I'm never going to use Trello again."*

### Quantitative
* Projects created per user per month
* Nords per project (Building true graphs vs 3-node toys)
* Lines per Nord ratio (Connecting items vs isolated card drops)
* View switches / Lens toggles per session (Engaging with 'The Reveal' animations)
* Matrix pivot axis swaps per session (Engaging with the Spatial Pivot Table)
* Snapshot Diff usage (Are users comparing states?)
* Return rate (7-day traction)
* MCP Token authentication metrics (AI integration adoption)
* Nord DNA link sharing frequencies
* Gravity Summary invocations (Are viewers engaging with AI insights?)

### Qualitative
* First-session "Aha" moment when the user drags a Nord and sees math data change.
* "The Reveal" reaction when filtering Connections triggers layout rewrites.
* Tension Detection insights prompting manual behavior shifts.

## 5. Risk Mitigation
* **Learning curve blocks adoption:** Countered by Progressive Onboarding, Templates with Sample Data, Ghost Lines, and The Reveal making concepts visceral.
* **"200 nords is a toy" perception:** Countered by Semantic Zooming. Free tier caps at 50 to prove value before complexity strikes.
* **Performance issues via Animation/CRDTs:** Countered by limiting to 2D at launch, heavily resourcing the initial rendering optimization sprints, and aggressive line-hop limits.
* **Miro features overlap:** Countered by the architectural moat; Miro is a drawing app, Nords is a mapped database with spatial APIs yielding logic that Miro lines mathematically cannot answer.
