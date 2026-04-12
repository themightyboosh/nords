# Nords Property Type Reference

## How Nords and Connections Differ

Nords and Connections share the same property type system. The **only** structural difference is their spatial encoding:

| Entity         | Spatial Property         | What It Encodes                                                          | Visual Representation                                             |
| -------------- | ------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Nord**       | **Scale** (0.0–1.0)      | Relative importance/size within its type. Configured per-type.           | Card width (0.25x–2.0x base). Resize handle appears when enabled. |
| **Connection** | **Distance X** (0.0–1.0) | Horizontal proximity between two nords. Assigned its own stage property. | Horizontal distance on canvas; drives **Matrix columns**.         |
| **Connection** | **Distance Y** (0.0–1.0) | Vertical proximity between two nords. Assigned its own stage property.   | Vertical distance on canvas; drives **Matrix rows**.              |

Both also have: Title, Description (markdown), Icon, Color (from type), and any number of user-defined properties.

---

## Property Types Available

These property types are available for BOTH Nord types and Connection types. Users add them via Manage Types → "+ Add Property."

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
| **Stage** | Ordered waypoints along 0.0–1.0 path. Each label maps to a normalized position. Drives Matrix columns. | `Status` | `In Progress` (0.5) | Must match defined labels |
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
| **File Attachment** | One or more uploaded text files (`.txt`, `.md` only for v1) | `Spec Doc` | `api_spec.md` | Size limit, .txt/.md only |

---

## Stage Property — Deep Dive

The **Stage** property type is unique: it partitions a 0.0–1.0 continuous path into named waypoints.

```
0.0          0.33         0.66          1.0
 ├────────────┼────────────┼────────────┤
 │   To Do    │ In Progress│    Done    │
```

**Key behaviors:**
- Stage labels are defined at the **type level** (e.g., "Blocks" type has `To Do / In Progress / Done`)
- Each label maps to a normalized position on the 0–1 path
- Users can add any number of stages — they subdivide the path evenly by default, but positions are adjustable

**Connections have TWO independent stage axes:**

| Axis | Range | Assigned Stage Property | Drives |
|------|-------|------------------------|--------|
| **X distance** | 0.0–1.0 | e.g., `Status` → `To Do / In Progress / Done` | Matrix **columns** |
| **Y distance** | 0.0–1.0 | e.g., `Priority` → `Low / Medium / High` | Matrix **rows** |

Each axis gets its own independently assigned stage property. This is what makes the Matrix a true **spatial pivot table** — two semantic dimensions from a single connection type.

---

## Nord Type Options

When creating/editing a Nord Type in Manage Types:

| Setting                | Description                                           | Default   |
| ---------------------- | ----------------------------------------------------- | --------- |
| **Name**               | Type name (e.g., "Task", "Person")                    | Required  |
| **Icon**               | Lucide icon from the global icon selector             | `Square`  |
| **Color**              | Type accent color (hex)                               | Generated |
| **Scale Enabled**      | Whether this type uses scale-driven sizing            | `false`   |
| **Scale Property**     | Which property drives the scale (if enabled)          | None      |
| **Visible Properties** | Which 3 properties show on the collapsed card         | First 3   |
| **Properties**         | Array of property definitions (type, key, validation) | `[]`      |

## Connection Type Options

When creating/editing a Connection Type:

| Setting | Description | Default |
|---------|-------------|---------|
| **Name** | Type name (e.g., "Blocks", "Depends") | Required |
| **Color** | Line accent color (hex) | Generated |
| **Default Direction** | Arrow default: `to`, `from`, or `none` | `none` |
| **X Stage Property** | Which property drives x-distance stages (Matrix columns) | None |
| **X Stage Labels** | Named waypoints along the x-distance path (0.0–1.0) | `[]` |
| **Y Stage Property** | Which property drives y-distance stages (Matrix rows) | None |
| **Y Stage Labels** | Named waypoints along the y-distance path (0.0–1.0) | `[]` |
| **Properties** | Array of property definitions | `[]` |

> [!IMPORTANT]
> The **only functional differences** between Nord types and Connection types are:
> - Nords have **Scale** (1D, card width encoding). Connections do not.
> - Connections have **Distance** (2D: X + Y, each 0.0–1.0, each with its own stage property). Nords do not.
> - Connections have **Direction** (arrow: to/from/none). Nords do not.
> - Everything else (properties, comments) is shared.

---

## Matrix View — Rows & Columns Explained

The Matrix lens is a **spatial pivot table** that restructures the free-form canvas into a structured grid.

### How It Works

```
               ┌──────────────┬──────────────┬──────────────┐
               │   Stage 0    │   Stage 1    │   Stage 2    │
               │   (To Do)    │(In Progress) │   (Done)     │
    ┌──────────┼──────────────┼──────────────┼──────────────┤
    │ Target A │  [Nord 1]    │              │  [Nord 3]    │
    ├──────────┼──────────────┼──────────────┼──────────────┤
    │ Target B │              │  [Nord 2]    │              │
    ├──────────┼──────────────┼──────────────┼──────────────┤
    │ Target C │  [Nord 4]    │  [Nord 5]    │              │
    └──────────┴──────────────┴──────────────┴──────────────┘
```

### Columns (X-axis) = X Distance Stage Labels

- Columns are the **X stage labels** of the active connection type.
- Example: If "Blocks" has X stages `[To Do, In Progress, Done]`, those are the 3 columns.
- A Nord's column is determined by its **X distance value** on that connection (0.0–1.0 mapped to the nearest stage label).
- If a Nord has no connection of the active type, it falls into an "Unconnected" overflow column.

### Rows (Y-axis) = Y Distance Stage Labels

- Rows are the **Y stage labels** of the same connection type.
- Example: If "Blocks" has Y stages `[Low, Medium, High]`, those are the 3 rows.
- A Nord's row is determined by its **Y distance value** on that connection.
- If no Y stage property is assigned, rows default to target nords (grouped by what they connect to).

### The Spatial Bridge

The Matrix view preserves the canvas's core invariant: **position encodes meaning.**
- Horizontal position (column) = stage progression (where is this in its lifecycle?)
- Vertical position (row) = relational grouping (what is this connected to?)
- Card width (if type has scale) = spectrum value (same as canvas)

When switching from Matrix → Canvas, cards animate back to their saved x/y coordinates. This is the "Wow" transition — structured data flying back into spatial positions.
