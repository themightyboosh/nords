# Product Features

> Detailed PRD-style documentation for every major capability in Nords. Each feature has its own page covering overview, user stories, key capabilities, interactions, and technical notes.

---

| Feature | Description |
|---------|-------------|
| [[Spatial Canvas]] | The primary visual workspace — an infinite, freeform graph canvas where cards and connections come to life |
| [[Board View]] | Dynamic kanban boards generated from any relationship type — drag to advance, switch dimensions instantly |
| [[Persona Lens]] | Role-filtered heatmap view that reshapes the graph around what matters most to a given stakeholder |
| [[Goals]] | First-class objectives with property-bound completion, prerequisite chains, and a dedicated dependency map |
| [[AI Integration]] | Session-based MCP server that gives AI agents a sense of place, progress, and purpose inside your graph |
| [[Preview Chat]] | Built-in conversational AI wired to your project's graph — with a full Dev Mode inspector for debugging |
| [[Access Tokens]] | Per-project authentication tokens for connecting external MCP clients securely |

---

## Reference

| Page | Description |
|------|-------------|
| [[Data Model]] | Nords, Connections, NordTypes, ConnectionTypes — the core graph schema and JSONB property storage |
| [[Property Types]] | The 14 supported property field types, validation rules, and rendering behaviors |
| [[Templates & Onboarding]] | Project templates, initialization flow, and first-run experience |
| [[Glossary]] | Canonical definitions for all Nords-specific terminology |

---

## Planned Features

> Features currently in design or development. See [[Roadmap]] for the full timeline.

| Feature | Phase | Description |
|---------|-------|-------------|
| [[Ingest Pipeline]] | Phase 2 | Generic framework for auto-creating Nords and Connections from external data sources (Jira, GitHub, transcripts, CSV) |
| [[Wormholes]] | Phase 3 | Cross-project Connections with typed semantics, Ghost Nords, and tension propagation across project boundaries |
| [[Goal Completion Actions]] | Phase 2 | Automated side-effects when a Goal is achieved — state transitions, notifications, snapshots, and downstream goal activation |
