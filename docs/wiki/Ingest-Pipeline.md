# Ingest Pipeline

> A generic, extensible framework for automatically creating Nords and Connections from external data — turning Nords from a tool you build in to a canvas that also builds itself.

---

## Overview

The Ingest Pipeline lets external signals flow into the graph without manual replication. Teams generate rich, structured information across dozens of tools every day — tickets in Jira, pull requests in GitHub, decisions in meeting recordings, milestones on shared calendars. Today, capturing any of that in a structured system means someone has to stop, switch contexts, and manually re-enter what already exists elsewhere.

The Ingest Pipeline eliminates that overhead. Data arrives through webhooks, API polling, or file uploads, passes through a normalize → transform → write pipeline, and emerges as fully-typed Nords and Connections on the canvas — ready for AI agents to traverse and humans to arrange spatially.

The graph becomes an index of work happening everywhere else, not a parallel data entry chore.

---

## The Problem

- **Manual replication kills adoption.** Teams already track work in existing tools. Asking them to duplicate that into a second system is the primary reason structured knowledge tools are abandoned within weeks.
- **External signals decay before they arrive.** By the time someone manually copies a Jira ticket or summarizes a meeting, context has already been lost — nuance, relationships, and timing erode in translation.
- **AI gets a stale, partial picture.** When only manually-entered Nords exist, the graph is always incomplete. Agents reason over gaps they can't see, missing work that's happening in other systems.
- **Relationships between systems are invisible.** A PR implements a ticket, a meeting produces action items, a calendar event involves stakeholders — but these connections live in peoples' heads, not in any queryable structure.

---

## User Stories

- **As a project manager,** I want Jira tickets to automatically appear as Nords on my canvas so the graph always reflects the current state of work without manual entry.
- **As an engineering lead,** I want GitHub PRs to auto-link to the Work Item Nords they implement so my team's dependency graph stays accurate without anyone maintaining it.
- **As a product strategist,** I want to upload a meeting transcript and have it automatically create Decision and Action Item Nords linked to attendees, so I never lose signal from conversations.
- **As a data analyst,** I want to bulk-import a CSV of customer feedback entries as typed Nords with properties pre-mapped to columns, so I can visualize patterns spatially.
- **As an AI agent,** I want ingested Nords to carry `source_url` properties so I can reference the original source when reasoning about a node, rather than working from incomplete copies.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Adapter → Transformer → Writer pipeline** | A three-stage architecture that normalizes, maps, and writes external data into the graph. Each stage is independently configurable per source type. |
| **Source Registry** | A configuration table defining active pipelines — source type, adapter, target NordType, target ConnectionType, polling interval, and field mappings. |
| **NordType-driven mapping** | Every pipeline targets a specific NordType. The NordType's `properties_schema` defines what fields the transformer must populate. Unmapped required properties are flagged as incomplete. |
| **Deduplication via `source_url`** | Each ingested Nord carries a `source_url` property pointing to the original record. Duplicate events for the same URL update the existing Nord rather than creating duplicates. |
| **No content copying** | Large content (PR diffs, full transcripts, document bodies) stays in the source system. The Nord stores a URL-type property pointing to it — the graph is an index, not a copy. |
| **Relationship inference** | Transformers use configurable matching rules (name, external ID, URL, branch naming convention) to auto-link ingested Nords to existing graph entities. |
| **Batch and real-time modes** | Pipelines support both real-time webhook triggers and scheduled polling cycles, depending on the source system's capabilities. |

---

## Key Interactions

### Pipeline Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│  Data Source  │────▶│  Adapter     │────▶│  Transformer │────▶│  Writer  │
│  (webhook,   │     │  (normalize  │     │  (map to     │     │  (MCP    │
│   API poll,  │     │   payload)   │     │   NordType + │     │   create │
│   file drop) │     │              │     │   properties)│     │   tools) │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

| Component | Purpose |
|-----------|---------|
| **Adapters** | Normalize external data into a common intermediate format. One adapter per source type (webhook, API poll, file upload, CSV/JSON). |
| **Transformers** | Map intermediate data to a target NordType and property schema. Resolve relationships to existing Nords via matching rules (name, external ID, URL). |
| **Writer** | Create Nords and Connections via MCP mutable tools. Handles deduplication, relationship linking, and `source_url` tracking. |
| **Source Registry** | Configuration table defining active pipelines: source type, adapter, target NordType, target ConnectionType, polling interval, field mappings. |

### Example Pipelines

| Source | Trigger | Created Nords | Created Connections |
|--------|---------|---------------|---------------------|
| Jira webhook | Issue created/updated | Nord (type: Work Item) with status, assignee, priority | "Assigned To" → Person Nord; "Implements" → parent Epic Nord |
| GitHub webhook | PR opened/merged | Nord (type: Code Review) with branch, author, URL | "Implements" → linked Work Item Nord (via branch naming convention) |
| Meeting transcript | File upload or API | Nord (type: Meeting) + child Decision/Action Nords | "Decided In" → Meeting; "Assigned To" → attendee Person Nords |
| CSV/JSON import | Manual upload | Batch Nords of configured type with column→property mapping | Optional relationship columns mapping to ConnectionTypes |
| Calendar API | Poll cycle | Nord (type: Event) with date, attendees, agenda | "Involves" → Person Nords; "Relates To" → matched topic Nords |

### Configuring a Pipeline

1. Open **Project Settings → Ingest Pipelines**
2. Click "New Pipeline" and select a source type (webhook, API poll, file upload)
3. Choose the **target NordType** — the pipeline will map incoming data to this type's property schema
4. Configure **field mappings**: which source fields populate which Nord properties
5. Set **relationship rules**: how to auto-link ingested Nords to existing graph entities (e.g., match by external ID, name, or URL)
6. For webhook sources, copy the generated **endpoint URL** into the source system's webhook settings
7. For polling sources, set the **poll interval** and provide API credentials

### Deduplication Flow

```
┌──────────────┐     ┌───────────────────────┐     ┌─────────────────┐
│ Incoming     │────▶│ Check source_url       │────▶│ Nord exists?    │
│ Event        │     │ against existing Nords  │     │                 │
└──────────────┘     └───────────────────────┘     └────────┬────────┘
                                                      │           │
                                                     YES          NO
                                                      │           │
                                                      ▼           ▼
                                                ┌──────────┐ ┌──────────┐
                                                │  Update  │ │  Create  │
                                                │  existing │ │  new     │
                                                │  Nord    │ │  Nord    │
                                                └──────────┘ └──────────┘
```

---

## Technical Notes

- The Writer stage uses MCP mutable tools (`nords_create_nord`, `nords_create_connection`, `nords_update_nord`), requiring the project's `mcp_mutable` flag to be enabled.
- Pipeline configuration is stored per-project in the database alongside NordType and ConnectionType definitions.
- Adapters are pluggable TypeScript modules implementing a common `IngestAdapter` interface. New source types can be added without modifying existing pipeline logic.
- Incomplete ingested Nords (unmapped required properties) integrate with the existing Nord completeness system — they surface in `nords_get_incomplete_nords` and the Horizon.
- The `source_url` property is indexed for fast deduplication lookups during high-volume webhook processing.
- **Depends on:** [[Roadmap#webhook--event-bus|Webhook & Event Bus]] (Phase 2), Mutable MCP Mode (🔄 in progress).
