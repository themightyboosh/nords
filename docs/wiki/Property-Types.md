# Property Types

> **A unified type system for nodes and edges.** Nords and Connections share the same 14 property types — the only difference is how they encode space.

---

## Overview

Every Nord and Connection in Nords carries a user-defined property schema. Properties are defined at the **type level** (NordType or ConnectionType) via Manage Types — individual instances inherit the schema and cannot add or remove properties on their own.

This gives teams a consistent, enforceable data model across the entire graph. It also means AI agents traversing the graph via [[MCP Integration]] can rely on predictable property schemas per type, enabling structured queries and validation.

---

## The Problem

- **Project tools give you a fixed set of fields.** You get "status," "assignee," and "due date" — and that's it. You can't define your own data model to match how your team actually thinks about work.
- **No shared vocabulary across node types.** In most tools, tasks and milestones live in separate systems with incompatible schemas. There's no way to apply the same measurement system to different entity types.
- **AI can't introspect schema.** Without typed, structured properties, AI assistants treat everything as unstructured text — they can't validate, filter, or reason over property values.

---

## User Stories

| # | Persona | Story |
|---|---------|-------|
| 1 | **Workspace Admin** | As an admin, I want to define a "Risk" NordType with `Severity (select)`, `Likelihood (percentage)`, and `Mitigation (long_text)` so every risk card follows the same structure. |
| 2 | **Product Manager** | As a PM, I want my "Task" type to require `Assignee` and `Due Date` so nords missing these fields show up as incomplete. |
| 3 | **AI Agent (via MCP)** | As an AI agent, I want to read a connection's stage label and its underlying 0.0–1.0 value so I can reason about both the qualitative state and the precise numeric position. |
| 4 | **Design Lead** | As a designer, I want to use `nord_reference` properties to cross-link design artifacts to feature nords so the graph captures every dependency. |
| 5 | **Team Member** | As a team member, I want to attach `.md` spec files directly to nords so context lives with the card, not in a separate drive folder. |

---

## Key Capabilities

| Capability | Description |
|-----------|-------------|
| **14 Property Types** | Four categories — Text, Numeric, Selection, Temporal — plus Relational types for cross-referencing entities, users, and files. |
| **Stage Property** | A unique ordered-label type that partitions a 0.0–1.0 scale into semantic waypoints with adjustable breakpoints. |
| **Dual-Axis Connection Stages** | Connections carry independent X and Y stage properties, enabling the [[Board View]] to act as a spatial pivot table. |
| **Nord Scale** | An optional 0.0–1.0 property that drives card width (0.25x–2.0x base), giving visual weight to higher-value nords. |
| **Type-Level Schema** | Properties are defined per type, not per instance. All nords of a type share the same structure. |
| **Completeness Rules** | Required properties flag nords as incomplete, surfaceable via [[MCP Integration]] tools like `nords_get_incomplete_nords`. |
| **Shared Type System** | Nords and Connections use the same 14 property types. The only structural difference is spatial encoding (Scale vs. Distance). |

---

## Property Types Catalog

### Text Properties

| Type | Description | Example Key | Example Value | Validation |
|------|-------------|-------------|---------------|------------|
| **Short Text** | Single-line string, max 255 chars | `Name` | `"Auth Service"` | Max length |
| **Long Text / Markdown** | Multi-line with markdown rendering | `Description` | `"## Overview\nHandles OAuth2..."` | None |
| **URL** | Hyperlink, opens externally | `Docs Link` | `https://docs.example.com` | URL format |

### Numeric Properties

| Type | Description | Example Key | Example Value | Validation |
|------|-------------|-------------|---------------|------------|
| **Number** | Integer or decimal | `Estimate` | `13` | Optional min/max |
| **Currency** | Number with currency symbol | `Budget` | `$45,000` | Currency code |
| **Percentage** | 0–100% display | `Completion` | `40%` | 0–100 |

### Selection Properties

| Type | Description | Example Key | Example Value | Validation |
|------|-------------|-------------|---------------|------------|
| **Stage** | Ordered waypoints along a 0.0–1.0 path. Each label maps to a normalized position. Drives Matrix columns/rows. | `Status` | `In Progress` (0.5) | Must match defined labels |
| **Single Select** | Pick one from predefined options | `Priority` | `Medium` | Enum values |
| **Multi Select** | Pick multiple from predefined options | `Tags` | `["frontend", "urgent"]` | Enum values |
| **Boolean** | Checkbox toggle | `Archived` | `true` | — |

### Temporal Properties

| Type | Description | Example Key | Example Value | Validation |
|------|-------------|-------------|---------------|------------|
| **Date** | Single date | `Due Date` | `2026-05-15` | ISO 8601 |
| **Date Range** | Start + end date pair | `Sprint Window` | `Apr 7–Apr 21` | Start < End |

### Relational Properties

| Type | Description | Example Key | Example Value | Validation |
|------|-------------|-------------|---------------|------------|
| **User / Assignee** | Reference to workspace member | `Assignee` | `Sarah Chen` | Must be member |
| **Nord Reference** | Cross-reference to another nord | `Blocks` | `→ Canvas Renderer` | Must exist |
| **File Attachment** | Uploaded text files (`.txt`, `.md` only for v1) | `Spec Doc` | `api_spec.md` | Size limit |

---

## Stage Property — Deep Dive

The **Stage** property type is unique in the system: it partitions a continuous 0.0–1.0 path into named waypoints that map directly to spatial positions on the canvas.

```
0.0          0.33         0.66          1.0
 ├────────────┼────────────┼────────────┤
 │   To Do    │ In Progress│    Done    │
```

### Key Behaviors

- Stage labels are defined at the **type level** — every instance of that type uses the same label set.
- Labels subdivide the 0.0–1.0 path **evenly by default**, but positions are adjustable via draggable slider handles in Manage Types.
- **Custom breakpoints** allow non-uniform distribution (e.g., "Critical" might span 0.0–0.1 while "Normal" spans 0.1–0.9).

### Bi-Directional Sync

The Stage property enforces two-way consistency:

- **Visual → Data (Graph to Data):** Drag two nords apart → the system calculates the new distance (e.g., 0.85) → the stage label updates to match.
- **Data → Visual (Data to Graph):** Select a new stage from the dropdown (e.g., "Done") → the physics engine moves the nords to the corresponding physical position.

---

## Connection Dual-Axis (X + Y)

Connections encode meaning on **two independent axes**, each with its own stage property:

| Axis | Range | Assigned Stage Property | Drives |
|------|-------|------------------------|--------|
| **X distance** | 0.0–1.0 | e.g., `Status` → `To Do / In Progress / Done` | [[Board View]] **columns** |
| **Y distance** | 0.0–1.0 | e.g., `Priority` → `Low / Medium / High` | [[Board View]] **rows** |

This is what makes the [[Board View]] a true **spatial pivot table** — two semantic dimensions encoded on a single connection type.

> [!NOTE]
> If no Y stage property is assigned to a ConnectionType, Board View rows default to grouping by target nords (what each source connects to).

---

## Nord Scale Property

Nords carry a **Scale** value (0.0–1.0) that encodes relative importance or size within their type:

| Setting | Value | Visual Effect |
|---------|-------|--------------|
| Scale disabled | — | All cards render at fixed base width (225px) |
| Scale = 0.0 | Minimum | Card width = 0.25× base |
| Scale = 0.5 | Midpoint | Card width = 1.0× base |
| Scale = 1.0 | Maximum | Card width = 2.0× base |

- Scale is **enabled per NordType** in Manage Types → "Scale Enabled" toggle.
- When enabled, a resize handle appears on the card.
- Scale persists across [[Board View]] — cards in board cells maintain their width encoding.

---

## Nords vs. Connections — Spatial Difference

Nords and Connections share the same property type system. The **only** structural difference is their spatial encoding:

| Entity | Spatial Property | What It Encodes | Visual |
|--------|-----------------|-----------------|--------|
| **Nord** | **Scale** (0.0–1.0) | Relative importance/size within type | Card width (0.25x–2.0x base) |
| **Connection** | **Distance X** (0.0–1.0) | Horizontal proximity between nords | Canvas distance · Board columns |
| **Connection** | **Distance Y** (0.0–1.0) | Vertical proximity between nords | Canvas distance · Board rows |

> [!IMPORTANT]
> The **only functional differences** between Nord types and Connection types are:
> - Nords have **Scale** (1D, card width encoding). Connections do not.
> - Connections have **Distance** (2D: X + Y, each 0.0–1.0, each with its own stage property). Nords do not.
> - Connections have **Direction** (arrow: to/from/neither/both). Nords do not.
> - Everything else (properties, comments) is shared.

---

## NordType Options

Settings available when creating or editing a NordType in Manage Types:

| Setting | Description | Default |
|---------|-------------|---------|
| **Name** | Type name (e.g., "Task", "Person") | Required |
| **Icon** | Lucide icon from the global icon selector | `Square` |
| **Color** | Type accent color (hex) | Generated |
| **Scale Enabled** | Whether this type uses scale-driven sizing | `false` |
| **Scale Property** | Which property drives the scale (if enabled) | None |
| **Visible Properties** | Which 3 properties show on the collapsed card | First 3 |
| **Properties** | Array of property definitions (type, key, validation) | `[]` |

---

## ConnectionType Options

Settings available when creating or editing a ConnectionType:

| Setting | Description | Default |
|---------|-------------|---------|
| **Name** | Type name (e.g., "Blocks", "Depends") | Required |
| **Color** | Line accent color (hex) | Generated |
| **Default Direction** | Arrow default: `to`, `from`, or `none` | `none` |
| **X Stage Property** | Which property drives x-distance stages (Board columns) | None |
| **X Stage Labels** | Named waypoints along the x-distance path (0.0–1.0) | `[]` |
| **Y Stage Property** | Which property drives y-distance stages (Board rows) | None |
| **Y Stage Labels** | Named waypoints along the y-distance path (0.0–1.0) | `[]` |
| **Properties** | Array of property definitions | `[]` |

---

## Nord Completeness Rules

Properties can be marked as **required** at the type level. A nord is considered **incomplete** when any required property has no value set.

- **Surfacing:** Incomplete nords are queryable via the MCP tool `nords_get_incomplete_nords` and visible in the [[AI Integration]] Horizon.
- **Goal Binding:** [[Goals]] can bind to specific property values — the goal evaluator checks completion thresholds after every session update.
- **Visual Indicator:** Incomplete nords display a subtle indicator on the card, signaling missing data to both humans and AI agents.

---

## Technical Notes

- **Schema Inheritance:** Property schemas are defined at the type level. Instance entities inherit the schema — they cannot add or remove properties. Updating a type's schema propagates to all instances.
- **Soft Deletes:** Removing a property from a type hides it from the live canvas but preserves it in historical snapshots. See [[Data Model]] for details.
- **Source:** `server/src/repositories/` handles property CRUD; `client/src/context/TypeRegistryContext` provides the frontend type cache.
- **Related pages:** [[Data Model]], [[Board View]], [[Architecture]], [[Glossary]]
