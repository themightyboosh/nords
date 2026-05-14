# Plan

## To-Do List

### 🔴 P0 — Quick Wins & Bug Fixes

- [x] **1. Project Settings as own menu item** — Move to a ⚙️ gear icon in the top nav bar (decouple from project title click).
- [x] **2. Icon selector for projects** — Place project icon next to the title. Reuse the same shared icon selector component used for Nords. Shown in both Create Project modal and Project Settings.
- [x] **3. Fix Persona color settings** — Debug and fix the HueSlider / accent_color save pipeline. **Root cause:** Zod schema had `accent_hue` (number) but client sends `accent_color` (hex string). Fixed schema + added debounced slider.
- [x] **4. Start Nord default to 'none'** — Show "None" explicitly when no start nord is selected. None is a valid answer.

### 🟡 P1 — Infrastructure

- [x] **5. End Nord setting** — New `default_end_nord_id` column + UI (mirror Start Nord pattern). Migration 015. Full cascade UI in ProjectSettings.
- [x] **6. Session completion → End Nord transition (Option A: server-side)** — `checkSessionCompletion()` in mcpSessions repo. After `upsertSessionNord`, checks all required props. Auto-transitions `current_nord_id` to End Nord if configured.
- [x] **7. Tools context in project settings prompt** — Enhanced system prompt textarea with structured placeholder sections (BUSINESS LOGIC, CAPABILITIES, GUARDRAILS) and updated hint mentioning Start/End Nord context injection.
- [x] **14. Admin section on Projects dashboard** — Added Admin group in sidebar: Analytics, Billing, Platform Settings. Placeholder items ready for content.
- [x] **15. Access Tokens** — Per-project token generation for external MCP access. Hash tokens (SHA-256), show once, support revoke. Migration 015, `accessTokensRepo`, full CRUD routes, UI in ProjectSettings.

### 🟠 P2 — Preview Chat Epic

- [x] **8. "Preview" top-level menu item** — Eye icon in ViewportHeader, opens fullscreen PreviewChat overlay. Wired into WorkspaceContent with state toggle.
- [x] **9. Session Management** — Save, reset, load sessions. Created `mcp_messages` table (Migration 016) for conversation logging. Full CRUD via `mcpMessagesRepo`.
- [x] **10. Session State Tracking** — `current_nord_id` on `mcp_sessions` (Migration 015), `findByProject()` for listing sessions. Tracked in PreviewChat UI with session dropdown.
- [x] **11. Session Backend CRUD** — Chat proxy route (`POST /api/projects/:id/chat`), message history endpoint (`GET /api/sessions/:id/messages`). Context assembly from project + session state.
- [x] **12. Dev Mode** — Split-pane Context Inspector in PreviewChat. Click any assistant message to see assembled system prompt, session state, model info, and token usage. Toggle via Code2 icon.

### 🔵 P3 — Advanced

- [ ] **16. Mutable MCP Mode** — Build admin-level MCP tools (create/edit/delete Nords, connections, types). Gated by `mcp_mutable` flag. Deferred but valuable for building demos faster. Key question: how to train the AI from usage (see notes below).
- [ ] **17. Context Management** — Merged into #16. Dynamic tool injection + system prompt assembly based on `mcp_mutable` flag.

### ⚪ P4 — Nice-to-Have

- [x] **13. Model switching** — Dropdown in PreviewChat header with Gemini 2.0 Flash, 2.5 Flash, 2.5 Pro. Selection persisted in localStorage. Model passed to chat proxy API.

---

## Notes

### On #16 — Training from Usage (Mutable Mode)

The key insight: **every mutable MCP session is a training signal.** If we capture what the AI does when building a demo (what Nords it creates, what connections it draws, what properties it fills), we can:

1. **Export session artifacts as project templates** — After a mutable session builds a demo project, snapshot the resulting graph as a reusable template. "AI built this → now it's a starting point for humans."

2. **Refine the system prompt from session logs** — After each mutable session, review the Dev Mode logs. Where did the AI make bad decisions? Add those as guardrails to the system prompt. This is manual RLHF without the infrastructure.

3. **Build a "replay" feature** — Store the full tool call sequence from a mutable session. Replay it against an empty project to reproduce the demo. This is effectively a macro recorder for graph construction.

4. **Few-shot examples in context** — Extract the best tool call sequences from past sessions and inject them as few-shot examples in the system prompt. "Here's how you built the last demo — follow this pattern."

The cheapest path: just enable mutable mode, build a demo with the AI in Preview + Dev Mode, then review the tool call log. The log itself is the training data. No ML pipeline needed — it's prompt engineering informed by real usage.
