# [EPIC] 9: Real-Time Multiplayer (Yjs / CRDT)

**Objective:** Implement conflict-free multiplayer editing using Yjs CRDTs over WebSockets with Redis Pub/Sub for horizontal scaling.
**Invariant:** State must never tear or lock across tabs. CRDTs resolve conflicts without server arbitration.
**Tech:** Yjs, y-websocket, Node.js, WebSocket, Redis Pub/Sub, Cloud Run
**Ref:** `10_technology_and_infrastructure.md` §1, `04_ui.md` §2.1

---

## [FEATURE] 9.1: Yjs Client Integration

### [STORY] 9.1.1: Yjs Document Provider
* **Target:** `src/lib/yjs.ts`
* **Directive:** Initialize `Y.Doc()`. Create shared types: `Y.Map('nords')`, `Y.Map('connections')`, `Y.Map('metadata')`. Connect via `WebsocketProvider` to `VITE_WS_URL`. Persist locally via `IndexeddbPersistence` for offline-first support.
* **AC:** Unit test: modifying `ydoc.getMap('nords').set('abc', {...})` in tab A → appears in tab B within 100ms. Offline: changes persist to IndexedDB and sync on reconnect.

### [STORY] 9.1.2: Yjs ↔ React Flow State Bridge
* **Target:** `src/hooks/useYjsSync.ts`
* **Directive:** Bridge Yjs shared maps to React Flow's `nodes` and `edges` state. Yjs `observe()` callbacks update React state. React state changes (drag, add, delete) write back to Yjs. Replace all `useState` arrays for nodes/edges with Yjs-backed state.
* **AC:** Adding a node in React Flow → Yjs Map updates → second tab receives node. Dragging node in tab A → position updates in tab B.

### [STORY] 9.1.3: Offline-First with IndexedDB
* **Target:** `src/lib/yjs.ts`
* **Directive:** `IndexeddbPersistence` caches Yjs document locally. On page load, hydrate from IndexedDB first (instant), then sync delta from WebSocket. On network loss, continue editing locally. On reconnect, CRDT merge resolves conflicts automatically.
* **AC:** Disconnect network → make edits → reconnect → edits appear in other tabs without data loss or conflicts.

---

## [FEATURE] 9.2: WebSocket Server

### [STORY] 9.2.1: Node.js WebSocket Server (y-websocket)
* **Target:** `server/ws.ts`
* **Directive:** Express + ws server. Use `y-websocket/bin/utils.js` for Yjs document handling. Authenticate incoming connections: extract Firebase JWT from query param, verify via `firebase-admin`. Reject unauthenticated connections with 401.
* **Ref:** `10_technology_and_infrastructure.md` §1, §3
* **AC:** Authenticated WebSocket connects. Unauthenticated connection rejects. Two authenticated clients share Yjs state.
> [!WARNING] **GCP Architect Note:** Cloud Run has a default timeout that will sever WebSockets. You must configure the Cloud Run service timeout to the maximum (3600 seconds), enable Session Affinity, and implement a rigid Ping/Pong keep-alive protocol (every ~15s) to prevent the Google external load balancers from indiscriminately dropping idle WebSocket connections.


### [STORY] 9.2.2: Redis Pub/Sub for Horizontal Scaling
* **Target:** `server/redis.ts`
* **Directive:** When Cloud Run scales to N instances, WebSocket clients on different instances need state sync. Use Redis Pub/Sub: on Yjs update, publish delta to Redis channel `project:{id}:updates`. All instances subscribe and broadcast to their local clients.
* **Ref:** `10_technology_and_infrastructure.md` §2.2 (Cloud Memorystore)
* **AC:** Client on Instance A edits → Client on Instance B receives update within 50ms via Redis relay.

### [STORY] 9.2.3: Yjs Document Persistence to PostgreSQL
* **Target:** `server/persistence.ts`
* **Directive:** Periodically (every 30s) and on connection close, persist Yjs document state as binary blob to PostgreSQL `project_yjs_state` table. On server restart, hydrate Yjs docs from Postgres.
* **AC:** Kill server → restart → reconnect client → full document state restored from Postgres.
restored from Postgres.
> [!TIP] **DBA Note:** Cloud Run containers can receive a `SIGTERM` at any time to scale down. Implement a strict graceful shutdown handler that interrupts the 30s batch window and forces an immediate flush of the Yjs binary blob to Cloud SQL before the container dies, preventing data loss.


---

## [FEATURE] 9.3: Multiplayer Presence

### [STORY] 9.3.1: Cursor Presence (Awareness Protocol)
* **Target:** `src/hooks/usePresence.ts`
* **Directive:** Use Yjs Awareness protocol. Broadcast: cursor position, user name, user color. Display other users' cursors as colored arrows with name labels on canvas. AI agents get distinct bot cursor icon.
* **Ref:** `04_ui.md` §2.1
* **AC:** Two users on same project: each sees the other's live cursor moving. Cursor shows name tag.

### [STORY] 9.3.2: Node Selection Aura (Soft Locking)
* **Target:** `NordNode.tsx`
* **Directive:** When User A selects/drags a node, broadcast via Awareness. Other users see a colored "aura" border (user's color) around that node. Attempting to drag an aura'd node: cursor slips off (cannot co-drag). Metadata editing still allowed (CRDT handles merge).
* **Ref:** `04_ui.md` §2.1
* **AC:** User A drags Node X: User B sees blue aura on Node X. User B can edit Node X's title in Drawer but cannot drag it.

### [STORY] 9.3.3: Teammate Avatars in Header
* **Target:** `ViewportHeader.tsx`
* **Directive:** Right zone of header shows avatar stack of currently connected users (max 3 visible + "+N" overflow). Clicking an avatar enters Perspective Mode: nords they created glow, their connections bolden, everything else fades.
* **Ref:** `04_ui.md` §2.2, §2.1
* **AC:** With 2 users connected: both see each other's avatars. Clicking avatar dims all except their contributions.

### [STORY] 9.3.4: Activity Feed (Canvas Heartbeat)
* **Target:** `src/components/Layout/ActivityFeed.tsx`
* **Directive:** Subtle pulse dot in header when off-screen changes occur. Clicking opens compact log of recent changes: "Daniel moved 'API Integration'", "AI Agent created 'New Task'". Each entry clickable → Camera Fly-To that location. AI changes tagged with bot icon.
* **Ref:** `04_ui.md` §2.5
* **AC:** User B edits off-screen → User A sees pulse. Clicking pulse → activity log. Clicking entry → camera flies to changed node.
