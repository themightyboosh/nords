# Nords Product Demo — Video Script

> **Byline:** Map Knowledge. Wire Meaning. Deliver Expertise.
>
> **Runtime:** 3:00–3:15
>
> **Format:** Screen capture with voiceover
>
> **Demo Project:** Meridian Medical — Pulse Sense CGM

---

## Scene 0: The Hook (0:00–0:15)

*Black screen. Text appears word by word, synced to VO.*

**VO:**

> You paste your sprint board into ChatGPT. You copy your risk matrix into Claude. You screenshot your architecture diagram and ask AI to "review it."
>
> And every time — the AI says *"Based on the information provided..."*
>
> Because it has no map. No structure. No idea where anything is.
>
> What if it did?

**VISUAL:** Quick cuts of copy-paste chaos → fade to black → Nords logo fades in.

**TEXT ON SCREEN:**

```
NORDS
Map Knowledge. Wire Meaning. Deliver Expertise.
```

---

## Scene 1: The Canvas + Data Model (0:15–0:45)

*Fade into the Pulse Sense project. Full spatial canvas, ~60 nords visible. Ambient electronic music begins.*

**VO:**

> This is Nords. A medical device team building a continuous glucose monitor. Every card is a typed data object — requirements, risks, test cases, subsystems. Every line is a typed relationship with a real, continuous value.

**ACTIONS:**
1. Pan across the canvas slowly (2s) — show the full topology
2. Zoom from macro (cluster view) → meso (card names) → micro (full property sheet on a Risk card showing `hazard`, `severity`, `probability`, `risk_score`)
3. Hover over a connection line — tooltip shows: `Mitigates · distance_x: 0.35 · Stage: "Monitoring"`

**VO (cont):**

> Watch this. I'll drag this risk card closer to the requirement it mitigates.

**ACTIONS:**
4. Drag "Battery thermal runaway" Risk closer to "14-day continuous operation" Requirement
5. Show `distance_x` updating in real-time from `0.6` to `0.3`
6. Stage label flips from "Controls" → "Monitoring"

**VO (cont):**

> I just changed the data by dragging a card. Distance *is* data. The AI reads these exact same values.

---

## Scene 2: Board View (0:45–1:05)

*Click Board View icon in toolbar. Transition animation.*

**VO:**

> Any relationship type becomes a kanban board. This is the FDA design control waterfall — User Need through Transfer to Production — generated from one connection type.

**ACTIONS:**
1. Show "Design Control Phase" board — 6 columns with cards sorted
2. Grab a Test Case card, drag from "Protocol Ready" → "Tested"
3. Show the `distance_x` badge update

**VO (cont):**

> Now switch the dimension.

**ACTIONS:**
4. Click dimension dropdown → select "Blocks"
5. Board reshuffles — columns become: Soft Dependency → Hard Dependency → Critical Blocker
6. Three cards in the "Critical Blocker" column are immediately visible

**VO (cont):**

> Same cards. Different question. Switch to "Assigned To" —

**ACTIONS:**
7. Switch to "Assigned To" — columns: Available → Allocated → Overloaded
8. Marcus Cole's column has 7 items stacked

**VO (cont):**

> — and your capacity problem is visible in one click. No board configuration. No setup. Every relationship is a board.

---

## Scene 3: Persona Lens (1:05–1:30)

*Click Persona Lens icon. The heatmap renders.*

**VO:**

> Five people work on this device. They need to see five different things. Activate Dr. Priya Sharma — VP of Regulatory Affairs.

**ACTIONS:**
1. Click Dr. Sharma's avatar in the persona selector
2. Heatmap renders — Risks and blocked Requirements snap to the center. Regulatory Submissions orbit close. Architecture Decisions fade to the edges.

**VO (cont):**

> Risks, traceability gaps, and submission blockers — front and center. Everything else fades.
>
> Now switch to Marcus Cole, Lead Systems Engineer.

**ACTIONS:**
3. Click Marcus Cole
4. The entire graph reshapes — Subsystems and "Part Of" connections pull to center. Architecture Decisions orbit close. Regulatory items fade.

**VO (cont):**

> Same sixty-four nords. Completely different map. And when AI adopts a persona, it inherits the priorities *and* the voice. Dr. Sharma's AI is precise and citation-heavy. Elena's is strategic and market-focused.

**ACTIONS:**
5. Quick flash: click Sarah Kim (Clinical) — another complete reshape. Clinical Protocols and patient-facing requirements center.

---

## Scene 4: Goals (1:30–1:50)

*Click Goals icon. The DAG canvas renders.*

**VO:**

> Goals aren't status labels you toggle. They're bound to actual data. This is the path to FDA submission — six goals in a dependency chain.

**ACTIONS:**
1. Show full DAG — 6 goal circles with nord rectangles connected. Color coding: 2 green (achievable), 3 amber (blocked), 1 red.
2. Click "Risk Analysis Complete" — detail panel shows: 8 Risk nords bound, 6/8 have `mitigation` filled. Progress: 75%.

**VO (cont):**

> Risk Analysis is at seventy-five percent. Two risk items are missing mitigation strategies.

**ACTIONS:**
3. Click "Verification Complete" — shows BLOCKED badge. Prerequisite arrow points to "Requirements Locked" (incomplete).

**VO (cont):**

> And you can't verify what you haven't specified. The system *knows* the critical path. Not from someone's slide deck — from the actual data.

---

## Scene 5: AI Integration — The Money Shot (1:50–2:40)

*Open Preview Chat panel. Select Guided mode. Dr. Sharma persona active.*

**VO:**

> Here's where it all comes together. The AI doesn't get a text dump. It enters a *session* — with a position in the graph, a persona, and a live view of what's around it.

**ACTIONS:**
1. Click "New Session." AI greeting appears:

> *"I see the 510(k) submission requires four upstream goals. Risk Analysis is at 75% — two risk items need mitigation strategies. Requirements Locked is at 87%. Should I walk through the gaps?"*

**VO (cont):**

> It already knows. Ask it what's blocking verification.

**ACTIONS:**
2. Type: "What's blocking verification?"
3. AI responds — calls `nords_get_horizon` → `nords_traverse_connection`. Identifies Requirement REQ-003 missing `trace_status`.

**VO (cont):**

> Now watch it work. The AI finds a risk with no mitigation and asks the right question.

**ACTIONS:**
4. AI navigates to Risk #7 ("Adhesive contact dermatitis"): *"This risk has severity 3 and probability 4, giving a score of 12. What mitigation is the team pursuing?"*
5. User types: "Hypoallergenic medical-grade adhesive with 72-hour biocompatibility testing per ISO 10993-5."
6. AI calls `nords_update_session_nord` — property fills.
7. Goal progress badge updates: 75% → 87.5%

**VO (cont):**

> The data filled. The goal advanced. No status ceremony. Now — let me show you what's under the hood.

**ACTIONS:**
8. Toggle **Dev Mode** ON
9. Show tool call timeline: `nords_get_briefing` → `nords_get_horizon` → `nords_traverse_connection` → `nords_update_session_nord`
10. Expand one call — show the JSON arguments and response
11. Flash the system prompt tab — show persona definition, mental models, goal bindings

**VO (cont):**

> Every tool call. Every argument. The full system prompt with persona weights and goal bindings. No black box. You can see exactly why the AI said what it said.

**ACTIONS:**
12. Switch back to Canvas — show the Risk card the AI just updated has animated to a new position (Mitigates connection distance changed).

**VO (cont):**

> The AI didn't summarize your project. It *worked in it*. And the graph moved.

---

## Scene 6: Three Modes (2:40–2:50)

*Quick visual — show Project Settings → Mode selector.*

**VO:**

> Three modes. One dial for how deterministic your AI gets.

**ACTIONS:**
1. Flash "Explore" card — *"Open-ended graph navigation. No tracking."*
2. Flash "Collect" card — *"Structured data capture. Completion tracking."*
3. Flash "Guided" card — *"Goal orchestration. Prerequisites. Session termination."*

**VO (cont):**

> Start exploring. Start collecting. Start shipping.

---

## Scene 7: Close (2:50–3:00)

*Pull back to full canvas view. Slow zoom out. Music swells.*

**VO:**

> Your AI has been guessing long enough. Give it a map.

**VISUAL:** Canvas blurs elegantly. Logo and byline fade in center screen.

```
NORDS
Map Knowledge. Wire Meaning. Deliver Expertise.

nords.dev — Free to start.
```

*Music out. Black.*

---

## Production Notes

- **Music:** Ambient electronic — think Tycho or Boards of Canada. Low energy during canvas/board. Builds during AI session. Swells at close.
- **Pacing:** Each scene is a single unbroken screen recording. No jump cuts within a scene. Cuts happen at scene transitions only.
- **Text overlays:** Feature names appear as subtle bottom-left badges when each feature is first shown (e.g., `⬡ SPATIAL CANVAS`, `⬡ BOARD VIEW`).
- **Cursor:** Use a large, visible cursor. Every click and drag should be deliberate and trackable.
- **Resolution:** 1920×1080, 60fps. Canvas should be on a dark theme.
