# Cross-Gate Movement & Persona Orchestration

> Answers to: "Can elements bounce around across gates?" and "How do we control which persona to jump to?"

---

## 1. Can Elements Bounce Around Across Gates?

**Short answer: Yes — and the architecture already supports it.**

### How `distance_x` Actually Works

The stage gate model in the plan describes a 7-position linear progression:

```
Triage (0.0) → Strategy (0.17) → Design (0.33) → Pink (0.5) → Red (0.67) → Gold (0.83) → Debrief (1.0)
```

But `distance_x` is a **continuous float between 0.0 and 1.0** — it's not an enum. The platform doesn't enforce any directionality. The MCP agent (via the system prompt) enforces gates *conversationally*, not structurally.

This means:

| Scenario | Platform Behavior | Agent Behavior |
|----------|-------------------|----------------|
| Move Opportunity forward | ✅ Just update `distance_x` | Agent checks gate conditions first |
| Move Opportunity backward (rework) | ✅ Just update `distance_x` to a lower value | Agent logs the reason and increments Review Attempts |
| Move a Solution Phase independent of the Opportunity | ✅ Each Nord has its own connections with their own `distance_x` | Agent can advance phases at different rates |
| Skip a gate entirely | ✅ Platform allows it | Agent should resist unless a Gate Override is documented |
| Park something "between" gates | ✅ e.g., `distance_x = 0.42` sits between Design and Pink | Useful for "in progress" states within a stage |

### What "Bouncing Around" Looks Like in Practice

The Opportunity Nord has a "Proposal Stage" connection whose `distance_x` represents the overall lifecycle position. But the **child Nords** (Solution Phases, Resource Allocations, Review Gates) each have their own connections and can be at *different* stages:

```
Opportunity "Acme Corp RFP"        → distance_x = 0.33 (Design)
  ├─ Solution Phase "Discovery"    → fully complete, could be at 0.5 (done)
  ├─ Solution Phase "MVP Sprint 1" → partially complete, still at 0.33
  ├─ Solution Phase "QA"           → not started, still at 0.17
  ├─ Resource Allocation "Sarah"   → assigned, at 0.33
  └─ Resource Allocation "TBD"     → incomplete, blocking Design Lock
```

The graph naturally supports **non-uniform progress** across the proposal's subgraph. The gate enforcement in the system prompt only checks whether *all required children* are complete before advancing the *parent Opportunity*.

### Rework Flows

When Red Review fails:

```
1. Review Gate (Red) → Status = "Failed"
2. Agent keeps Opportunity at distance_x = 0.67 (stays at Red Review position)
3. Agent increments Review Attempts counter on Opportunity
4. Agent identifies which elements need rework:
   - "Pricing needs adjustment — Total Price exceeds Stated Budget by $40K"
   - "Resource Allocation for Omar needs rate correction"
5. User/agent fixes the issues
6. Agent creates a NEW Review Gate (Red) Nord — attempt #2
7. When new Review Gate passes → advance to 0.83
```

The key insight: **Review Gates are Nords, not states.** Each review attempt is a separate entity in the graph. You can see the full history: "Pink passed on attempt 1, Red failed twice before passing on attempt 3, Gold passed first try." This is audit trail by design.

### What We Should Add to the System Prompt

```
REWORK RULES:
- When a Review Gate status = "Failed":
  1. Do NOT advance distance_x
  2. Increment the Opportunity's Review Attempts counter
  3. Create an action item list from the Review Gate's Findings
  4. Guide the user through corrections
  5. When corrections are complete, create a NEW Review Gate Nord
  6. The previous failed Review Gate remains in the graph as history

- When the user asks to skip a gate:
  1. Explain why the gate exists
  2. If they insist, require a Gate Override Rationale (long_text, not empty)
  3. Log the override as a property on the Opportunity
  4. Advance with a warning that skipped gates increase delivery risk
```

---

## 2. How Do We Control Which Persona to Jump To?

### What Exists Today

The persona system in Nords is already fully built:

| Component | What It Does |
|-----------|-------------|
| **LensContext** (`context/LensContext.tsx`) | Stores `activePersonaId` in React context, persisted to localStorage per project |
| **GlobalDock** (`Layout/GlobalDock.tsx`) | Persona switcher dropdown in the bottom dock — click to select, flyout shows all personas |
| **Persona Lens mode** | When a persona is active, the graph re-weights node positions based on that persona's `category_weights` |
| **PersonaCenterNode** | Renders the active persona's avatar at the graph origin — visual anchor |
| **ManagePersonas** | Full CRUD panel for creating/editing personas, mental models, guardrails, and weights |
| **usePersonas hook** | Fetches persona list + all mutation functions |
| **Temperature slider** | Per-persona temperature stored in the DB (just shipped) |

### How Persona Switching Works Right Now

```
User flow:
1. Click the persona selector in the GlobalDock (bottom bar)
2. Flyout shows all project personas with avatars
3. Click a persona → graph animates to that persona's weighted layout
4. All edges and nodes reposition based on category_weights
5. Selected persona persists in localStorage
```

This is a **manual, user-driven** switch. For the Proposal Director demo, we need to add **agent-suggested** switches.

### Three Levels of Persona Control

#### Level 1: Stage-Based Suggestion (Demo-Ready, No Code Changes)

Encode persona recommendations directly in the system prompt:

```
PERSONA ORCHESTRATION:
When the Opportunity enters a new stage, suggest the optimal persona:

| Stage         | Primary Persona       | Rationale                                    |
|---------------|----------------------|----------------------------------------------|
| Triage        | Proposal Director     | Strategic go/no-go decisions                 |
| Strategy      | Proposal Director     | Solution architecture and scope              |
| Design        | Resource Strategist   | Staffing and capacity planning               |
| Pink Review   | QA Reviewer           | Structural completeness check                |
| Red Review    | QA Reviewer           | Competitive and financial validation         |
| Gold/Submit   | Proposal Writer       | Final narrative polish and submission         |
| Debrief       | Proposal Director     | Win/loss analysis and lessons learned        |

When advancing to a new stage, tell the user:
"This stage is best served by the [Persona Name] perspective. 
Switch to the [Persona Name] lens in the dock to see the graph 
weighted for [what that persona prioritizes]."
```

The user manually switches. The agent *recommends*. This is zero code — it's pure prompt engineering.

#### Level 2: Context-Aware Suggestion (Small Enhancement)

Add an MCP tool that reports the currently active persona to the agent. The agent can then say:

```
"You're currently viewing through the Resource Strategist lens, 
which is ideal for staffing. But we're about to enter Red Review — 
you'll want the QA Reviewer's perspective to catch margin issues. 
Switch personas in the dock when you're ready."
```

This requires exposing `activePersonaId` through the MCP session context (adding it to the Graph Snapshot in §6.1's assembly pipeline). Small change — add the active persona ID to the `/graph` API response.

#### Level 3: Agent-Triggered Switch (Future Feature)

Add an MCP tool: `switchPersona(personaId)` that programmatically calls `setActivePersonaId` from the agent side. The graph would animate to the new persona's weights without the user touching the dock.

```
Agent: "Red Review requires the QA Reviewer's analytical lens. 
        Switching now."
[Graph animates — edges re-weight, nodes reposition]
[Persona avatar changes in dock]
[Agent's own temperature/voice adjusts to QA Reviewer's 0.5]
```

This is the most impressive demo moment but requires:
1. An MCP → client WebSocket message for `persona.switch`
2. Client listener that calls `setActivePersonaId`
3. ~50 LOC across server and client

### What I Recommend for the Demo

**Level 1 is sufficient and costs nothing.** The system prompt tells the agent which persona to recommend at each stage. The user switches manually in the dock, which *itself is a demo moment* — they click from "Resource Strategist" to "QA Reviewer" and watch the entire graph reorganize around financial risk.

Level 3 is the "wow" feature for a future sprint, but the manual switch is arguably *better for a demo* because the user physically participates in the lens shift. They feel the difference rather than having it happen to them.

### The Full Persona Flow in a Demo Walkthrough

```
Scene 1: Triage (Proposal Director — temp 0.7)
  Director: "Let's evaluate this RFP. I need Client Name, Industry, 
  Budget Range, and your Go/No-Go decision."
  → User fills Opportunity properties
  → Director: "Go decision confirmed. Advancing to Strategy."

Scene 2: Strategy (Proposal Director → suggests Resource Strategist)
  Director: "Solution phases are defined. Now we need staffing. 
  Switch to the Resource Strategist lens — they'll prioritize 
  the Assigned To and Skill Match connections."
  → User clicks Resource Strategist in dock
  → Graph reweights — Team Member nodes move to center
  
Scene 3: Design (Resource Strategist — temp 0.4)
  Strategist: "Sarah Kim has 40% availability and matches 3/4 
  required skills. I recommend her for the Architecture phase 
  at $260/hr. Marcus is at 75% — risky for a 30hr/week 
  commitment. Consider an External Resource for overflow."
  → Agent creates Resource Allocation Nords with precise math

Scene 4: Pink Review (QA Reviewer — temp 0.5)
  QA: "Switching to structural review. I'm checking every 
  Solution Phase for completeness. Phase 3 'QA Sprint' is 
  missing Deliverables and Start Week. Fix these before 
  I can pass Pink."

Scene 5: Red Review (QA Reviewer)
  QA: "Margin check: Target 30%, Actual 27.3%. The Acme 
  phase is underpriced — Omar's rate should be $208 with 
  margin, not $160 base. Adjusting."

Scene 6: Gold/Submit (Proposal Writer — temp 0.9)
  Writer: "Executive Summary draft: 'Acme Corp's digital 
  transformation requires a partner who understands both 
  the technical complexity of a React/AWS migration and 
  the organizational change management it demands...'"
  → Agent populates Proposal Document content sections

Scene 7: Debrief (Proposal Director)
  Director: "Outcome: Won. Total value $287K at 31.2% margin.
  Key lesson: the external resource for DevOps added 
  2 weeks to timeline but saved $18K vs senior internal."
```

---

## Summary

| Question | Answer |
|----------|--------|
| **Can elements bounce across gates?** | Yes — `distance_x` is a free float. Child Nords can progress independently. Rework keeps position + increments counter. Failed reviews become historical Nords in the graph. |
| **How do we control persona jumps?** | Today: manual switch via GlobalDock dropdown. For the demo: system prompt recommends personas per stage (zero code). Future: agent-triggered switch via WebSocket (~50 LOC). |
