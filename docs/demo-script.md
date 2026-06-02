# Demo Script — Walkthrough

> **Project:** Pulse Sense CGM — Design Control  
> **Duration:** 3 min (live) · 5 min (recorded with pauses)  
> **Seed command:** `npx tsx --env-file=.env src/seed-demo.ts user@example.com`

---

## PRE-FLIGHT

- Fresh seed. Browser at `/projects`. Full-screen, dark mode.
- Have a second browser tab ready (incognito) for the Share link at the end.

---

## ACT 1 — THE GRAPH ⏱ 0:00 – 0:45

`[Click into Pulse Sense CGM. Full canvas renders. ~64 cards visible.]`

> Nords is a platform for building AI experiences around **deep domain knowledge** — the kind of stuff that's too specialized for a generic chatbot and too complex for a form.
>
> You're looking at one right now. This is a medical device team building a continuous glucose monitor — heading toward FDA 510(k) clearance. Every card is a typed data object — requirements, risks, test cases, architecture decisions, clinical protocols. Every line between them is a typed relationship with its own properties.

`[Zoom in slowly to the "Battery thermal runaway" Risk card. Click it — property sheet opens.]`

> This risk — "battery thermal runaway" — has a severity of 4, a probability of 1. It mitigates through the Wireless Transmitter subsystem. Mitigation type: Elimination. Residual risk: Acceptable.
>
> This isn't a CRM record. This is **domain-specific knowledge** — ISO 14971 risk analysis — modeled as a graph.

`[Drag the Risk card closer to the Subsystem it mitigates.]`

> And I just changed the data by dragging a card. The distance went from 0.6 to 0.3. The stage label updated from "Controls" to "Eliminates."
>
> **Distance is data.** The AI reads these exact values. It knows what's close, what's far, and what that means in context.

---

## ACT 2 — THE BOARD ⏱ 0:45 – 1:15

`[Click the Board icon in the dock (grid icon). Board view renders.]`

> Same project. Board view.

`[Default dimension: "Design Control Phase" — show the FDA waterfall columns.]`

> These columns are the FDA design control waterfall — User Need → Design Input → Design Output → Verification → Validation → Transfer. This isn't a Kanban board someone configured. It **emerged from the relationship data**. The graph already knows.

`[Click the dimension dropdown. Switch to "Blocks".]`

> Switch the dimension — same cards rearrange by what's **blocking** what. NC-001 is blocking the 14-day wear test. NC-005 is blocking applicator force consistency. Both critical path.

`[Switch to "Assigned To".]`

> Switch again — capacity view. Marcus Cole has **seven items**. He's overloaded. One click.
>
> Every relationship type is already a board dimension. You never configure anything. The domain model **is** the product.

---

## ACT 3 — PERSONAS ⏱ 1:15 – 1:50

`[Click the Persona lens in the dock (users icon). Default persona: Dr. Priya Sharma loads.]`

> Here's where it gets interesting. Five people work on this device. A regulatory strategist, a systems engineer, a clinical researcher, a quality manager, a product director. They each need to see — and talk about — completely different things.

`[Heatmap activates. Regulatory items and risks snap to center. Architecture fades.]`

> Dr. Priya Sharma — VP Regulatory Affairs, former FDA reviewer. Risks, submission blockers, traceability gaps snap to center. Architecture decisions fade away. She didn't apply a filter. The graph **reshaped around her expertise.**

`[Click Marcus Cole in the persona switcher.]`

> Marcus Cole. Lead Systems Engineer. 

`[Graph reshapes. Subsystems, ADRs, and test cases pull to center.]`

> Completely different map. Subsystems, interfaces, failure surfaces. Same sixty-four cards.

`[Quick-click Sarah Kim.]`

> Sarah Kim — Clinical Affairs. Protocols, enrollment targets, IRB status.
>
> Three people. Three maps. **No one configured a dashboard.** The personas define what matters — weighted by connection type, weighted by goal — and the graph responds.
>
> And when AI adopts one of these personas, it doesn't just see differently. It **thinks** differently. It has guardrails — "never recommend skipping a design control milestone." Mental models — "every interface is a failure surface." A voice — "precise, citation-heavy, risk-averse."
>
> The conversation feels like talking to a **domain expert**, not a chatbot on rails.

---

## ACT 4 — THE GOAL DAG ⏱ 1:50 – 2:20

`[Click the Goals lens in the dock (target icon). GoalCanvas renders — 12 goals in a DAG.]`

> Goals. But not the kind you check off in a standup. These are a **dependency graph** — bound to actual data in the graph.

`[Point to the DAG structure — 4 roots on the left, flowing right through gate nodes to FDA Submission.]`

> Four roots: Requirements Locked, Risk Analysis Complete, Biocompatibility Cleared, Architecture Decided. They flow through **gate nodes** — AND gates, OR gates. You can't verify until requirements are locked AND risk analysis is done. But 510(k) readiness is an OR gate — verification OR clinical approval can unblock it.
>
> This is how regulated workflows actually work. Not a linear checklist — a **dependency web** where different paths converge.

`[Click "Risk Analysis Complete" — GoalDetailDrawer opens.]`

> Click a goal — it shows what needs to happen. Variables to collect: risk tolerance, highest-risk subsystem. Relevant nords to visit: the 8 risk items. The AI doesn't march through a script. It **navigates the graph organically** and collects what it needs along the way.
>
> The user never feels railed. They're having a conversation. The system is solving a dependency graph.

---

## ACT 5 — COLLECTIONS ⏱ 2:20 – 2:40

`[Open the Collections panel from the header.]`

> Collections are the questions the AI is trained to ask — fifteen variables across five groups. Regulatory strategy, risk posture, clinical status, engineering readiness, business planning.

`[Expand "Regulatory & Strategy" group.]`

> "What's your regulatory pathway?" "Who's the predicate device?" These aren't form fields. They're **conversation goals** woven into natural dialogue. The AI asks them when they're contextually relevant — not in order, not on a schedule.

`[Point to a variable description.]`

> Every variable has a rich description — enough context for the AI to ask an intelligent question. "The FDA regulatory pathway determines the submission strategy, predicate device requirements, and clinical evidence needed." The AI uses this to frame the question **like someone who actually understands the domain.**

> And when a goal fires, its achieved prompt resolves `{{predicate_device}}` to whatever the user said. The AI congratulates the team with **their own words** baked in.

---

## ACT 6 — SHARE & CHAT ⏱ 2:40 – 3:10

`[Open the Share panel. Click "Create Share Link".]`

> Ship it. One click — share link generated.

`[Copy the link. Open in a second browser tab (incognito). The ShareChat page loads.]`

> This is what your stakeholder sees. Clean chat interface. No canvas, no admin UI. Just a conversation with an AI that knows the entire graph.

`[Type: "I'm the VP of Regulatory. Walk me through our 510(k) readiness."]`

> Watch. The AI adopts the regulatory persona. It navigates the graph — references specific test results, risk mitigations, requirement traceability. It asks about the predicate device, submission quarter — but **only when it's natural to ask.**
>
> The user isn't filling out a form. They're having a conversation with someone who understands FDA 510(k) submissions. The goals fire in the background. The variables get collected. The workflow completes.

`[Let the AI respond. Point to the variable being collected.]`

> That's the difference. A generic chatbot would ask these fifteen questions in a list. Nords embeds them in a conversation that **feels like expertise.**

---

## CLOSING

> That's Nords. Take any domain — medical devices, legal compliance, financial audits, clinical trials, security assessments — model the knowledge as a graph, define the personas who live in it, set the goals that matter, and ship an AI conversation that feels like **talking to a domain expert.**
>
> Not a chatbot. Not a form. A **knowledge experience.**
>
> The graph is the product.

---

## EMERGENCY FALLBACK BEATS

If something breaks mid-demo, pivot to these standalone moments:

| Beat | Action | Line |
|------|--------|------|
| **Data drag** | Drag any card. Distance changes. | "Distance is data." |
| **Board flip** | Switch dimension dropdown | "Every relationship is already a board." |
| **Persona swap** | Click any persona | "Same project, different map — no dashboards." |
| **Goal DAG** | Show the goal canvas | "A dependency web, not a checklist." |
| **Share link** | Open any share URL | "Domain expertise in one link." |
