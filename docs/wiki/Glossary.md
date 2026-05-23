# Glossary

> **Every term in the Nords vocabulary, defined in one place.**

---

## Core Primitives

| Term | Definition |
|------|-----------|
| **Nord** | A typed node card representing any entity — tasks, ideas, decisions, risks, artifacts, people. Nords carry custom properties defined by their NordType. See [[Data Model]]. |
| **NordType** | A user-defined schema for nords (e.g., "Task", "Person", "Risk"). Defines which properties, icon, color, and scale behavior all nords of that type inherit. See [[Property-Types]]. |
| **Connection** | A typed edge linking two entities in the graph. Carries direction, distance_x (0.0–1.0), distance_y (0.0–1.0), and custom properties defined by its ConnectionType. Also referred to as a "Line." See [[Data Model]]. |
| **ConnectionType** | A user-defined schema for connections (e.g., "Blocks", "Depends On", "Owns"). Defines the vocabulary of relationships, including default direction, X/Y stage labels, and custom properties. See [[Property-Types]]. |
| **Persona** | A graph-native representation of a person, role, or AI agent. Personas participate in the same connection system as Nords and are not metadata bolted on top. Each Persona has a Mental Model and CategoryWeights. See [[Persona Lens]]. |

---

## Spatial Concepts

| Term | Definition |
|------|-----------|
| **distance_x** | A continuous 0.0–1.0 value on a connection's horizontal axis. Encodes the semantic distance between two entities along the X dimension. Drives [[Board View]] columns when mapped to stage labels. |
| **distance_y** | A continuous 0.0–1.0 value on a connection's vertical axis. Encodes the semantic distance along the Y dimension. Drives [[Board View]] rows when mapped to stage labels. |
| **Semantic Stage** | User-defined text labels (e.g., "Blocker" → "Soft Dependency" → "Independent") that partition a 0.0–1.0 distance scale into qualitative regions. Breakpoints are adjustable. See [[Property-Types]]. |
| **Nord Scale** | An optional 0.0–1.0 property on nords that drives card width (0.25x–2.0x base). Enabled per NordType. Encodes relative importance or size within a type. See [[Property-Types]]. |

---

## AI & Session Concepts

| Term | Definition |
|------|-----------|
| **Horizon** | The AI's real-time situational awareness, computed server-side per MCP tool call. Combines the current nord, connected nords (weighted by the active Persona's CategoryWeights), incomplete required properties, and active goal states. See [[AI Integration]]. |
| **Session** | A stateful working context for an AI agent. The agent has a position in the graph, a role (Persona), and a live view of its surroundings (Horizon). Sessions bridge human context and AI context. See [[MCP Integration]]. |
| **MCP** | Model Context Protocol — the standard interface that exposes the full Nords graph for AI agent traversal, query, and mutation. MCP is the one and only permitted bridge between the spatial graph and an AI context window. See [[MCP Integration]]. |
| **Mental Model** | A Persona-level configuration describing how that role interprets the graph. Stored as structured text that shapes the AI agent's reasoning when operating under that Persona. See [[Persona Lens]]. |
| **Category Weight** | A numeric weight assigned by a Persona to a specific ConnectionType. Controls how strongly that relationship type influences the Persona's Horizon — higher weight means tighter focus on those connections. See [[Persona Lens]]. |

---

## Views & Visualization

| Term | Definition |
|------|-----------|
| **Lens** | A specific way to visualize the graph data — Spatial Canvas, Board (Matrix), Persona, or Goals. The underlying data stays the same; only the view changes. See [[Spatial Canvas]], [[Board View]], [[Persona Lens]], [[Goals]]. |
| **The Reveal** | The fluid physics-based animation that plays when switching between lenses or when data changes. Cards fly between positions so users can track where nodes moved — the moment where structured data becomes spatial understanding. |
| **Ghost Lines** | Visual connection indicators that appear during drag operations or hover states, showing potential or existing relationships before they are fully rendered. Helps users understand the graph structure during interaction. |

---

## Data & History

| Term | Definition |
|------|-----------|
| **Snapshot** | An immutable, time-stamped keyframe capturing the exact state of the entire project graph — coordinates, distance values, and metadata for every entity. Read-only, like a Git commit for spatial data. See [[Data Model]]. |
| **Nord DNA** | A shareable, MCP-accessible project graph export. The mechanism by which Nords projects can be shared and consumed by any AI tool — the viral loop of the product. |
| **Gravity Summary** | A computed overview of the forces acting on a nord — which connections are pulling it, in which directions, and with what intensity. Helps users understand why a card ended up where it did. |

---

## Goals System

| Term | Definition |
|------|-----------|
| **Goal** | A structured objective bound to specific property thresholds on nords. Goals form a DAG (Directed Acyclic Graph) of prerequisites. See [[Goals]]. |
| **Goal Property** | A binding between a Goal and a specific property on a specific nord. The goal evaluator checks whether the property value has crossed its completion threshold. |
| **Goal Edge** | A dependency edge between two Goals, forming the prerequisite DAG. Goal B cannot be achieved until Goal A is complete. |
| **Exclusion Group** | A set of Goals where achieving one automatically blocks or cancels the others. Models mutually exclusive outcomes (e.g., "Go" vs. "No-Go" decisions). |

---

## Infrastructure

| Term | Definition |
|------|-----------|
| **Wormhole** | A planned feature for cross-project graph traversal — connecting nords across different project boundaries while preserving type safety and access control. |
| **Ingest Pipeline** | The system for importing external data (documents, CSVs, APIs) into the graph as typed nords and connections. Transforms unstructured sources into structured graph entities. |

---

*See [[Data Model]], [[Property-Types]], [[Architecture]], and [[Templates and Onboarding]] for detailed documentation on these concepts.*
