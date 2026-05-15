# Nords — Canonical Demo Playbook

> **Purpose:** The definitive reference for every demo we run. Each demo exercises the *full* capability surface of Nords — every view mode, every entity type, every setting, every persona feature — so no capability is left undemonstrated across the suite.

---

## How to Use This Document

Each demo is self-contained. Pick the one that matches your audience. Every demo follows:

1. **Audience & Pitch** — Who and the one-liner
2. **Feature Coverage** — Which platform capabilities this demo exercises
3. **Schema Design** — NordTypes, ConnectionTypes, PropertySchemas
4. **Persona Orchestra** — Full persona definitions with mental models and category weights
5. **Seed Data Spec** — The "in media res" starting state
6. **The Happy Path** — Timed walkthrough with scripted beats
7. **Wonderful Tangents** — Planned "what if" detours that feel organic

---

## Master Feature Coverage Matrix

Every capability must be covered by **at least one** demo. Bold = primary showcase.

| Capability | Demo 1: Proposal Director | Demo 2: Product Launch | Demo 3: Research Graph |
|---|---|---|---|
| **Graph View** | ✅ Opening shot | ✅ Dependency web | **✅ Primary mode** |
| **Board View** | **✅ 7-stage pipeline** | **✅ Launch readiness** | ✅ Literature status |
| **Spectrum View** | **✅ Skill Match slider** | ✅ Risk spectrum | **✅ Confidence axis** |
| NordTypes (3+) | ✅ 7 types | ✅ 6 types | ✅ 5 types |
| ConnectionTypes (3+) | ✅ 7 types | ✅ 5 types | ✅ 4 types |
| Stage Labels | **✅ 7-stage lifecycle** | ✅ 4-stage readiness | ✅ 3-stage review |
| Props: short_text | ✅ Client Name | ✅ Channel | ✅ Author |
| Props: long_text | ✅ Scope Summary | ✅ Brief | **✅ Abstract** |
| Props: number | ✅ Est. Hours | ✅ Budget | ✅ Citation Count |
| Props: currency | **✅ Rates & pricing** | ✅ Media spend | — |
| Props: percentage | **✅ Util, Margin** | ✅ Completion % | ✅ Confidence |
| Props: select | ✅ Go/No-Go | ✅ Priority | ✅ Methodology |
| Props: multi_select | ✅ Skills | ✅ Platforms | **✅ Tags** |
| Props: boolean | ✅ Margin Validated | ✅ Approved | ✅ Peer Reviewed |
| Props: date | ✅ Deadline | **✅ Launch Date** | ✅ Published |
| Props: url | — | ✅ Asset URL | **✅ DOI Link** |
| `required` + Completeness | **✅ RFP 8/12 bar** | ✅ Checklist items | ✅ Paper metadata |
| `scale_property` | **✅ Win Probability** | ✅ Impact Score | ✅ Citation Count |
| Persona switching | **✅ 4 personas** | ✅ 3 personas | ✅ 3 personas |
| Mental Models | **✅ Full 5-per** | ✅ 3 per | ✅ 3 per |
| Category Weights | **✅ Persona Pivot** | ✅ Lens shift | ✅ Focus shift |
| Guardrails | **✅ Margin guard** | ✅ Launch guard | ✅ Rigor guard |
| Temperature variation | **✅ 0.4–0.9** | ✅ 0.5–1.0 | ✅ 0.3–0.8 |
| Project Settings: MCP flags | **✅ All three** | ✅ Enabled+capture | ✅ Read-only |
| Project Settings: prompt | **✅ Gate enforce** | ✅ Launch protocol | ✅ Literature nav |
| Project Settings: Start/End Nord | **✅ Start=Opp** | ✅ Start=Campaign | ✅ Start=Thesis |
| MCP Session lifecycle | **✅ Full session** | ✅ Session capture | ✅ Read-only |
| MCP Tools: read tier | **✅ dict/horizon** | ✅ dict/horizon | ✅ dict/horizon |
| MCP Tools: session tier | **✅ traverse/visit** | ✅ navigate | ✅ explore |
| MCP Tools: mutable tier | **✅ create/update** | ✅ capture mode | — |
| Connections: all directions | **✅ fwd/rev/both/none** | ✅ fwd+both | ✅ none+fwd |
| Connections: stroke styles | **✅ solid/dashed/dotted** | ✅ solid/dashed | ✅ solid/dotted |
| Detail Drawer | **✅ Property editing** | ✅ Editing | ✅ Editing |
| Radial Menu | ✅ Quick-connect | ✅ Quick-connect | ✅ Quick-connect |
| Comments | ✅ Review feedback | **✅ Stakeholder** | ✅ Annotations |
| Snapshots | ✅ Before/after | **✅ Pre-launch** | ✅ Version capture |
| Access Tokens | **✅ External MCP** | — | ✅ API integration |
| Dev Mode | **✅ Prompt inspect** | ✅ Token usage | — |
| Model Switching | ✅ Flash/Pro | **✅ Compare** | ✅ Cost-aware |
| Preview Chat | **✅ Full conversation** | ✅ Quick query | ✅ Q&A |
| GlobalDock persona | **✅ Animated switch** | ✅ Switch | ✅ Switch |
| Board drag-and-drop | **✅ Stage advance** | ✅ Status change | ✅ Review status |

---

## Demo 1: Proposal Director (Flagship)

### Audience & Pitch
**For:** Agency leaders, consultants, operations teams
**One-liner:** *"Watch an AI guide a $300K proposal from inbox to submission — with financial guardrails it can't bypass."*

### Schema (7 NordTypes, 7 ConnectionTypes)

**NordTypes:**

| Type | Icon | Color | Key Required Properties | Scale By |
|---|---|---|---|---|
| Opportunity | `FileText` | `#f59e0b` | Client Name, Industry, Budget Range, Go/No-Go, Scope Summary | Win Probability |
| Team Member | `User` | `#3b82f6` | Role, Seniority, Skills, Hourly Rate, Utilization, Capacity | Utilization |
| External Resource | `UserPlus` | `#8b5cf6` | Role Needed, Skills Needed, Est. Rate, Capacity | — |
| Solution Phase | `Layers` | `#10b981` | Phase Type, Estimated Hours, Duration Weeks | Est. Hours |
| Resource Allocation | `PieChart` | `#0ea5e9` | Allocated Hours, Effective Rate | — |
| Review Gate | `ShieldCheck` | `#ef4444` | Review Type, Status, Margin Validated | — |
| Proposal Document | `FileCheck` | `#6366f1` | Format, Total Price, Target Margin, Exec Summary | — |

**ConnectionTypes:**

| Type | Verb | Color | Style | Stages | Direction |
|---|---|---|---|---|---|
| Proposal Stage | "is at" | `#6366f1` | solid | Triage→Strategy→Design→Pink→Red→Gold→Kickoff | forward |
| Assigned To | "assigned to" | `#3b82f6` | solid | — | forward |
| Scopes Into | "scopes into" | `#8b5cf6` | solid | — | forward |
| Allocates | "allocates" | `#10b981` | dashed | — | forward |
| Blocks | "blocks" | `#ef4444` | dashed | — | forward |
| Reviews | "reviews" | `#f59e0b` | dotted | — | both |
| Skill Match | "matches" | `#06b6d4` | dotted | Weak→Partial→Exact→Overqualified | none |

### Personas (4)

**Proposal Director** — temp 0.7, `#f59e0b`
- Background: 15yr managing $1M+ proposals | Motivation: Win accurately | Voice: Structured, decisive
- Guardrails: ALWAYS verify margin. NEVER accept TBD.
- Weights: Proposal Stage +100, Blocks +90, Reviews +60
- Models: Go/No-Go Rubric, Triangulation, Gate Discipline, Win Themes, Proposal-as-Product

**Resource Strategist** — temp 0.4, `#10b981`
- Background: Consultant → resource mgr | Motivation: Right people, right rates | Voice: Analytical
- Guardrails: NEVER overbook past 90%
- Weights: Assigned To +100, Skill Match +90, Allocates +80, Proposal Stage +20
- Models: 80% Rule, T-Shape, Blended Rate Trap, Availability Windows, Bench Investment

**QA Reviewer** — temp 0.5, `#ef4444`
- Background: Independent evaluator | Motivation: Find every weakness | Voice: Skeptical
- Guardrails: ALWAYS scrutinize pricing
- Weights: Reviews +100, Blocks +80, Proposal Stage +50
- Models: Compliance Matrix, Math Audit, Devil's Advocate, Edge Cases, Client Rubric

**Proposal Writer** — temp 0.9, `#8b5cf6`
- Background: 200+ wins | Motivation: Irresistible proposals | Voice: Persuasive
- Guardrails: ALWAYS lead with client benefit
- Weights: Scopes Into +90, Proposal Stage +70, Reviews +40
- Models: Inverted Pyramid, Proof Sandwich, Active Voice, Narrative Arc, Readability Audit

### Project Settings
- **Icon:** 📋 | **MCP:** enabled + capture + mutable
- **Default Persona:** Proposal Director | **Start Nord:** Opportunity | **End Nord:** Proposal Doc
- **System Prompt:** Full gate enforcement per [system_prompt_v2.md](file:///Users/danielcrowder/Desktop/Projects/nords/demo/system_prompt_v2.md)

### Seed State: "In Media Res"
The project opens mid-crisis. A $300K proposal is stuck at Design Lock.

- 1 Opportunity (85% win prob, Go, at Design = 0.33)
- 1 RFP Details (8/12 filled → 67% progress bar)
- 4 Team Members (Alex 110% util ⚠️, Sarah 60%, Priya 40%, Maya 55%)
- 3 Solution Phases (Discovery done, Architecture blocked, QA not started)
- 1 Resource Allocation (Alex → Architecture, overbooked)
- 1 Review Gate (Pink — Failed: staffing bottleneck)
- 1 Proposal Document (shell, no pricing)
- 15+ Connections with mixed types, styles, directions

### Happy Path (10 min)

| Min | View | Action | Talk Track | Features |
|---|---|---|---|---|
| 0:00 | Board | Open 7-stage pipeline | *"Most tools give you cards in columns. Table stakes."* | Board, stages, distance_x |
| 0:30 | Board | Point out RFP progress bar (8/12) | *"Platform knows this is 67% complete. 4 required fields empty."* | Completeness, required |
| 1:00 | Graph | Toggle Graph. Alex is massive (110% util). | *"Scaled by utilization. He's literally bloated on the canvas."* | Graph, scale_property |
| 1:30 | Graph | Point out red dashed Blocks line | *"That's a structural blocker. AI can't advance past it."* | stroke_style, direction |
| 2:00 | Drawer | Click Alex → show properties | *"Every person is typed with structured, queryable data."* | Drawer, property types |
| 2:30 | Dock | **WOW 1:** Switch to Resource Strategist | *"Watch the AI change what it looks at."* | Persona pivot, weights |
| 3:00 | Graph | Graph re-weights around staffing | *"Assigned To and Skill Match now dominate. People pull to center."* | Category weight animation |
| 3:30 | Spectrum | Skill Match spectrum view | *"Sarah=1.0 exact. Priya=0.33 adjacent. It's a gradient, not binary."* | Spectrum, continuous |
| 4:00 | Chat | "Who can replace Alex?" | *"Agent has full graph context. Calculates capacity live."* | Preview Chat, MCP |
| 5:00 | Chat | Agent recommends Sarah + math | *"$200/hr × 40h = $8K. She's at 60% — plenty of room."* | Financial calc |
| 5:30 | DevMode | Toggle Dev Mode | *"Inspect the system prompt, weights, tokens."* | Dev Mode |
| 6:00 | Drawer | Create Resource Allocation for Sarah | *"Watch completeness bar fill as we add required fields."* | Nord creation |
| 6:30 | Graph | **WOW 2:** Switch to QA Reviewer | *"Now the skeptic's lens. Reviews and Blocks dominate."* | Persona pivot #2 |
| 7:00 | Chat | "Run Pink Gate check" | *"Agent runs gate logic against the graph."* | MCP traverse |
| 7:30 | Chat | Agent lists remaining gaps | *"Found 2 missing RFP fields and a phase without deliverables."* | Completeness |
| 8:00 | Board | **WOW 3:** Drag Opportunity → Pink Review | *"Blocker resolved. Card slides to next stage."* | Board D&D |
| 8:30 | Settings | Show Project Settings panel | *"MCP flags, system prompt, start/end nord — all configurable."* | Settings |
| 9:00 | Graph | Final zoomed-out shot | *"Stuck to advancing in 9 minutes. Every decision in the graph."* | Visual summary |

### Wonderful Tangents

**A: "What about the money?"** → Open Proposal Doc → change a rate → margin recalculates → agent warns if below target. *Features: currency, percentage, computed, guardrails.*

**B: "Can the AI write it?"** → Switch to Writer (temp 0.9) → draft Executive Summary → compare Flash vs Pro output. *Features: temperature, model switching, long_text.*

**C: "How do you audit this?"** → Show session history, traversals, snapshots, access tokens. *Features: MCP session, snapshots, tokens.*

**D: "What if review fails?"** → Show Failed gate with Findings → agent creates new gate (attempt #2) → old gate stays as history. *Features: rework loops, nord-as-event.*

---

## Demo 2: Product Launch Command Center

### Audience & Pitch
**For:** Product managers, marketing leaders, startup teams
**One-liner:** *"Coordinate a multi-channel launch where the AI knows which team is blocked and why."*

### Schema (6 NordTypes, 5 ConnectionTypes)

**NordTypes:** Campaign (`Megaphone`, `#f59e0b`), Deliverable (`Package`, `#10b981`), Risk (`AlertTriangle`, `#ef4444`, scale: Impact Score), Stakeholder (`Users`, `#3b82f6`), Milestone (`Flag`, `#8b5cf6`), Asset (`Image`, `#06b6d4`)

**ConnectionTypes:** Launch Readiness (solid, 4 stages: Planning→In Progress→Review→Go/No-Go), Depends On (dashed), Owns (solid), Approves (dotted), Risk Exposure (dotted, stages: Low→Med→High→Critical)

### Personas (3)
- **Campaign Lead** (0.7) — Readiness +100, Depends On +80
- **Risk Analyst** (0.5) — Risk Exposure +100, Depends On +90
- **Creative Director** (1.0) — Owns +80, Approves +70

### Happy Path (8 min)

| Min | View | Action | Key Feature |
|---|---|---|---|
| 0:00 | Board | 4-column readiness board | Board, stages |
| 1:00 | Graph | Dependency web — blog blocks PR blocks launch | Graph, dashed edges |
| 2:00 | Spectrum | Risk Exposure — two risks in Critical zone | Spectrum |
| 3:00 | Persona | Switch to Risk Analyst → graph reweights | Persona pivot |
| 4:00 | Chat | "What's blocking our launch date?" | MCP read |
| 5:00 | Drawer | Fill missing required fields → bar fills | Completeness |
| 6:00 | Board | Drag deliverable Review → Go/No-Go | Board D&D |
| 7:00 | Snapshot | Pre-launch snapshot | Snapshots |
| 7:30 | Comments | Stakeholder comment on Campaign | Comments |

### Tangents
**A:** Change Launch Date → agent recalculates milestones (date props, MCP update)
**B:** Switch to Creative Director → Assets pull to center, risks fade (persona filtering)

---

## Demo 3: Research Knowledge Graph

### Audience & Pitch
**For:** Academics, R&D, analysts, knowledge workers
**One-liner:** *"A living literature review where the AI navigates citations, surfaces contradictions, and tracks your confidence."*

### Schema (5 NordTypes, 4 ConnectionTypes)

**NordTypes:** Paper (`BookOpen`, `#3b82f6`, scale: Citation Count), Finding (`Lightbulb`, `#f59e0b`, scale: Confidence), Question (`HelpCircle`, `#8b5cf6`), Thesis (`Target`, `#10b981`), Dataset (`Database`, `#06b6d4`)

**ConnectionTypes:** Review Status (solid, 3 stages: Unread→Skimmed→Deep Read), Cites (solid), Supports/Contradicts (dotted, stages: Contradicts→Neutral→Supports), Answers (dashed)

### Personas (3)
- **Principal Investigator** (0.3) — Review Status +90, Answers +80. ALWAYS cite sources.
- **Literature Scout** (0.8) — Cites +100, Review Status +60. ALWAYS prioritize recent.
- **Devil's Advocate** (0.6) — Supports/Contradicts +100, Answers +70. ALWAYS challenge consensus.

### Happy Path (7 min)

| Min | View | Action | Key Feature |
|---|---|---|---|
| 0:00 | Graph | Citation network — papers scaled by citations | Graph, scale_property |
| 1:00 | Spectrum | Supports/Contradicts axis | Spectrum |
| 2:00 | Board | Unread→Skimmed→Deep Read columns | Board |
| 3:00 | Chat | PI: "Strongest evidence for my thesis?" | MCP read-only |
| 4:00 | Persona | Switch to Devil's Advocate | Persona pivot |
| 5:00 | Chat | Agent highlights contradictions | Weight-driven attention |
| 6:00 | Drawer | Edit Confidence 60→85% → node grows | scale_property live |
| 6:30 | Board | Drag Paper Skimmed → Deep Read | Board D&D |

### Tangents
**A:** "Find gaps" → agent finds orphan Questions with no Findings (graph traversal)
**B:** Switch to Devil's Advocate → cluster contradictions by Methodology (multi_select)

---

## Demo Selection Guide

| Audience | Demo | Duration | Wow Moments |
|---|---|---|---|
| Enterprise / Agency | Proposal Director | 10 min | Financial guardrails + gate enforcement |
| Product / Startup | Product Launch | 8 min | Dependency tracking + risk spectrum |
| Academic / R&D | Research Graph | 7 min | Citation nav + confidence tracking |
| Technical (devs) | Proposal + Tangent C | 12 min | MCP tools + Dev Mode + Access Tokens |
| Executive (quick) | Any, skip tangents | 5 min | Pick 2 wow moments from any demo |

---

## Pre-Demo Checklist

- [ ] Run seed script (`node scripts/seed_<demo>.mjs`)
- [ ] Verify Board shows cards in multiple columns
- [ ] Verify Graph shows crisis/dependency state
- [ ] Verify ≥1 Nord has incomplete progress bar
- [ ] Verify persona switching animates graph
- [ ] Verify Preview Chat responds (API key configured)
- [ ] Dark mode enabled (more striking)
- [ ] Browser at 90% zoom (more canvas)
- [ ] Close other tabs (performance)
- [ ] Test one Board drag-and-drop

## Seed Script Requirements

Each demo needs a dedicated script in `scripts/`. Requirements:

1. **Deterministic dates** — relative to `Date.now()`
2. **Deliberate conflicts** — the "crisis" driving the narrative
3. **Rich text** — real domain language, not lorem ipsum
4. **Mixed completeness** — some complete, some 60-80%, some barely started
5. **Varied distance_x** — cards across all columns
6. **Spread positions** — `position_x/y` from -3 to +3
7. **Scale variation** — 0.4 to 1.5
8. **≥1 Blocks connection** — visual crisis indicator
9. **MCP session with visits** — pre-populated audit trail
10. **Weights on all personas** — every pivot animates differently

### Status
- ✅ `seed_proposal_demo.mjs` — Demo 1
- 🔲 `seed_launch_demo.mjs` — Demo 2
- 🔲 `seed_research_demo.mjs` — Demo 3
