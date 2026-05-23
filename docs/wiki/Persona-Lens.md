# Persona Lens

> A role-filtered heatmap view that reshapes the entire graph around what matters most to a given stakeholder — one workspace, every perspective.

---

## Overview

The Persona Lens answers the question: *"What matters most to someone in this role?"*

It renders the graph as a **radial heatmap** centered on the active persona. Nords orbit at distances determined by relevance — connection types that a persona cares about pull their connected nords closer to the center, while low-priority types push nords to the edges.

The result is a view where an engineering lead and a product owner can look at the same project and each instantly see what's most relevant to them — without needing separate dashboards, custom filters, or duplicated workspaces.

Personas also drive AI behavior: when an AI agent adopts a persona, it inherits the priorities *and* the communication style, making it a true role-aware collaborator.

---

## The Problem

- **Different roles need different views — but share one tool.** An engineering lead cares about blockers and technical debt. A product owner cares about business value and customer impact. In most tools, they either see the same undifferentiated view, or someone builds and maintains separate dashboards that drift out of sync with the real data.
- **Information gets filtered through hierarchy instead of being directly queryable.** In practice, what a stakeholder sees is shaped by who briefed them, not by the underlying data. A VP gets a summary written by a manager, who got a summary from a team lead. Each layer compresses, edits, and biases the signal. The raw project reality is inaccessible to anyone not working at the lowest level.
- **AI has no concept of "who's asking."** When an AI assistant answers a question about a project, it treats every question the same regardless of the asker's role. It doesn't know that an engineering lead wants technical depth while an executive wants strategic implications. Every response is a one-size-fits-none compromise.

---

## User Stories

- **As an engineering lead,** I want to activate my persona and see blockers, technical debt, and status items surface to the center while marketing items recede to the edges.
- **As a product owner,** I want to switch to my persona and instantly see business-value items and customer-facing features pulled to the foreground.
- **As a stakeholder in a meeting,** I want to toggle between personas to quickly show different teams what's most relevant to their concerns — without rebuilding filters.
- **As an AI user,** I want the AI to adopt different personas so it prioritizes different information and communicates in the appropriate voice for each role.
- **As a project admin,** I want to define personas for the key roles on my team so everyone has a tailored view without separate workspace configuration.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Persona profiles** | Each persona has a name, role, background story, motivation, and communication voice — making it useful both as a view filter and as an AI character definition. |
| **Mental models (focus areas)** | Each persona defines up to **5 focus areas** — concise statements of what this role cares about most. These shape the AI's attention and are surfaced in the Horizon computation. |
| **Category weights** | Per-connection-type weights (−100 to +100) control how prominently each relationship type surfaces its nords. Positive weights pull nords closer; negative weights push them away. |
| **Goal weights** | Per-goal weights let personas prioritize which [[Goals]] matter most to their role. These weights influence the AI's planning queue and how prominently goal status appears in the Horizon. |
| **Radial heatmap layout** | Nords with high-weight connections orbit close to the center; low-weight connections place nords at the periphery. The visual density communicates priority at a glance. |
| **Instant switching** | Toggle between personas with a single click. The entire graph re-renders to reflect the new role's priorities. |
| **AI persona adoption** | When an AI agent switches persona, it inherits the weights *and* the voice/motivation — shaping both what it prioritizes and how it communicates. |
| **Shared workspace** | All personas operate on the same underlying graph. No data duplication, no sync issues, no per-role workspaces to maintain. |

---

## Key Interactions

### Creating a Persona
1. Navigate to **Project Settings → Personas**
2. Click "New Persona"
3. Fill in the profile: Name, Role, Background, Motivation, Voice
4. Define up to **5 mental models** (focus areas) — concise statements of what this role prioritizes
5. Set **category weights** for each Connection Type:
   - `+100` = highest priority (pulls connected nords to center)
   - `0` = neutral
   - `−100` = lowest priority (pushes connected nords to edge)
6. Optionally set **goal weights** for each project goal — how much this persona cares about each objective
7. Save — the persona is now available in the Persona Lens and for AI sessions

### Activating a Persona
1. Open the **Persona selector** in the toolbar
2. Click a persona name or avatar
3. The graph re-renders as a radial heatmap centered on that persona's priorities
4. If an AI session is active, the agent's Horizon recomputes with the new weights

### Reading the Heatmap
| Zone | Meaning |
|------|---------| 
| **Center ring** | Highest-priority nords — connection types with large positive weights |
| **Middle ring** | Moderate-priority nords — neutral or low-weight connections |
| **Outer ring** | Low-priority nords — connection types with negative weights |

---

## AI Temperature & Guardrails

Personas don't just filter the view — they shape how the AI behaves:

| Persona Setting | Effect on AI |
|-----------------|-------------|
| **Voice** | Injected into the system prompt. Controls communication style (e.g., "direct and technical" vs. "strategic and high-level"). |
| **Motivation** | Provides the AI with a goal orientation — what this persona is trying to achieve, which shapes how it interprets ambiguity. |
| **Mental models** | The AI focuses its attention on these areas. Up to 5 focus areas keep the AI's reasoning bounded and role-relevant. |
| **Category weights** | Reshape the Horizon — high-weight connection types surface their nords more prominently, biasing the AI's traversal path. |
| **Goal weights** | Prioritize which [[Goals]] the AI works toward. A Sales persona might weight "Qualify Lead" at 100 while an Engineering persona weights "Resolve Technical Debt" at 100. |

The combination of bounded focus areas (max 5), weighted connection types, and weighted goals creates **natural guardrails** — the AI operates freely within a well-defined perceptual field rather than being constrained by rigid rules.

---

## Technical Notes

- Weights are stored per-persona, per-connection-type in the project configuration.
- Goal weights are stored per-persona, per-goal — independent of category weights.
- Relevance score per nord = weighted sum of all its connections' category weights for the active persona.
- The radial layout is computed client-side for instant responsiveness.
- Persona voice, motivation, and mental models are injected into the AI system prompt when the persona is active.
- Switching persona triggers a full Horizon recomputation on the server for any active [[MCP Integration]] session.
- Mental models are capped at 5 per persona to prevent attention dilution — both for human readability and AI focus.
