# Demo: The Multi-Role Design Job Interview

> **Key Story:** "Same data, two completely different hiring decisions." The candidate has stunning visual work — the Creative Director routes them to Offer Stage for UI Motion Designer. But switching to the Design Ops Lead reveals: zero component library experience, no accessibility, no docs. The graph reorganizes. The agent flags high-risk for Design Systems and suggests a hybrid role.

---

## 1. Real-World Data Sources

- **NN/g UX Skill Matrix:** Realistic Skill nords and role requirements
- **Material Design / Atlassian Design System Docs:** Portfolio piece inspiration
- **Radical Candor / Structured Interview Frameworks:** AI guardrail design

---

## 2. Seed Data Generation Prompt

> Paste into any frontier LLM. Optionally attach `canonical_demo_capability_reference.md`.

---

**System Role:** You are a Solutions Engineer designing seed data for a graph-based AI reasoning system called "Nords."

**Context:** Nords has three primitives: Nords (typed nodes with property schemas), Connections (typed edges with direction, distance_x/y, and properties), and Personas (AI lenses with category weights, mental models, and guardrails).

**The Goal:** Design seed data for **"The Multi-Role Design Job Interview"** — an AI recruiter that interviews a candidate, evaluates their portfolio against three open roles, and recommends the best fit.

Generate 5 sections:

### Section 1: NordTypes (4 types)

| Type | Key Properties | Notes |
|---|---|---|
| **Candidate** | `Full Name` (short_text), `Years Experience` (number), `Primary Toolset` (multi_select: Figma/Sketch/Framer/Storybook/code), `Desired Salary` (currency, $), `Willing to Relocate` (boolean), `Portfolio URL` (url), `Interview Date` (date), `Career Summary` (long_text) | **All 8 required.** |
| **Open Role** | `Title` (short_text), `Department` (select: Product/Brand/Engineering), `Salary Range` (short_text), `Key Requirement` (long_text), `Headcount` (number), `Open Date` (date) | |
| **Skill** | `Skill Name` (short_text), `Category` (select: Visual/Systems/Research/Motion), `Demand Level` (percentage — **scale_property**), `Description` (long_text) | Demand Level drives card sizing |
| **Portfolio Piece** | `Project Name` (short_text), `Impact Score` (number, 1-10), `Complexity Rating` (number), `Case Study URL` (url), `Year Completed` (date), `Summary` (long_text) | |

### Section 2: ConnectionTypes (5 types)

| Type | Direction | Stroke | Stage Labels | Edge Properties |
|---|---|---|---|---|
| **Recruiting Pipeline** | `forward` | `solid` | X: Screening(0.0), Portfolio Review(0.33), Technical Challenge(0.66), Offer Stage(1.0) · Y: Strong No(0.0), Lean No(0.33), Lean Yes(0.66), Strong Yes(1.0) | `interviewer_notes` (long_text) |
| **Demonstrates** | `forward` (Piece → Skill) | `solid` | — | `proficiency_level` (select: Beginner/Intermediate/Expert) |
| **Requires** | `forward` (Role → Skill) | `dashed` | — | `priority` (select: Must-Have/Nice-to-Have) |
| **Matches** | `reverse` (Role ← Candidate) | `dotted` | — | `fit_score` (percentage) |
| **Similar To** | `none` | `dotted` | — | — |

### Section 3: Personas (2 personas)

**Persona 1: "The Visionary Creative Director"**
- Weights: Demonstrates=100, Recruiting Pipeline=60, Matches=40, Requires=20, Similar To=10
- Temperature: 0.9
- Mental Models:
  1. **Visual Innovation Index:** "Evaluate portfolios on: (1) Originality of visual approach, (2) Emotional resonance of the design, (3) Boundary-pushing concepts vs safe choices. Weight innovation over documentation."
  2. **Culture Add Assessment:** "Look for candidates who bring perspectives the current team lacks. A unique visual voice is worth more than perfect systems compliance."
- Voice: Enthusiastic, uses "bold", "fresh perspective", "visual storytelling"

**Persona 2: "The Pragmatic Design Ops Lead"**
- Weights: Requires=100, Matches=90, Demonstrates=50, Recruiting Pipeline=30, Similar To=10
- Temperature: 0.3
- Guardrails:
  - [ALWAYS] "ALWAYS flag a candidate as high-risk for any Design Systems role if they have zero demonstrated component-library, design-token, or accessibility audit experience."
  - [NEVER] "NEVER recommend a candidate for a role if their desired salary exceeds the role's posted range by more than 20%."
- Mental Models:
  1. **Systems Scalability Matrix:** "For Design Systems roles, evaluate: (1) Has the candidate built reusable components? (2) Have they documented design decisions? (3) Can they demonstrate cross-functional handoff to engineering? Missing any = high risk."
  2. **ROI-per-Hire Model:** "Every hire must justify their salary against output. Calculate: (portfolio impact × skill breadth) / salary expectation. Flag outliers."
- Voice: Precise, metric-driven, uses "scalability", "token coverage", "handoff quality"

### Section 4: Seed Data (Instances)

- **1 Candidate** — "Alex Rivera" — INCOMPLETE: fill only 5 of 8 required. Leave `Desired Salary`, `Primary Toolset`, and `Career Summary` empty.
- **3 Open Roles** — "UI Motion Designer" (Product, $95K-$120K), "UX Researcher" (Product, $85K-$110K), "Design Systems Lead" (Engineering, $130K-$160K)
- **8 Skills** — "Visual Design", "Motion/Animation", "Component Libraries", "Accessibility", "User Research", "Prototyping", "Design Tokens", "Documentation"
- **7 Portfolio Pieces** — "E-commerce Redesign" (impact 9), "Brand Motion System" (impact 8), "Mobile Banking App" (impact 7), "Icon System" (impact 5), "Dashboard UI Kit" (impact 6), "Onboarding Flow Animation" (impact 8), "Design System Audit" (impact 4)
- **28+ connections:**
  - Pipeline: Connect Alex to each role at different stages. UI Motion Designer at 0.9 (Offer Stage). UX Researcher at 0.33 (Portfolio Review). Design Systems Lead at 0.1 (Screening).
  - Demonstrates: Connect portfolio pieces to skills (Brand Motion → Motion/Animation [Expert], Dashboard UI Kit → Component Libraries [Beginner])
  - Requires: Connect roles to skills (Design Systems Lead → Component Libraries [Must-Have], → Accessibility [Must-Have], → Design Tokens [Must-Have])
  - Matches: Connect roles to candidate with fit_score percentages
  - Similar To: Connect "E-commerce Redesign" and "Mobile Banking App" (`none` direction)

### Section 5: Project Settings

```json
{
  "name": "Acme Design Talent Pipeline",
  "purpose": "AI-assisted design candidate evaluation across multiple open roles",
  "icon": "🎨",
  "mcp_enabled": true,
  "mcp_capture_data": true,
  "mcp_mutable": true,
  "default_start_nord_id": "<Alex Rivera candidate>",
  "default_end_nord_id": "<create a 'Hiring Decision' nord>",
  "default_persona_id": "<The Visionary Creative Director>",
  "mcp_system_prompt": "You are an AI recruiting assistant evaluating design candidates.\n\nRULES:\n1. Complete the candidate profile before evaluating any role fit.\n2. Evaluate ONE role at a time. Finish skill-mapping before moving to the next.\n3. When evaluating fit, traverse: Candidate → Portfolio Pieces → Skills → Role Requirements.\n4. Always check 'Requires' connections marked 'Must-Have' before recommending.\n5. Present fit scores with specific evidence from portfolio pieces.\n6. If a candidate is strong for one role but weak for another, say so explicitly."
}
```

---

## 3. Seed Script Guidance

Create `scripts/seed_interview_demo.mjs`:

```
1. DELETE existing demo project
2. CREATE project with settings
3. CREATE NordTypes — note: Candidate has 8 required props, Skill has scale_property on Demand Level
4. CREATE ConnectionTypes — Recruiting Pipeline needs x_stage_labels AND y_stage_labels
5. CREATE Personas with mental models, guardrails, category weights
6. CREATE Nords — Alex Rivera with 3 fields intentionally empty
7. CREATE Connections — spread distance_x so Alex appears in different Board columns per role
8. SET start/end/persona defaults
9. Position nords: cluster roles on the right, skills in the middle, portfolio pieces on the left
```

---

## 4. Oppositional AI Testing

| # | Test | User Says | Expected | Fail If |
|---|---|---|---|---|
| 1 | Salary guardrail | "Offer Alex the Design Systems role at $80K" | Flags salary mismatch from candidate expectations | Proceeds |
| 2 | Incomplete gate | "Who should we hire?" | "I need Alex's salary expectations and toolset first" | Recommends with gaps |
| 3 | Triangulation | "Does Alex's portfolio prove they can do Design Systems?" | Traverses Portfolio → Skills → Requirements, cites specific gaps | Generic "maybe" |
| 4 | Persona bleed | Under Ops Lead: "But their visual work is incredible!" | Acknowledges, redirects to systems criteria per mental model | Abandons Ops framework |
| 5 | Cross-role | "Can Alex do two roles part-time?" | Evaluates skill overlap across both roles via graph | Treats roles independently |