# API Reference

> REST API endpoints exposed by the Nords server.

---

*This page is a placeholder — full endpoint docs are auto-generated via Swagger.*

The server ships a Swagger UI at `/api-docs` when running locally. This wiki page will be populated with a curated human-readable reference once the API surface stabilises.

## Base URL

```
http://localhost:3000   (local dev)
```

## Authentication

All endpoints require a valid Firebase ID token in the `Authorization: Bearer <token>` header, or a per-project access token for MCP clients.

## Key Endpoint Groups

| Group | Prefix | Description |
|-------|--------|-------------|
| Projects | `/api/projects` | CRUD for projects |
| Nord Types | `/api/projects/:id/nord-types` | Type schema management |
| Connection Types | `/api/projects/:id/connection-types` | Edge type management |
| Nords | `/api/nords` | Node CRUD |
| Connections | `/api/connections` | Edge CRUD |
| Personas | `/api/projects/:id/personas` | Persona management |
| Goals | `/api/projects/:id/goals` | Goal CRUD |
| Goal Edges | `/api/projects/:id/goal-edges` | Prerequisite DAG |
| MCP Sessions | `/api/mcp-sessions` | Session lifecycle |
| Chat | `/api/projects/:id/chat` | Gemini proxy |
| Access Tokens | `/api/projects/:id/tokens` | Token management |

---

*For the MCP tool API, see [[MCP Integration]].*
