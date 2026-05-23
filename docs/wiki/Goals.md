# Goals

> First-class objectives that bind to your graph's data — auto-completing when the work is done, blocking when prerequisites are unmet, and giving AI agents clear missions to pursue.

---

## Overview

Goals are **first-class entities** in Nords that bridge the gap between *"what needs to happen"* and *"what has actually been done."*

A goal binds directly to nord properties. When the bound values are filled, the goal auto-completes — no manual status updates, no ceremonies. Goals can depend on other goals (prerequisite chains), cancel each other (exclusion groups), and even terminate an AI session when achieved (scoped missions).

Goals have their own dedicated **DAG canvas** — a visual dependency map where circles represent goals, rectangles represent nords, and directed edges show the critical path. It's the view that answers: *"What has to happen before this can be done?"*

---

## The Problem

- **Objectives are tracked manually, disconnected from actual work data.** Teams define goals in one place (OKR tools, slide decks, strategy docs) and track work in another (task boards, spreadsheets). Whether a goal is "done" is a judgment call based on someone's interpretation, not a computed fact grounded in the data.
- **Decisions about direction disappear.** When a team chooses path A over path B, that decision lives in a meeting note or a Slack thread. There's no structured record of which options were considered, which was chosen, and what that choice cancelled. Months later, no one remembers why path B was abandoned.
- **AI agents have no finish line.** Without explicit, evaluable goals, AI sessions either run indefinitely or get manually terminated. There's no mechanism for an AI to know when its job is done — it can work, but it can't know when to stop.

---

## User Stories

- **As a project manager,** I want to define goals that automatically complete when their dependent tasks are finished, so I don't have to manually track milestone status.
- **As a team lead,** I want to set up prerequisite chains between goals so the team has a clear critical path and knows what's blocking what.
- **As an AI agent,** I want to see which goals are blocked by missing data so I can prioritize filling those gaps during my session.
- **As a product owner,** I want to define mutually exclusive goals (e.g., "Launch Option A" vs. "Launch Option B") where choosing one cancels the other.
- **As a knowledge manager,** I want to scope an AI session to a specific goal — the AI works until the objective is met, then stops.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Property-bound completion** | Goals bind to specific nord properties. When all bound values are filled, the goal auto-completes — no manual toggle. |
| **Prerequisite chains** | Goals can depend on other goals, forming a directed acyclic graph (DAG) of dependencies. A goal is blocked until all its prerequisites are achieved. |
| **Exclusion groups** | Mutually exclusive goals — achieving one automatically cancels its siblings. Useful for A/B decisions, competing strategies, or fork-in-the-road choices. |
| **Session termination** | A goal can be configured to end the AI session when achieved, enabling scoped, objective-driven AI workflows with a clear finish line. |
| **Visual DAG canvas** | A dedicated canvas where goals render as circles, nords as rectangles, and dependencies as directed edges — a clear, scannable dependency map. |
| **Real-time evaluation** | Goal status is evaluated server-side on every property update and included in every Horizon computation for active AI sessions. |
| **Persona-weighted priority** | Goals can be weighted per [[Persona Lens]], so different roles see and prioritize different objectives. |

---

## Key Interactions

### Creating a Goal
1. Open the **Goals panel** from the sidebar
2. Click "New Goal" and provide a name and description
3. **Bind properties**: select one or more nord properties that must have values for this goal to complete
4. Optionally set **prerequisites** — other goals that must be achieved first
5. Optionally add to an **exclusion group** — achieving this goal cancels its siblings
6. Optionally enable **session termination** — completing this goal ends the active AI session

### Reading the Goal DAG

| Shape | Meaning |
|-------|---------| 
| ⭕ **Circle** | A goal — the objective |
| ▭ **Rectangle** | A nord — the work or data that feeds the goal |
| → **Directed edge** | Dependency — the source must be achieved/filled before the target is actionable |

### Goal Status Lifecycle

```
┌──────────┐     prerequisites met     ┌────────────┐     properties filled     ┌──────────┐
│  BLOCKED │ ────────────────────────▶ │ ACHIEVABLE │ ──────────────────────▶  │ ACHIEVED │
└──────────┘                           └────────────┘                           └──────────┘
                                              │ (exclusion group)
                                              ▼
                                       ┌────────────┐
                                       │ CANCELLED  │
                                       └────────────┘
```

- **Blocked** — one or more prerequisite goals are not yet achieved
- **Achievable** — all prerequisites met; bound properties can now be filled
- **Achieved** — all bound property values exist
- **Cancelled** — a sibling in the same exclusion group was achieved first

---

## Planned: Goal Completion Actions

> [!NOTE]
> **Goal Completion Actions** are a planned extension that will allow goals to trigger automated side-effects when achieved. Examples include: sending notifications, creating follow-up nords, updating external systems via webhooks, or spawning new AI sessions scoped to downstream goals. This feature is tracked on the [[Roadmap]].

---

## Technical Notes

- Goal evaluation runs server-side on every property update and is included in the Horizon response.
- The DAG canvas uses the same React Flow engine as the [[Spatial Canvas]] with custom node shapes (circle vs. rectangle).
- Exclusion group logic is evaluated atomically — achieving a goal immediately cancels all siblings in the group.
- Session termination triggers a clean MCP session shutdown with a goal-achieved event. See [[MCP Integration]] for the `session_terminated` event type.
- Goals support nested prerequisite chains of arbitrary depth; cycle detection is enforced at creation time.
- Goal status is included in every [[AI Integration]] Horizon computation, making goals visible and actionable to AI agents at every step.
