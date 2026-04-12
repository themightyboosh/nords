# Nords Backlog: Master Index

All stories follow the AI-Optimized Agile Schema defined in `docs/architecture/11_ai_optimized_agile_schemas.md`.
Each story is atomic: one component, one test boundary, one verifiable output.

## Execution Sequence (Critical Path)

| Order | File | Epic | Story Count | Dependencies |
|:---:|---|---|:---:|---|
| 0 | [`01_sprint_zero.md`](./01_sprint_zero.md) | DevOps & Environment Foundation | 10 | None |
| 1 | [`02_auth_and_identity.md`](./02_auth_and_identity.md) | Auth & Identity | 10 | Sprint 0 |
| 2 | [`03_data_model_and_database.md`](./03_data_model_and_database.md) | Core Data Model & PostgreSQL | 12 | Sprint 0 |
| 3 | [`04_app_shell.md`](./04_app_shell.md) | App Shell, Header & Navigation | 14 | Auth |
| 4 | [`05_canvas_engine.md`](./05_canvas_engine.md) | React Flow Spatial Canvas Engine | 16 | App Shell, DB |
| 5 | [`06_nords_and_types.md`](./06_nords_and_types.md) | Nord Cards & Type System | 14 | Canvas Engine |
| 6 | [`07_connections_and_edges.md`](./07_connections_and_edges.md) | Connections, Lines & Edge Rendering | 16 | Nord Cards |
| 7 | [`08_detail_drawer.md`](./08_detail_drawer.md) | Detail Drawer & Entity Editing | 12 | Nords, Connections |
| 8 | [`09_spatial_lenses.md`](./09_spatial_lenses.md) | Spatial Lenses (Link + Matrix) | 14 | Canvas, Connections |
| 9 | [`10_multiplayer_crdt.md`](./10_multiplayer_crdt.md) | Real-Time Multiplayer (Yjs/CRDT) | 10 | Canvas Engine, DB |
| 10 | [`11_snapshots_and_history.md`](./11_snapshots_and_history.md) | Snapshots, History & Export | 10 | Data Model |
| 11 | [`12_comments_search_polish.md`](./12_comments_search_polish.md) | Comments, Search & UX Polish | 12 | Drawer, App Shell |
| 12 | [`13_animations_and_perf.md`](./13_animations_and_perf.md) | Animations & Performance | 10 | All Lenses |
| 13 | [`14_admin_templates_onboarding.md`](./14_admin_templates_onboarding.md) | Admin, Templates & Onboarding | 10 | Auth, Data Model |
| 14 | [`15_mcp_ai_integration.md`](./15_mcp_ai_integration.md) | MCP & AI Integration | 8 | Data Model, Export |

**Total: ~168 atomic stories**
