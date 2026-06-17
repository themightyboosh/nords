# Demo Script — Walkthrough

> **Project:** Pulse Sense CGM — Design Control
> **Duration:** 5 min (live) · 7 min (recorded with pauses)
> **Seed command:** `npx tsx --env-file=.env src/seed-demo.ts user@example.com`

---

## PRE-FLIGHT

- Fresh seed. Browser at `/projects`. Full-screen, dark mode.
- Have a second browser tab ready (incognito) for the Share link.
- Verify the **Test → Tests** panel shows 5 pre-seeded scenarios (happy path, tangential, reluctant, adversarial, rushed).

---

## ACT 1 — THE GRAPH ⏱ 0:00 – 0:30

`[Click into Pulse Sense CGM. Full canvas renders. ~64 cards visible.]`

> Again, Nords is about digitizing and using expertise and making it accessible to any AI.
> 
> In our demo, we're buildimg a **regulatory and engineering expert that helps a medtech team navigate the complex, multi-year process of getting a medical device through FDA clearance** — where the knowledge is normally fragmented across five specialists who each understand their silo but nobody holds the complete picture.

`[Zoom to "Battery thermal runaway" Risk card. Click — property sheet opens.]`

> Here's a risk — "battery thermal runaway." You can see how serious it is, what part of the device it affects, how the team plans to deal with it. All structured, all queryable — all visible to the AI.

`[Drag the Risk card closer to the Subsystem it mitigates.]`

> Now watch — I just dragged this card closer. The relationship changed. The label updated. **Moving things on the canvas actually changes the data.** The AI reads position, distance, proximity — it all means something.

---

## ACT 2 — THE BOARD ⏱ 0:30 – 1:00

`[Click the Board icon in the dock.]`

> Again, our obkective is to make it fast and eas¥ to get expertise into AI and you agents. So here's the Same project, with a different and familiar kanban view.

`[Default dimension: "Design Control Phase" — FDA waterfall columns visible.]`

> These columns are the stages this device has to go through before it can ship. Nobody initally configured this board — it **came from the data**.  

`[Switch dimension to "Blocks".]`

> One click — now we see what's blocking what. Two items stuck. That's your critical path.

`[Switch to "Assigned To".]`

> One more click — now it's by person. Marcus has **seven things on his plate**. You get a new board for every relationship type in your project. Zero setup.

> And here's the thing — all of this knowledge, every card, every relationship, every business process baked into this board — it's all exposed through **MCP**. Desined so that any AI that speaks the protocol can read this graph, navigate it, ask questions against it. You're not locked into one model or one vendor. You digitize the knowledge once, and it's accessible to **any AI**

---

## ACT 3 — EXPERT LENSES ⏱ 1:00 – 1:40

`[Click the Persona lens in the dock. Dr. Priya Sharma loads. Graph reshapes around regulatory concerns.]`

> This is your consultancy in a box. Five experts work on this device — regulatory, engineering, clinical, quality, product. Each one sees the same data, but they care about completely different things.

> This is Priya — regulatory strategist. Watch what happened. Risks, submission blockers, traceability gaps snapped to the center. Engineering decisions faded to the edges. The graph **reshaped around her expertise.**

`[Click the persona avatar in the center of the graph. PersonaLensDrawer opens — weight sliders visible.]`

> And here's how you tune the bias. Every category has a weight — how much this expert cares about it. Watch the graph as I drag this.

`[Drag the "Mitigates" slider from +60 to +100. Graph animates in real time — mitigation relationships pull tighter.]`

> See that? Risk mitigations just pulled closer together. The graph is **physically responding** to how much this expert values that relationship.

`[Drag "Informs" slider down to -30. Graph animates — informational connections push outward.]`

> Drop informational connections — they fade and spread. Priya doesn't care about those. She cares about what mitigates what and what blocks what.

`[Close the drawer. Open the persona flyout in the dock. Click Marcus Cole. Graph completely reshapes.]`

> Now Marcus — the systems engineer. Completely different map. Interfaces, subsystems, architecture decisions front and center. Same cards, totally different expertise.

`[Click Sarah Kim. Graph reshapes again.]`

> Sarah — clinical research. Protocols, patient enrollment, IRB status. 
> 
> We're looking at three of the five experts on this project — three completely different maps. **Nobody built a dashboard.** You're looking at what each person actually knows, modeled as weighted relationships.

> And when the AI talks through one of these lenses, it doesn't just see differently — it **thinks** differently. Guardrails, mental models, a voice. It's not a chatbot. It's a **domain expert.**

---

## ACT 4 — THE GOAL  ⏱ 1:40 – 2:05

`[Click the Goals lens. GoalCanvas renders — 12 goals in a DAG.]`

> These are the things the team needs to accomplish — but they're not a flat checklist. They're connected. Some things have to happen before other things can start.

`[Point to the DAG — 4 roots flowing right through gate nodes to FDA Submission.]`

> See the flow? Lock down requirements, finish risk analysis, clear biocompatibility, decide the architecture — then and only then can you start verification. Some gates need **everything** done. Some just need **one path** to clear. That's how real work actually flows.

`[Click "Risk Analysis Complete" — GoalDetailDrawer opens.]`

> Click a goal and you see what the AI needs to get done — questions to ask, data to collect, cards to visit. But here's what matters: **the user never sees this.** They just have a conversation. The AI has a destination, but the user picks the road. It's direction without feeling like you're on rails — no "step 1 of 12," no forced order. The AI weaves its questions into wherever the conversation naturally goes.

---

## ACT 5 — TESTS ⏱ 2:05 – 2:30

`[Click Test in the header bar → Tests. TestRunner opens with 5 pre-seeded scenarios.]`

> Before you ship, you test. Five fake users — one who cooperates, one who rambles, one who gives one-word answers, one who argues, one who's in a rush.

`[Click "Tangential User". Point to the behavior profile and objective.]`

> This one wanders off-topic and buries answers in stories. The test: can the AI still figure out the regulatory strategy? We pick the models, set a round limit, and tell it when to stop.

`[Click "Run Test" (or point to latest_run results).]`

> Hit run — two AIs have a full conversation. One plays the user, one plays the agent. Did the agent stay on track? Did it get the answers it needed? These oppositional tests not only check for goal completion but also hallucinations and synthentic NPS scores.


---

## ACT 6 — SHARE & CHAT ⏱ 2:30 – 3:00

`[Click Publish in the header bar → Share. Click "Create Share Link".]`

> One click — you get a link.

`[Copy and open in incognito. ShareChat loads with a welcome message.]`

> This is what your end user sees - either integrated via MCP into your agents or shared from Nords.  Just a conversation with an AI that knows everything about the project.  

`[Type: "I'm the VP of Regulatory. Walk me through our 510(k) readiness."]`

> Watch. The AI picks up the right persona. It talks about specific test results, specific risks — not generic advice. It asks smart follow-up questions, but **only when they fit naturally.**

> Remember that goal DAG? It's working right now. The AI just collected a variable. A goal just fired. But the user didn't feel a single rail. They think they're having a conversation. They are — the AI just happens to know where it's going.

> **The AI has a destination, but the user picks the road.** That's the difference.

---

## ACT 7 — CREATE A PERSONA ⏱ 3:00 – 3:30

`[Click Direct in the header bar → Personas. ManagePersonas modal opens.]`

> Every expert on this project started right here. Let's create a new one live.

`[Click "+ New Persona". New persona appears in the sidebar. Type name: "Dr. Maya Rodriguez".]`

> We name her, pick an avatar, set a color — but that's just the surface. Watch.

`[Click the avatar to open the picker. Browse a few seeds, drag the hue slider. Fill Background: "Former FDA reviewer with 12 years in medical device regulatory affairs."]`

> Background — who she is and what she's done. This isn't cosmetic. When the AI speaks through this persona, this context shapes every answer.

`[Fill Primary Motivation: "Ensure patient safety through rigorous design verification." Fill Voice & Tone: "Precise and methodical. References FDA guidance documents."]`

> Motivation drives what the AI pushes for. Voice & tone controls how it speaks. Same data, completely different delivery.

`[Scroll down. Click "Add a mental model". Name: "Risk-Benefit Analysis Framework". Body: "Weighs clinical benefit against residual risk using ISO 14971 methodology."]`

> Mental models are the secret weapon. They're thinking frameworks the AI applies before answering — not just what it says, but **how it reasons.**

`[Drag category relevance sliders — pull Mitigates up, push Informs down.]`

> And finally — relevance. How much does this expert care about each type of relationship? Drag these sliders, and the entire persona lens reshapes around her priorities.

> Each persona isn't just a name — it's a full behavioral profile. **When the AI speaks through this lens, it doesn't just see differently — it thinks differently.**

---

## ACT 8 — CREATE A TYPE ⏱ 3:30 – 3:55

`[Click Design in the header bar → Types. ManageTypes modal opens showing existing types.]`

> Types are the building blocks of your knowledge graph. Every card on the canvas is an instance of a type. Let's make a new one.

`[Click "+ New Type". Rename to "Verification Activity". Click the icon button — browse icons, pick one. Drag the hue slider to set a color.]`

> Name, icon, color — so it's instantly recognizable on the graph.

`[Fill description: "Testing or inspection activity that confirms design outputs meet requirements."]`

> The description tells the AI what this type represents. Not for humans to read — for the AI to understand.

`[Click "+ Add Property". Name: "Protocol ID", type: short_text. Add "Status" (type: select). Add "Due Date" (type: date).]`

> Properties are the schema. Every card of this type will carry these fields. Protocol ID, status, due date — structured data the AI can query, filter, and reason about.

> **Define the schema once, and every card inherits it.** That's types.

---

## ACT 9 — CREATE A CATEGORY ⏱ 3:55 – 4:25

`[Click Design in the header bar → Categories. ManageTypes modal opens on the Categories tab.]`

> Categories define **how cards connect.** Every line on the graph is an instance of a category. Let's create one.

`[Click "+ New Category". Rename to "Validates". Pick an icon and color.]`

> This category represents a verification relationship — "this test **validates** that requirement."

`[Fill description: "Formal verification that an output meets its specification." Type verb: "validates". Set direction labels — forward: "against", reverse: "by", both: "with".]`

> Every category has a verb and direction labels. "Test A **validates against** Requirement B" — or reading it the other way, "Requirement B **is validated by** Test A." The verb and prepositions make the graph readable in both directions.

`[Click "→ Forward" as the default direction. Toggle "═ Spectrum" mode.]`

> Default direction — most validations flow forward. And we've turned on spectrum mode, which gives this category an intensity axis. That means connections of this type can carry a measurement — and the board view generates columns from it automatically.

> **Categories are the relationships. Types are the nodes. Together, they define the entire knowledge graph.**

---

## CLOSING

> Nords unlocks the power of graph — visually. A better way to get expertise into AI, and a better way to get it back out. Medical devices, legal strategy, FINANCAL SERVICES, sales enablement, GAME DESIGN, engineering onboarding — WHILE ALLOWING YOU TO think visually, AND build pragmatically.
>
1. **Nords gives AI the one thing it's missing — everything that's specific to _you_. Your processes, your expertise, your way of working.**

---

## EMERGENCY FALLBACK BEATS

| Beat | Action | Line |
|---|---|---|
| **Data drag** | Drag any card. Distance changes. | "Moving cards changes the data." |
| **Board flip** | Switch dimension dropdown | "New board for every relationship. Zero setup." |
| **Expert lens** | Click persona, open drawer, drag weight slider | "Consultancy in a box — the graph reshapes around their expertise." |
| **Bias slider** | Drag any weight slider in PersonaLensDrawer | "The graph physically responds to how much this expert values that relationship." |
| **Goal DAG** | Show the goal canvas | "Real work isn't a checklist. It's a dependency web." |
| **Test Runner** | Click Test → Tests in header | "Ship when all five go green." |
| **Share link** | Click Publish → Share in header | "Expertise in one link." |
| **Create persona** | Click Direct → Personas in header | "Each persona is a full behavioral profile — not just a name." |
| **Create type** | Click Design → Types in header | "Define the schema once, every card inherits it." |
| **Create category** | Click Design → Categories in header | "Categories define how cards connect." |
