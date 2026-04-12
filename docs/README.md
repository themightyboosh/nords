# Nords: AI-Native Documentation Core

This directory contains the split, optimized Product Requirements Document for **Nords**, a spatial relationship map replacing flat project-management tools. 

To prevent AI hallucination and token-dilution, the monolithic PRD has been decoupled into highly targeted "System Prompts." You only need to feed an LLM agent the specific markdown file relevant to the stack layer it is working on. 

## 🏗️ Architecture & Backend
*(Provide these to agents handling the database, MCP routing, API, and Core Logic)*
* **[`01_vision_and_invariants.md`](./architecture/01_vision_and_invariants.md):** The core anchor. Defines the competitive moat, terminology, and 3 unbreakable AI Laws (Invariants) that agents must never drift from. **(Always include this file)**
* **[`02_data_model_and_physics.md`](./architecture/02_data_model_and_physics.md):** Defines Nords, Connections, Postgres JSON payloads, the Semantic Stage bounds, and how physics auto-equilibrium prevents overlapping data.
* **[`03_mcp_and_ai_protocols.md`](./architecture/03_mcp_and_ai_protocols.md):** Defines exactly how AI agents use MCP tooling to read graphs (Semantic Dictionary, Dual-Payload formatting) and write back explicitly via distance values.
* **[`08_property_types_reference.md`](./architecture/08_property_types_reference.md):** Complete property type reference for Nords and Connections. Documents all data types (Text, Number, Stage, Date, etc.), the dual-axis Distance model (X + Y), Scale encoding, and Matrix view row/column logic.
* **[`09_edge_rendering_study.md`](./architecture/09_edge_rendering_study.md):** Research study analyzing line routing and edge rendering strategies. Covers anchor algorithms, Bézier vs. orthogonal paths, prior art (draw.io, Miro, React Flow), and a phased implementation recommendation using dynamic port selection with cubic Bézier curves.
* **[`10_technology_and_infrastructure.md`](./architecture/10_technology_and_infrastructure.md):** Defines the production technology stack, hosting infrastructure, and environment topology. Codifies Google Cloud Platform mapping (Cloud Run, Cloud SQL), React Flow as the rendering engine, and Firebase Authentication usage.

## 🖥️ UI & Frontend
*(Provide these to agents writing React components, CSS, and interactive state)*
* **[`04_ui_and_interactions.md`](./frontend/04_ui_and_interactions.md):** Details Layout bounds, touch logic, double-click gestures, Ribboning parallel lines, Palettes, and multiplayer cursor tracking.
* **[`05_spatial_lenses_and_animation.md`](./frontend/05_spatial_lenses_and_animation.md):** Details Rendering logic, Semantic Zooming thresholds, Elastic clustering, "The Reveal" tweening animations, and the Spatial Pivot Table dual-axis mechanics.

## 🚀 Product & Business
*(Primarily for human stakeholders and roadmap planning)*
* **[`06_admin_and_templates.md`](./product/06_admin_and_templates.md):** GTM template library logic, OKR/RAG use-cases, and global schema application.
* **[`07_roadmap_tech_metrics.md`](./product/07_roadmap_tech_metrics.md):** Feature phasing (Phase 1-3), Postgres tech stack expectations, monetization theory, and North Star metrics.
