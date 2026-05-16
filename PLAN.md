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

### 🟣 P5 — Goal Orchestration UX (New 3)

> **Design principle:** Goals follow the same interaction pattern as Nords+Personas.
> ManageGoals modal = simple CRUD (like ManagePersonas).
> Goal Canvas = spatial layout (like Graph view for Nords).
> Goal DetailDrawer = flow config (like DetailDrawer for Nords).

- [x] **18. Lucide icons for Goals** — Replaced emoji icons with the shared `IconPicker` / `resolveIcon` system. DB `icon` column now stores Lucide icon names (e.g., `"Target"`, `"User"`).
- [x] **19. Ethnographic system prompt** — Rewrote chat.ts prompt to enforce Grand Tour / Probing / Laddering interview techniques. Suppresses form-filling behavior.
- [x] **20. Goals DB migration** — `019_goals_system.sql`: `goals`, `goal_properties`, `mcp_session_goals`, `persona_goal_weights` tables.
- [x] **21. Goals CRUD API** — Full REST endpoints: project-scoped goal CRUD, property bindings, evaluation engine in `goals.ts`.
- [x] **22. Demo seed script** — `seed_goals_demo.mjs` populates Paws & Claws with 6 goals (chained prerequisites, exclusion groups, free-floating).

- [x] **23. Goals as 4th Dock lens** — Add "Goals" to the GlobalDock lens toggle (Board | Graph | Persona | **Goals**). Uses a Target icon. When active, shows the Goal Canvas instead of the Nord canvas.

- [x] **24. Simplify ManageGoals modal** — Strip down to match ManagePersonas simplicity. The modal should ONLY contain:
  - Goal name + Lucide icon picker
  - Accent color (HueSlider)
  - Description (textarea)
  - Achieved Prompt (textarea)
  - **NO flow config** (no prerequisites, no terminates toggle, no exclusion group, no property bindings). All of that moves to the Goal DetailDrawer (#26).

- [x] **25. Goal Canvas (spatial layout)** — When the Goals lens is active, render goals as **circles** on a spatial canvas (Nords are rectangles). Goals can be positioned spatially. Connections between goals represent prerequisites/flow. This is where the user *sees* the chain/branch structure visually — not in the modal.

- [x] **26. Goal DetailDrawer (side panel)** — When a user clicks a goal circle on the Goal Canvas, open a DetailDrawer (same pattern as clicking a Nord). This drawer contains:
  - Flow config: Requires (prerequisite dropdown), Ends Session toggle, Exclusion Group
  - Property Bindings: Nord → property binding CRUD
  - Is Default toggle
  - Same look/feel as the Nord DetailDrawer

- [x] **27. Goal connections on canvas** — Prerequisites rendered as directed edges between goal circles. Exclusion groups shown as a shared visual grouping (dashed boundary or shared color). The canvas IS the flow diagram.

---

## Notes

### On #16 — Training from Usage (Mutable Mode)

The key insight: **every mutable MCP session is a training signal.** If we capture what the AI does when building a demo (what Nords it creates, what connections it draws, what properties it fills), we can:

1. **Export session artifacts as project templates** — After a mutable session builds a demo project, snapshot the resulting graph as a reusable template. "AI built this → now it's a starting point for humans."

2. **Refine the system prompt from session logs** — After each mutable session, review the Dev Mode logs. Where did the AI make bad decisions? Add those as guardrails to the system prompt. This is manual RLHF without the infrastructure.

3. **Build a "replay" feature** — Store the full tool call sequence from a mutable session. Replay it against an empty project to reproduce the demo. This is effectively a macro recorder for graph construction.

4. **Few-shot examples in context** — Extract the best tool call sequences from past sessions and inject them as few-shot examples in the system prompt. "Here's how you built the last demo — follow this pattern."

The cheapest path: just enable mutable mode, build a demo with the AI in Preview + Dev Mode, then review the tool call log. The log itself is the training data. No ML pipeline needed — it's prompt engineering informed by real usage.

### On #23-27 — Goal UX Architecture (New 3 Feedback)

The core insight from feedback: **Goals should follow the exact same spatial+drawer pattern as Nords.**

```
ManagePersonas  ←→  ManageGoals (simple CRUD modal)
   ↕                    ↕
Persona Lens    ←→  Goals Lens (spatial canvas)
   ↕                    ↕
PersonaDrawer   ←→  GoalDetailDrawer (side panel with config)
```

**Visual distinction:** Goals = circles, Nords = rectangles. This makes it immediately clear which canvas you're on.

**What goes where:**
- **ManageGoals modal** (header button): Name, icon, color, description, achieved prompt. That's it. Like Personas.
- **Goal Canvas** (dock lens): Spatial layout of goals as circles. Prerequisite chains = directed edges. Exclusion groups = visual grouping.
- **Goal DetailDrawer** (click on canvas): Flow config, property bindings, default/terminates toggles. Like the Nord DetailDrawer.

The sidebar list from the current ManageGoals (screenshot 3 — the one the user likes) becomes the sidebar of the Goals lens, not the modal.
