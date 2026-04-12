# [EPIC] 14: MCP & AI Integration

**Objective:** Implement the Model Context Protocol server enabling AI agents to read, query, and write to Nords graphs using structured JSON and Mermaid dual-payload format.
**Invariant:** Webhook ingress must produce identical effects to native WebSocket commands. AI mutations are tagged distinctly in the activity feed.
**Tech:** Node.js, MCP SDK, Mermaid.js, REST API
**Ref:** `03_mcp_and_ai_protocols.md`

---

## [FEATURE] 14.1: MCP Server & Tool Definitions

### [STORY] 14.1.1: MCP Server Bootstrap
* **Target:** `server/mcp.ts`
* **Directive:** Initialize MCP server using `@modelcontextprotocol/sdk`. Register as available server with capabilities: `tools`, `resources`, `prompts`. Authenticate incoming tool calls via project API token (from Project Settings → API & Access).
* **Ref:** `03_mcp_and_ai_protocols.md`
* **AC:** MCP server starts. `listTools` returns all registered tools. Unauthenticated requests rejected.

### [STORY] 14.1.2: MCP Tool — Read Graph (Semantic Dictionary)
* **Target:** `server/mcp.ts`
* **Directive:** Tool `readGraph`: returns full project state as dual-payload: 1) Mermaid topology string, 2) JSON array of all nords with properties and connections with distances. Includes type schemas for context.
* **Ref:** `03_mcp_and_ai_protocols.md`
* **AC:** Calling `readGraph({projectId})` returns valid Mermaid + JSON. Both payloads represent identical graph state.

### [STORY] 14.1.3: MCP Tool — Create Nord
* **Target:** `server/mcp.ts`
* **Directive:** Tool `createNord`: params `{projectId, typeId, title, properties?, position?}`. Creates a new nord via the same codepath as UI creation. Returns created nord object. Broadcasts via Yjs to all connected clients.
* **AC:** AI calls `createNord` → new node appears on all connected browsers within 100ms.

### [STORY] 14.1.4: MCP Tool — Create Connection
* **Target:** `server/mcp.ts`
* **Directive:** Tool `createConnection`: params `{projectId, typeId, sourceNordId, targetNordId, direction, distance?}`. Creates connection. Broadcasts via Yjs.
* **AC:** AI calls `createConnection` → new edge renders on canvas. Distance defaults to 0.5 if not specified.

### [STORY] 14.1.5: MCP Tool — Update Distance (Spatial Write)
* **Target:** `server/mcp.ts`
* **Directive:** Tool `updateDistance`: params `{connectionId, distance_x, distance_y?}`. Validates 0.0–1.0 range. Updates connection. Triggers physics repositioning on connected clients.
* **AC:** AI sets distance to 0.9 → nords physically move apart on canvas for all connected users.

### [STORY] 14.1.6: MCP Tool — Query Nords
* **Target:** `server/mcp.ts`
* **Directive:** Tool `queryNords`: params `{projectId, filters?}`. Filters support: `{type: "Task", properties: {"Status": "To Do"}}`. Returns matching nords with full metadata.
* **AC:** Querying `{type: "Task", properties: {"Status": "To Do"}}` returns only TODO tasks.

---

## [FEATURE] 14.2: AI Activity Tagging

### [STORY] 14.2.1: AI Mutation Tagging
* **Target:** `server/mcp.ts`, `ActivityFeed.tsx`
* **Directive:** All mutations from MCP tools are tagged with `source: 'ai-agent'` and agent identifier. Activity feed renders AI changes with bot icon (distinct from human avatar). Nords created by AI get a subtle bot badge on canvas.
* **Ref:** `04_ui.md` §2.5
* **AC:** AI creates a nord → activity feed shows "🤖 AI Agent created 'Task X'". Canvas card shows small bot indicator.

### [STORY] 14.2.2: View-Only MCP Access via Public Links
* **Target:** `server/mcp.ts`
* **Directive:** Public view-only links expose read-only MCP access. AI agents can call `readGraph` and `queryNords` via the shared link's token. Write operations rejected with 403.
* **Ref:** `04_ui.md` §2.3 (AI/MCP Wedge)
* **AC:** AI with view-only token: `readGraph` succeeds, `createNord` returns 403 Forbidden.
