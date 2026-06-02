# Demo Script — Walkthrough

> **Project:** Pulse Sense CGM — Design Control  
> **Duration:** 3 min (live) · 5 min (recorded with pauses)  
> **Seed command:** `npx tsx --env-file=.env src/seed-demo.ts user@example.com`

---

## PRE-FLIGHT

- Fresh seed. Browser at `/projects`. Full-screen, dark mode.
- Have a second browser tab ready (incognito) for the Share link at the end.

---

## ACT 1 — THE GRAPH ⏱ 0:00 – 0:40

`[Click into Pulse Sense CGM. Full canvas renders. ~64 cards visible.]`

> This is Nords. You're looking at a medical device team building a continuous glucose monitor — heading toward FDA clearance.
>
> Every card is a typed data object — requirements, risks, test cases, team members, architecture decisions. Every line between them is a typed relationship with a real value.

`[Zoom in slowly to the "Battery thermal runaway" Risk card. Click it — property sheet opens.]`

> This risk — "battery thermal runaway" — has a severity of 4, a probability of 1, and it mitigates through the Wireless Transmitter subsystem. The mitigation type is Elimination. Residual risk? Acceptable.

`[Drag the Risk card closer to the Subsystem it mitigates.]`

> I just dragged it closer. The distance value changed — from 0.6 to 0.3. The stage label updated from "Controls" to "Eliminates."
>
> I changed the data... by dragging a card.
>
> That's the core idea. **Distance is data.** And the AI reads these exact values.

---

## ACT 2 — THE BOARD ⏱ 0:40 – 1:10

`[Click the Board icon in the dock (grid icon). Board view renders.]`

> Same project. Board view.

`[Default dimension: "Design Control Phase" — show the FDA waterfall columns.]`

> These columns? They're the FDA design control waterfall — User Need → Design Input → Design Output → Verification → Validation → Transfer to Production. Generated from one relationship type. No configuration. No setup.

`[Click the dimension dropdown. Switch to "Blocks".]`

> Switch the dimension... and the same cards rearrange by what's **blocking** what. NC-001 — sensor drift — is blocking the 14-day wear test. NC-005 — applicator spring — is blocking insertion force consistency. Both are critical path.

`[Switch to "Assigned To".]`

> Switch again — now you see capacity. Marcus Cole has **seven items**. He's overloaded. You can see that in one click.
>
> Every relationship type you create is already a board. You never configure anything.

---

## ACT 3 — PERSONAS ⏱ 1:10 – 1:40

`[Click the Persona lens in the dock (users icon). Default persona: Dr. Priya Sharma loads.]`

> Five people work on this device. They need to see five different things.

`[Heatmap activates. Regulatory items and risks snap to center. Architecture fades.]`

> This is Dr. Priya Sharma — VP Regulatory Affairs, former FDA reviewer. Risks, submission blockers, traceability gaps — they snap to the center. Architecture decisions, team assignments — they fade.
>
> She sees what she needs to see. Without a filter. Without a dashboard. The graph **reshapes** around her priorities.

`[Click Marcus Cole in the persona switcher.]`

> Now Marcus. Lead Systems Engineer.

`[Graph reshapes. Subsystems, ADRs, and test cases pull to center.]`

> Completely different map. Same sixty-four cards. He sees architecture, interfaces, failure surfaces.

`[Quick-click Sarah Kim.]`

> Sarah — Clinical Affairs. Clinical protocols, enrollment targets, IRB status. Same project, three people, **three completely different maps.**
>
> And when AI adopts one of these personas... it doesn't just see differently. It **thinks** differently. It talks differently. It has guardrails, mental models, and a voice.

---

## ACT 4 — THE GOAL DAG ⏱ 1:40 – 2:10

`[Click the Goals lens in the dock (target icon). GoalCanvas renders — 12 goals in a DAG.]`

> Now — goals. These aren't status labels you toggle in a meeting. They're a **dependency graph** bound to actual data.

`[Point to the DAG structure — 4 roots on the left, flowing right through gate nodes to FDA Submission.]`

> Four roots — Requirements Locked, Risk Analysis Complete, Biocompatibility Cleared, Architecture Decided. They feed through **gate nodes** — these circles are AND gates and OR gates. You can't verify until requirements are locked AND risk analysis is done. But 510(k) readiness? That's an OR gate — verification OR clinical approval unblocks it.

`[Click "Risk Analysis Complete" — GoalDetailDrawer opens.]`

> Risk Analysis — click it. The drawer shows what this goal collects: risk tolerance, highest-risk subsystem. These are **variables** — questions the AI will ask during a session. The answers flow into the achieved prompt when the goal fires.

`[Point to the cascading dropdowns: Type → Nord, Group → Variable.]`

> Adding a relevant nord? Pick the type first — it filters the nord list. Adding a variable binding? Pick the collection group — it filters the variables. Everything cascades.

`[Point to the DAG edge from Risk Analysis → Verification Complete.]`

> And these edges? You can draw them right here. Drag from one goal to another — prerequisite created. The system enforces the chain.

---

## ACT 5 — COLLECTIONS ⏱ 2:10 – 2:30

`[Open the Collections panel from the header (Variable icon under Behavior group).]`

> Collections are the questions the AI is trained to ask. Fifteen variables across five groups — Regulatory & Strategy, Risk & Safety, Clinical, Engineering, Business.

`[Expand "Regulatory & Strategy" group. Show the variables: regulatory_pathway, target_population, predicate_device, submission_quarter.]`

> "What's your regulatory pathway?" "Who's your target population?" "What's the predicate device?" These aren't form fields. They're **conversation goals** — the AI weaves them into natural dialogue as it navigates the graph.

`[Point out the snake_case naming.]`

> And they're all snake_case — enforced. Type "Regulatory Pathway" and it auto-converts to `regulatory_pathway`. Consistency for the interpolation engine.

> When a goal fires, its achieved prompt uses `{{regulatory_pathway}}` — and the system resolves it to whatever the user said. The AI congratulates the team with **their own words** woven in.

---

## ACT 6 — SHARE & CHAT ⏱ 2:30 – 3:00

`[Open the Share panel from the header (under Publish group). Click "Create Share Link".]`

> Now ship it. One click — share link generated.

`[Copy the link. Open in a second browser tab (incognito). The ShareChat page loads.]`

> This is what your stakeholder sees. Clean chat interface. No admin UI. No canvas. Just a conversation with an AI that knows the entire graph.

`[Type: "I'm Priya. Walk me through where we stand on 510(k) readiness."]`

> Watch — the AI adopts Dr. Sharma's persona. It navigates the graph, references specific requirements, risks, test results. It asks about regulatory pathway, predicate device, submission quarter — the collection variables.

`[Let the AI respond. Point to the variable being collected.]`

> Every answer the user gives is saved as a variable. When enough variables are collected and the right nords have been visited — the goal fires. The AI delivers the achieved prompt with `{{predicate_device}}` resolved to "Dexcom G7."

`[Click the reset button in the chat to start fresh.]`

> Reset. Start over. Different persona, different path through the same graph. Same sixty-four cards. Infinite conversations.

---

## CLOSING

> That's Nords. A typed graph where distance is data. A board that configures itself. Personas that reshape the map. Goals that fire when the data says so. And a share link that puts an AI-guided conversation in anyone's hands.
>
> **The graph is the product.**

---

## EMERGENCY FALLBACK BEATS

If something breaks mid-demo, pivot to these standalone moments:

| Beat | Action | Line |
|------|--------|------|
| **Data drag** | Drag any card. Distance changes. | "Distance is data." |
| **Board flip** | Switch dimension dropdown | "Every relationship is already a board." |
| **Persona swap** | Click any persona | "Same project, different map." |
| **Goal DAG** | Show the goal canvas | "A dependency graph, not a status label." |
| **Share link** | Open any share URL | "Ship a conversation in one click." |
