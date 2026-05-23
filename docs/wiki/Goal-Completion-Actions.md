# Goal Completion Actions

> Automated side-effects when a Goal is achieved — state transitions, new Nords, snapshots, notifications, and downstream goal activation, all triggered by the graph's own progress.

---

## Overview

Today, completing a Goal in Nords means the bound properties are filled and the status flips to "Achieved." That's accurate, but it's inert. In the real world, completing an objective triggers downstream work — status updates cascade, new tasks spawn, stakeholders get notified, and the next phase begins.

Goal Completion Actions extend the existing Goal system with **configurable side-effects** that fire automatically when a Goal is achieved. Rather than treating goal completion as a terminal event, it becomes a trigger point — the graph reacts to its own progress.

Actions are defined per-goal in the Goal DetailDrawer under a new "On Completion" section. Each action specifies a type, a target, and optional conditions. The system already evaluates goals in real time on every property update; completion actions hook into that same evaluation pipeline.

---

## The Problem

- **Goal completion is a dead end.** Achieving a goal currently produces no downstream effects beyond session termination. The work that should follow — status transitions, notifications, new tasks — requires manual intervention.
- **State transitions are manual ceremonies.** When a milestone is hit, someone still has to go move cards, update statuses, and ping Slack. This lag between "done" and "communicated" is where information decays.
- **AI sessions end without handing off.** When an AI completes a scoped goal and the session terminates, there's no mechanism to automatically kick off what comes next — a new session, a new goal, or an external notification.
- **Cascading effects require human memory.** "When sprint review is done, snapshot the board and notify the stakeholders" is tribal knowledge. It should be encoded in the system.

---

## User Stories

- **As a project manager,** I want completing the "Sprint Review" goal to automatically advance all linked Work Items to "Done" on their Status connection, so I don't have to manually move every card.
- **As a team lead,** I want achieving the "Requirements Gathered" goal to spawn a "Design Spec" Nord pre-linked to all requirement Nords, so the next phase starts with structure already in place.
- **As a product owner,** I want a snapshot to be automatically captured when any milestone goal is achieved, so there's always an immutable record of the project state at each milestone.
- **As a program manager,** I want goal completion to fire a webhook to Slack with a summary of all linked Nords, so stakeholders are notified the moment progress happens.
- **As an AI agent,** I want completing a prerequisite goal to automatically unblock and activate the downstream goal, so my session can seamlessly continue toward the next objective without human intervention.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Nord State Transition** | Automatically move connected Nords along a ConnectionType spectrum when a goal completes. Example: all linked Work Items advance to `distance_x = 1.0` (Done). |
| **Nord Creation** | Spawn a new Nord from a template when a goal is achieved. The new Nord can be pre-linked to Nords that were connected to the completed goal. |
| **Connection Creation** | Create new Connections between existing Nords as a side-effect. Example: create "Approved By" connections from a deliverable to all reviewer Person Nords. |
| **Snapshot Trigger** | Auto-capture an immutable Snapshot at the moment of goal completion, named with the goal title and timestamp. |
| **Webhook / Notification** | Fire an outbound event to the Webhook & Event Bus — enabling Slack messages, email triggers, or custom integration hooks. |
| **Goal Chain Advancement** | Unblock downstream goals and optionally auto-activate them. The AI session's focus can shift automatically to the next achievable goal. |
| **Ingest Pipeline Trigger** | Kick off an Ingest Pipeline run as a side-effect. Example: completing "Sprint Planned" pulls latest Jira tickets into the canvas. |

---

## Key Interactions

### Action Configuration

1. Open a Goal in the **Goal DetailDrawer**
2. Scroll to the new **"On Completion"** section below the existing prerequisite and exclusion group configuration
3. Click **"Add Action"**
4. Select an **action type** from the dropdown (Nord State Transition, Nord Creation, etc.)
5. Configure the **target** — which Nords, ConnectionTypes, templates, or endpoints are affected
6. Optionally add a **condition** — an additional check that must pass before the action fires (e.g., "only if the goal was achieved by an AI agent")
7. Actions execute in the order they're listed; drag to reorder

### Action Types Detail

| Action Type | Configuration | Example |
|-------------|---------------|---------|
| **Nord State Transition** | Select a ConnectionType and target `distance_x` value. Choose which Nords are affected: all connected, filtered by type, or explicitly selected. | Goal "Sprint Review Complete" → all Work Item Nords advance to `distance_x = 1.0` (Done) on the Status connection |
| **Nord Creation** | Select a target NordType and optionally a template. Configure auto-linking rules to the goal's connected Nords. | Goal "Requirements Gathered" → create "Design Spec" Nord linked to all requirement Nords |
| **Connection Creation** | Select source and target Nords (or rules for selecting them), ConnectionType, initial direction, and `distance_x`. | Goal "Stakeholder Approval" → create "Approved By" connections from deliverable to each reviewer |
| **Snapshot Trigger** | Optionally customize the snapshot name pattern (default: `{goal_name} — {timestamp}`). | Goal "Milestone 1 Complete" → snapshot "Milestone 1 — 2026-05-23T16:00:00Z" |
| **Webhook / Notification** | Select a configured webhook endpoint or create a new one. Choose payload format (summary, full graph subset, custom template). | Goal "Release Ready" → POST to Slack with linked Nord summary |
| **Goal Chain Advancement** | Select downstream goals to unblock. Toggle auto-activation (shift AI session focus to the next goal). | Goal "Design Review" → "Development Sprint" becomes achievable |
| **Ingest Pipeline Trigger** | Select a configured Ingest Pipeline. Optionally pass goal context as pipeline parameters. | Goal "Sprint Planned" → run Jira ingest adapter |

### Execution Flow

```
┌──────────────┐     all bound properties     ┌──────────────┐
│ Goal         │ ──────────────────────────▶   │ Goal status  │
│ (evaluating) │          filled               │ → ACHIEVED   │
└──────────────┘                               └──────┬───────┘
                                                      │
                                               ┌──────▼───────┐
                                               │ Execute      │
                                               │ On Completion│
                                               │ actions      │
                                               │ (in order)   │
                                               └──────┬───────┘
                                                      │
                              ┌────────────────┬──────┼──────────────┐
                              ▼                ▼      ▼              ▼
                        ┌──────────┐    ┌──────────┐  ┌──────────┐  ┌──────────┐
                        │ Advance  │    │ Create   │  │ Capture  │  │ Fire     │
                        │ Nords    │    │ new      │  │ Snapshot │  │ Webhook  │
                        │ on       │    │ Nords /  │  │          │  │          │
                        │ spectrum │    │ Conns    │  │          │  │          │
                        └──────────┘    └──────────┘  └──────────┘  └──────────┘
```

### Goal DetailDrawer Layout

```
┌─────────────────────────────────────────────┐
│  Goal: Sprint Review Complete               │
├─────────────────────────────────────────────┤
│  Description: ...                           │
│  Bound Properties: [status, reviewer_notes] │
│  Prerequisites: [Sprint Planning]           │
│  Exclusion Group: —                         │
│  Ends Session: ✓                            │
├─────────────────────────────────────────────┤
│  On Completion                              │
│  ┌─────────────────────────────────────────┐│
│  │ 1. Nord State Transition                ││
│  │    → Work Items → Status → Done (1.0)   ││
│  │ 2. Snapshot Trigger                     ││
│  │    → "Sprint Review — {timestamp}"      ││
│  │ 3. Webhook / Notification               ││
│  │    → POST → #engineering-updates        ││
│  │ 4. Goal Chain Advancement               ││
│  │    → Unblock "Sprint Retro"             ││
│  ├─────────────────────────────────────────┤│
│  │ [+ Add Action]                          ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## Technical Notes

- Goal Completion Actions hook into the existing server-side goal evaluation pipeline. When a goal transitions to ACHIEVED, the action executor runs in sequence.
- Actions execute transactionally where possible — if a Nord State Transition or Nord Creation fails, the goal still shows as achieved, but the failed action is logged and surfaced in the project activity feed.
- Webhook/Notification actions require the Webhook & Event Bus infrastructure (Phase 2, planned). Until then, the action type is visible but disabled in the UI.
- Ingest Pipeline Trigger actions require a configured pipeline (see [[Ingest Pipeline]]). The action passes goal context (goal ID, linked Nord IDs) as pipeline parameters.
- Goal Chain Advancement integrates with the existing prerequisite system — it's syntactic sugar for "the downstream goal's prerequisite is now met," with the addition of optional auto-activation.
- Action configuration is stored as a JSON array on the goal entity, alongside existing fields like prerequisites and exclusion groups.
- **Depends on:** [[Goals|Goal Orchestration]] (✅ shipped), [[Roadmap#webhook--event-bus|Webhook & Event Bus]] (Phase 2 — required for notification actions).
