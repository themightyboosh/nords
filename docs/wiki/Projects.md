# Projects

> Projects are the top-level container in Nords. Each project defines a schema, a graph, and a mode that controls how deterministic the AI session behaves.

---

## Overview

Every Nords project operates in one of three **modes** that control the balance between AI freedom and structure. The mode determines what gets tracked, what triggers completion, and whether the AI session has explicit objectives.

You choose the mode when creating a project and can change it as the project matures, from open-ended exploration through structured capture to fully orchestrated goal execution.

---

## The Problem

- **AI tools offer no granularity between scripted and open-ended.** Teams either get brittle, fully scripted automation or directionless chatbot conversation. There is nothing in between; no dial to turn that adjusts how structured the AI's behavior should be.
- **Project context is flat.** Tools don't distinguish between "I'm exploring a new domain" and "I'm executing a structured interview." The AI gets the same context dump either way, with no signal about what kind of work it should be doing.
- **There's no concept of session completion.** AI sessions run until the user stops them. There's no mechanism for the AI to know when its job is done, so it either overruns or gets cut short.

---

## User Stories

- **As a knowledge manager,** I want to set up a project where AI simply explores and answers questions about my graph without tracking any completion.
- **As a product researcher,** I want the AI to systematically fill in required properties on every Stakeholder nord during an interview session.
- **As a project manager,** I want to define explicit goals with prerequisites so the AI works through a phased workflow in order.
- **As a team lead,** I want to change the project mode from Explore to Guided as the project matures from discovery to execution.
- **As a sales operations lead,** I want AI sessions to auto-terminate when the qualification goal is achieved, so agents don't overrun.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Mode selection** | Choose Explore, Collect, or Guided when creating a project. Each mode defines a distinct level of structure for AI sessions. |
| **Mode switching** | Change the project mode at any time without losing data. Switching from Explore to Collect auto-creates the implicit goal; switching to Guided enables the Goals panel. |
| **Implicit goal generation** | In Collect mode, an implicit goal ("Complete All Required Fields") auto-generates and binds to every required MCP property across every nord in the project. |
| **Explicit goal DAG** | In Guided mode, define goals with prerequisite chains, exclusion groups, and session-terminating behavior. See [[Goals]] for full details. |
| **Session completion tracking** | Collect mode surfaces a percentage bar based on required fields filled. Guided mode surfaces goal status badges across the DAG. |
| **Session termination** | In Guided mode, achieving a session-terminating goal ends the AI session automatically. Collect mode can also complete when all required fields are filled. |
| **Mode-aware Horizon** | The [[AI Integration]] Horizon computation adapts to the active mode: Explore returns full read access, Collect surfaces a `planning_queue` of incomplete nords, Guided includes active goal state. |
| **Mode-aware system prompt** | The active project mode is injected into the AI system prompt, giving the model clear context about what kind of work it should be doing. |

---

## Key Interactions

### Creating a Project

1. Click **"New Project"** from the dashboard
2. Provide a **name** and **purpose** for the project
3. Select a **mode** from three cards:
   - **Explore**: Knowledge graph only. No tracking, no completion.
   - **Collect**: Graph plus structured data capture. Tracks required field completion.
   - **Guided**: Full system with explicit goal orchestration, dependencies, and gates.
4. Optionally configure additional project settings (persona, start/end nords, MCP options)

### Changing the Mode

1. Open **Project Settings** from the sidebar
2. Navigate to the **Mode** section
3. Select the new mode:
   - Switching from **Explore to Collect** auto-creates the implicit goal and begins tracking required field completion
   - Switching to **Guided** enables the [[Goals]] panel and unlocks explicit goal creation
   - Switching back to **Explore** preserves existing goals and data but suspends tracking and completion logic

### Viewing Completion

| Mode | Completion Display |
|------|-------------------|
| **Explore** | No completion UI; the project is open-ended |
| **Collect** | Percentage bar in the project header showing required fields filled across all nords |
| **Guided** | Goal DAG canvas with status badges (Blocked, Achievable, Achieved, Cancelled) per goal |

---

## The Three Modes

### Explore

The knowledge graph, pure and simple. The AI connects via MCP and navigates freely: reading nords, traversing connections, switching personas. No properties are tracked, no completion is measured, and no session ends automatically.

**Use when:** mapping a new domain, brainstorming, building graph structure, or running a queryable knowledge base.

**Under the hood:** `initializeSessionGoals` skips entirely. No session goals are created. The AI has full read access with no completion targets.

### Collect

Knowledge graph plus structured data capture. An implicit goal auto-generates and binds to every required MCP property across every nord. Session completion equals the percentage of required fields filled.

**Use when:** stakeholder interviews, requirements capture, audits, or intake forms.

**Under the hood:** `ensureImplicitGoal` creates the goal "Complete All Required Fields." The AI Horizon surfaces a `planning_queue` of incomplete nords. `nords_update_session_nord` saves data incrementally. The implicit goal completes when all required fields are filled. This is the default mode for new projects.

### Guided

The full system: knowledge graph, data capture, and explicit goal orchestration. Define goals, bind them to properties, chain them in a DAG, group them in exclusion sets, and attach session-terminating behavior.

**Use when:** multi-phase workflows with dependencies, gates, or branching. Sprint to review to retro. Qualification to proposal to close.

**Under the hood:** `initializeSessionGoals` creates session goals for all explicit goals. Root goals start active; gated goals start pending. `evaluateGoals` fires on every property save: completing goals, activating children, cancelling excluded siblings, and triggering session termination. Goal events flow inline with the session.

---

## Project Settings

Projects expose the following configurable fields:

| Field | Description |
|-------|-------------|
| `name` | Display name of the project |
| `description` | Long-form project description |
| `purpose` | Concise statement of the project's intent, injected into AI context |
| `icon` | Project icon identifier |
| `project_mode` | Active mode: `explore`, `collect`, or `guided` |
| `mcp_enabled` | Whether MCP server access is enabled for this project |
| `mcp_capture_data` | Whether MCP sessions can write data back to the graph |
| `mcp_mutable` | Whether MCP sessions can create or modify nords and connections |
| `goals_enabled` | Whether the Goals panel and goal logic are active |
| `mcp_system_prompt` | Custom system prompt injected into AI sessions |
| `mcp_welcome_message` | Initial message displayed when an AI session starts |
| `end_prompt_suggestion` | Suggested closing prompt when a session nears completion |
| `default_persona_id` | Default [[Persona Lens]] applied to new sessions |
| `default_start_nord_id` | The nord where AI sessions begin navigation |
| `default_end_nord_id` | The nord that represents the session's destination or endpoint |

---

## Technical Notes

- `project_mode` is stored as a string enum: `'explore' | 'collect' | 'guided'` (defined in `entities.ts`).
- The default mode for new projects is `'collect'` (set in `projects.ts` and `routes/projects.ts`).
- The active mode is injected into the AI system prompt via `chat.ts`, giving the model explicit awareness of the project's structure level.
- Goal initialization is mode-conditional in `goals.ts`: Explore skips initialization entirely, Collect uses `ensureImplicitGoal`, and Guided uses `initializeSessionGoals`.
- Session completion checks diverge by mode: non-goal projects (Explore, Collect) use `mcpRepo.checkSessionCompletion`; goal projects (Guided) use the DAG evaluation engine.
- Mode can be changed at any time via the project update API (`PUT /projects/:id`). Switching modes preserves all existing data; only the tracking and completion logic changes.
- The Horizon response adapts to the active mode. See [[AI Integration]] for details on how mode shapes the AI's view of the graph.
- Goals in Guided mode follow the full lifecycle documented in [[Goals]]: property-bound completion, prerequisite chains, exclusion groups, and session termination.
