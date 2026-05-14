# Proposal Director — Critique & Redesign Plan

> **Goal:** Transform the Proposal Director from a vague system prompt into a fully realized Nords demo that showcases the platform's graph engine, completeness gating, team composition, scheduling, and financial modeling capabilities.

---

## Part 1: Critique of the Current Prompt

### What's Good
- ✅ Correct use of `distance_x` for stage progression
- ✅ Understands the completeness gating concept
- ✅ Covers the full 6-step lifecycle
- ✅ Handles external resource gaps

### 9 Critical Gaps

| # | Gap | Why It Matters |
|---|-----|----------------|
| **1** | **No actual NordType schemas defined** | The prompt says "Opportunity Nord" but never specifies which properties are `required: true`, their types, or their options. An MCP agent cannot execute this. |
| **2** | **Team composition is hand-waved** | "Query the graph for Team Member Nords" — but there's no schema for skills, utilization %, availability windows, billing rates, or seniority. This is the *hardest* part of proposal work and it's treated as a footnote. |
| **3** | **No scheduling model** | The proposal lifecycle document talks about "time and resourcing" extensively, but the prompt has zero math. No sprint modeling, no capacity calculation, no timeline feasibility check. |
| **4** | **Financial model is vague** | "Multiply Estimated Hours by Blended Rates" — but blended rate is never defined. Is it per-role? Per-person? What about overhead, margin targets, discount tiers? |
| **5** | **No ConnectionType definitions** | The prompt mentions "Proposal Stage" but never defines its `x_stage_labels`, nor any of the other critical relationship types (Assigned To, Depends On, Scopes Into, etc.). |
| **6** | **Single monolithic persona** | The "Proposal Director" does everything — triage, strategy, pricing, review. Real agencies have distinct roles with different priorities. This wastes the persona system entirely. |
| **7** | **No seed data specification** | You can't demo this without pre-loaded team members, rate cards, and at least one sample RFP. The prompt assumes everything is created from scratch every time. |
| **8** | **No constraint propagation** | If a team member is 80% utilized and you assign them to a new proposal, nothing checks whether the timeline is feasible. The graph should enforce this. |
| **9** | **Stage gates are too weak** | "Do not advance until complete" — but *what specific Nords* must be complete? The gates need to name exact NordTypes and connection patterns, not just say "the current stage." |

---

## Part 2: The Redesigned System

### 2.1 NordType Schemas (8 Types)

Each schema below specifies every property, its type, whether it's required, and what it gates.

---

#### 📋 NordType: **Opportunity**
*The RFP itself — the root node of every proposal graph.*

| Property | Type | Required | Options / Config | Purpose |
|----------|------|----------|-----------------|---------|
| Client Name | `short_text` | ✅ | — | Who issued the RFP |
| Industry | `select` | ✅ | Healthcare, FinTech, Government, Education, Retail, SaaS, Non-Profit, Other | Drives rate card selection and compliance requirements |
| Budget Range | `select` | ✅ | <$50K, $50K–$150K, $150K–$500K, $500K–$1M, >$1M | High-level financial viability filter |
| Stated Budget | `currency` | ❌ | config: `{ "symbol": "$" }` | Exact number if provided in RFP |
| Submission Deadline | `date` | ✅ | — | Hard constraint on proposal timeline |
| Project Duration | `select` | ✅ | 1–3 months, 3–6 months, 6–12 months, 12+ months | Drives resource allocation model |
| Tech Stack Required | `multi_select` | ✅ | React, Node.js, Python, AWS, GCP, Azure, iOS, Android, ML/AI, Blockchain, Salesforce, WordPress | Skill matching against team |
| Scope Summary | `long_text` | ✅ | — | Parsed from the RFP document |
| Go/No-Go Decision | `select` | ✅ | Pending, Go, No-Go | **Gate:** Must be "Go" to advance past Triage |
| Decision Rationale | `long_text` | ❌ | — | Why we're pursuing or declining |
| Win Probability | `percentage` | ❌ | — | Estimated likelihood (drives prioritization) |
| RFP Document | `file` | ❌ | — | Original uploaded document |
| Evaluation Criteria | `long_text` | ❌ | — | How the client will score proposals |

**Scale property:** `Win Probability` — larger cards = higher-confidence opportunities

---

#### 👤 NordType: **Team Member**
*A person on the agency roster. Pre-loaded, not created per-proposal.*

| Property | Type | Required | Options / Config | Purpose |
|----------|------|----------|-----------------|---------|
| Role | `select` | ✅ | Engineering Lead, Senior Developer, Mid Developer, Junior Developer, UX Researcher, UX/UI Designer, Product Manager, Brand Strategist, Creative Director, Solutions Architect, DevOps Engineer, QA Engineer, Project Manager, Copywriter | Primary discipline |
| Seniority | `select` | ✅ | Principal, Senior, Mid, Junior | Drives rate multiplier |
| Skills | `multi_select` | ✅ | React, Node.js, Python, AWS, GCP, Figma, Webflow, iOS, Android, ML/AI, Salesforce, UX Research, Brand Strategy, Content Strategy | Matched against Opportunity's Tech Stack |
| Hourly Rate | `currency` | ✅ | config: `{ "symbol": "$" }` | Base billing rate |
| Current Utilization | `percentage` | ✅ | — | How much of their capacity is currently committed (0–100) |
| Available From | `date` | ✅ | — | Earliest date they can start new work |
| Weekly Capacity | `number` | ✅ | — | Max billable hours per week (typically 32–40) |
| Email | `short_text` | ❌ | — | Contact info |
| Bio | `long_text` | ❌ | — | Used in proposal "Our Team" section |

**Scale property:** `Current Utilization` — bigger cards = more utilized (visual capacity heatmap)

---

#### 👥 NordType: **External Resource**
*A contractor, freelancer, or partner needed to fill a skill gap.*

| Property | Type | Required | Options / Config | Purpose |
|----------|------|----------|-----------------|---------|
| Role Needed | `select` | ✅ | *(same options as Team Member Role)* | What role this fills |
| Skills Needed | `multi_select` | ✅ | *(same options as Team Member Skills)* | Required competencies |
| Estimated Rate | `currency` | ✅ | config: `{ "symbol": "$" }` | Placeholder rate until vendor confirmed |
| Source | `select` | ✅ | Freelancer, Partner Agency, Subcontractor, TBD | How this resource will be procured |
| Confirmed | `boolean` | ❌ | — | Whether a specific person/vendor is locked in |
| Vendor Name | `short_text` | ❌ | — | Filled once sourced |
| Weekly Capacity | `number` | ✅ | — | Expected hours/week available |

---

#### 🏗️ NordType: **Solution Phase**
*A major workstream in the proposal (e.g., "Architecture Design", "Brand Identity", "MVP Sprint 1").*

| Property | Type | Required | Options / Config | Purpose |
|----------|------|----------|-----------------|---------|
| Phase Type | `select` | ✅ | Discovery, Architecture, Design, Development, Testing, Launch, Maintenance | Category of work |
| Estimated Hours | `number` | ✅ | — | Total hours for this phase |
| Start Week | `number` | ✅ | — | Week number in the project timeline (1-based) |
| Duration Weeks | `number` | ✅ | — | How many weeks this phase spans |
| Calculated Cost | `currency` | ❌ | config: `{ "symbol": "$" }` | **Computed:** Sum of (assigned resource rate × allocated hours) |
| Deliverables | `long_text` | ✅ | — | What the client receives at the end of this phase |
| Assumptions | `long_text` | ❌ | — | Key assumptions that could change scope |
| Risk Level | `select` | ❌ | Low, Medium, High | Flags phases needing contingency |
| Confidence | `percentage` | ❌ | — | How confident we are in the estimate |

---

#### 📊 NordType: **Resource Allocation**
*The bridge between a person and a phase — captures exactly how many hours a specific resource contributes to a specific phase.*

| Property | Type | Required | Options / Config | Purpose |
|----------|------|----------|-----------------|---------|
| Allocated Hours | `number` | ✅ | — | Hours this resource contributes to the connected phase |
| Hours Per Week | `number` | ✅ | — | Spread across the phase duration |
| Effective Rate | `currency` | ✅ | config: `{ "symbol": "$" }` | Rate applied (may differ from base if discounted) |
| Line Cost | `currency` | ❌ | config: `{ "symbol": "$" }` | **Computed:** Allocated Hours × Effective Rate |
| Role Description | `short_text` | ❌ | — | How this person's contribution is described in the proposal |

> **Why a separate NordType?** This is the key innovation. Instead of a simple "Assigned To" connection, the allocation is itself a Nord — it can be incomplete, carry required properties, and be independently tracked on a board. This lets the MCP agent build a **staffing matrix** node by node.

---

#### 📝 NordType: **Review Gate**
*Represents a formal review checkpoint (Pink, Red, Gold).*

| Property | Type | Required | Options / Config | Purpose |
|----------|------|----------|-----------------|---------|
| Review Type | `select` | ✅ | Pink (Structural), Red (Competitive), Gold (Executive) | Which review cycle |
| Reviewer | `short_text` | ✅ | — | Who is performing the review |
| Status | `select` | ✅ | Scheduled, In Review, Passed, Failed, Conditional | Gate outcome |
| Findings | `long_text` | ❌ | — | Review notes and action items |
| Margin Validated | `boolean` | ✅ | — | Explicit confirmation that pricing meets margin targets |
| Compliance Score | `percentage` | ❌ | — | % of RFP requirements addressed |

---

#### 📄 NordType: **Proposal Document**
*The final deliverable artifact.*

| Property | Type | Required | Options / Config | Purpose |
|----------|------|----------|-----------------|---------|
| Format | `select` | ✅ | PDF, Google Slides, Notion, Custom Web | Delivery format |
| Total Price | `currency` | ✅ | config: `{ "symbol": "$" }` | Sum of all Solution Phase costs + margin |
| Target Margin | `percentage` | ✅ | — | Agency's required margin (typically 25–40%) |
| Actual Margin | `percentage` | ❌ | — | **Computed:** (Price - Cost) / Price × 100 |
| Submitted At | `date` | ❌ | — | Timestamp of delivery |
| Submission Method | `select` | ❌ | Email, Portal, Hand-delivery, Platform | How it was delivered |

---

#### 📊 NordType: **Debrief**
*Post-submission retrospective.*

| Property | Type | Required | Options / Config | Purpose |
|----------|------|----------|-----------------|---------|
| Outcome | `select` | ✅ | Won, Lost, Partial Win, No Decision, Withdrawn | Final result |
| Client Feedback | `long_text` | ❌ | — | What the client said |
| Estimated vs Actual Hours | `long_text` | ❌ | — | Retrospective on resource estimates |
| Lessons Learned | `long_text` | ✅ | — | Captured for knowledge base |
| Would Pursue Again | `boolean` | ✅ | — | Strategic fit assessment |

---

### 2.2 ConnectionType Definitions (7 Types)

| # | Name | Verb | Direction | Stroke | Stages (x_stage_labels) | Color | Purpose |
|---|------|------|-----------|--------|------------------------|-------|---------|
| 1 | **Proposal Stage** | "is at" | forward | solid | Triage (0.0) → Strategy (0.17) → Design (0.33) → Pink Review (0.5) → Red Review (0.67) → Gold/Submit (0.83) → Debrief (1.0) | `#6366f1` | **Primary board axis** — drives the kanban |
| 2 | **Assigned To** | "is assigned to" | forward | solid | *(no stages)* | `#3b82f6` | Links Resource Allocations to Team Members / External Resources |
| 3 | **Scopes Into** | "scopes into" | forward | solid | *(no stages)* | `#8b5cf6` | Links Opportunity → Solution Phases |
| 4 | **Allocates** | "allocates" | forward | dashed | *(no stages)* | `#10b981` | Links Solution Phase → Resource Allocation |
| 5 | **Blocks** | "blocks" | forward | dashed | Soft (0.0) → Hard (1.0) | `#ef4444` | Dependency tracking between phases |
| 6 | **Reviews** | "reviews" | forward | dotted | *(no stages)* | `#f59e0b` | Links Review Gate → Proposal Document |
| 7 | **Skill Match** | "requires skill from" | forward | dotted | Weak (0.0) → Exact (0.5) → Overqualified (1.0) | `#06b6d4` | Links Opportunity → Team Members for triangulation |

---

### 2.3 The Scheduling & Capacity Engine

> **This is what the original prompt completely lacks.**

#### Capacity Calculation

For each Team Member considered for a proposal:

```
Available Hours/Week = Weekly Capacity × (1 - Current Utilization / 100)
Available Hours in Phase = Available Hours/Week × Phase Duration Weeks
```

**Example:**
- Sarah (Senior Dev): Weekly Capacity = 40h, Current Utilization = 60%
- Phase "MVP Sprint 1": Duration = 4 weeks
- Available: 40 × (1 - 0.6) × 4 = **64 hours available**

If the phase needs 80 hours of senior dev time → **GAP of 16 hours** → triggers External Resource creation.

#### Timeline Feasibility Check

```
For each Solution Phase:
  1. Sum allocated hours across all assigned resources
  2. For each resource, check: Allocated Hours ≤ Available Hours/Week × Duration Weeks
  3. Check: resource.Available From ≤ phase start date
  4. If ANY check fails → flag as INFEASIBLE, suggest alternatives
```

#### Sprint Allocation Model

When the agent creates Solution Phases, it should model sprints:

```
Phase: "MVP Development"
  Duration: 8 weeks (4 sprints × 2-week cadence)
  
  Sprint 1: Foundation (Weeks 1-2)
    - 1× Senior Dev @ 30h = $6,000
    - 1× Mid Dev @ 20h = $2,400
    - 1× UX Designer @ 10h = $1,500
    Sprint subtotal: $9,900
    
  Sprint 2: Core Features (Weeks 3-4)
    ...
```

Each sprint becomes its own Solution Phase Nord, connected to the parent via "Scopes Into."

---

### 2.4 Financial Model

#### Rate Structure

| Seniority | Base Rate | With 30% Margin | Discounted (15%) |
|-----------|-----------|-----------------|------------------|
| Principal | $250/hr | $325/hr | $276/hr |
| Senior | $200/hr | $260/hr | $221/hr |
| Mid | $150/hr | $195/hr | $166/hr |
| Junior | $100/hr | $130/hr | $111/hr |

#### Blended Rate Calculation

```
Blended Rate = Σ (Resource Allocated Hours × Effective Rate) / Σ (Resource Allocated Hours)

Example:
  Senior Dev: 120h × $260 = $31,200
  Mid Dev:     80h × $195 = $15,600
  UX Designer: 40h × $195 =  $7,800
  
  Total: $54,600 / 240h = $227.50 blended rate
```

#### Margin Validation

```
Total Cost = Σ all Resource Allocation Line Costs
Total Price = Total Cost / (1 - Target Margin)
Actual Margin = (Total Price - Total Cost) / Total Price × 100

If Actual Margin < Target Margin → Review Gate "Margin Validated" = false
```

---

### 2.5 Persona Definitions (4 Personas)

#### 🎯 Persona: **Proposal Director** (Primary)
- **Background:** 15 years managing $1M+ digital agency proposals. Expert in competitive positioning and win strategy.
- **Primary Motivation:** Win the engagement with an accurate, compelling proposal that the agency can profitably deliver.
- **Voice & Tone:** Structured, decisive, asks probing questions. Never accepts vague answers.
- **Temperature:** 0.7 (focused but can suggest creative positioning)
- **Guardrails:**
  - Always: Verify margin meets target before advancing to Review
  - Always: Flag any resource at >85% utilization as a risk
  - Never: Accept "TBD" as a final answer for required fields
- **Category Weights:**
  - Proposal Stage: +90 (lifecycle is everything)
  - Scopes Into: +70 (solution structure matters)
  - Blocks: +80 (blockers kill timelines)
  - Assigned To: +50 (need to know staffing)
  - Skill Match: +30
  - Reviews: +40
- **Mental Models:**
  1. **Gate Enforcement** — Every stage has explicit exit criteria. Never advance an Opportunity past a gate with incomplete Nords. Probe the user conversationally to fill gaps.
  2. **Triangulation** — Always cross-reference three data points: what the RFP asks for, what skills we have available, and what the budget supports. If any two conflict, surface it immediately.
  3. **Risk Surfacing** — Proactively flag: utilization conflicts, skill gaps, timeline compression, margin erosion, and single points of failure in staffing.

#### 💰 Persona: **Resource Strategist**
- **Background:** Former management consultant turned agency resource manager. Obsessed with optimal team composition.
- **Primary Motivation:** Staff proposals with the right people at the right rates without burning out the team.
- **Voice & Tone:** Analytical, data-driven. Speaks in terms of utilization percentages and capacity forecasts.
- **Temperature:** 0.4 (precise, calculation-focused)
- **Category Weights:**
  - Assigned To: +100 (staffing is everything)
  - Skill Match: +90 (right person for the job)
  - Proposal Stage: +30
  - Blocks: +60
- **Mental Models:**
  1. **Capacity Arithmetic** — Before assigning anyone, calculate their remaining weekly capacity. Never overbook a resource past 90% utilization across all active proposals.
  2. **Skill Triangulation** — Match the Opportunity's Tech Stack Required against Team Member Skills. Rank matches by overlap percentage. Prefer exact matches over adjacent skills.
  3. **Cost Optimization** — Use the most junior resource that can deliver the work. Don't assign a Principal when a Senior will do. Reserve senior resources for architecture and client-facing phases.

#### ✍️ Persona: **Proposal Writer**
- **Background:** Award-winning proposal writer who has crafted 200+ winning responses. Specializes in narrative structure and competitive differentiation.
- **Primary Motivation:** Create a proposal so compelling that the client can't imagine choosing anyone else.
- **Voice & Tone:** Persuasive, polished, client-facing. Transforms technical specs into business value narratives.
- **Temperature:** 1.2 (creative, finds unique angles)
- **Category Weights:**
  - Scopes Into: +90 (narrative structure follows solution structure)
  - Reviews: +80 (quality checkpoints)
  - Proposal Stage: +60
  - Assigned To: -20 (staffing details are someone else's problem)

#### 🔍 Persona: **QA Reviewer**
- **Background:** Independent reviewer who evaluates proposals from the client's perspective. Plays devil's advocate.
- **Primary Motivation:** Find every weakness before the client does.
- **Voice & Tone:** Skeptical, detail-oriented. Asks "What if the client reads this and thinks...?"
- **Temperature:** 0.5 (consistent, methodical)
- **Category Weights:**
  - Reviews: +100 (the review process is their domain)
  - Blocks: +70 (risks and blockers)
  - Proposal Stage: +40
  - Assigned To: +20

---

### 2.6 Stage Gate Definitions

Each gate names the **exact Nords that must be Complete** before `distance_x` advances:

| Gate | From → To | Required Complete Nords | Additional Conditions |
|------|-----------|------------------------|----------------------|
| **Triage Exit** | 0.0 → 0.17 | Opportunity (all required fields) | `Go/No-Go Decision` = "Go" |
| **Strategy Lock** | 0.17 → 0.33 | All Solution Phase Nords connected to the Opportunity | Each phase has hours, type, deliverables, start week, duration |
| **Design Lock** | 0.33 → 0.5 | All Resource Allocation Nords | Every phase has assigned resources with rates and hours. Capacity checks pass. |
| **Pink Review** | 0.5 → 0.67 | Review Gate (Pink) | Status = "Passed" or "Conditional" |
| **Red Review** | 0.67 → 0.83 | Review Gate (Red) + Proposal Document | Margin Validated = true. Total Price ≤ Stated Budget (or flagged with rationale). |
| **Gold/Submit** | 0.83 → 1.0 | Review Gate (Gold) | Status = "Passed". Submitted At has a value. |

---

### 2.7 Seed Data Requirements

The demo must be pre-loaded with **persistent Team Member Nords** that the agent can query and allocate:

**Minimum team roster (10 people):**

| Name | Role | Seniority | Rate | Utilization | Skills | Available From |
|------|------|-----------|------|-------------|--------|----------------|
| Alex Chen | Solutions Architect | Principal | $250 | 40% | React, Node.js, AWS, GCP, ML/AI | 2026-06-01 |
| Sarah Kim | Engineering Lead | Senior | $200 | 60% | React, Node.js, Python, AWS | 2026-05-20 |
| Marcus Johnson | Senior Developer | Senior | $200 | 75% | React, Node.js, iOS, Android | 2026-06-15 |
| Priya Patel | Mid Developer | Mid | $150 | 30% | React, Node.js, Python | 2026-05-15 |
| James Wright | Junior Developer | Junior | $100 | 20% | React, Node.js | 2026-05-15 |
| Maya Torres | UX/UI Designer | Senior | $180 | 55% | Figma, UX Research, Webflow | 2026-05-20 |
| David Park | Creative Director | Principal | $250 | 70% | Brand Strategy, Figma, Content Strategy | 2026-07-01 |
| Lisa Huang | Product Manager | Senior | $190 | 45% | UX Research, Content Strategy | 2026-05-15 |
| Omar Ahmed | DevOps Engineer | Mid | $160 | 50% | AWS, GCP, Python | 2026-06-01 |
| Rachel Green | QA Engineer | Mid | $140 | 25% | React, Node.js, iOS, Android | 2026-05-15 |

---

## Part 3: Implementation Sequence

| Step | What | How |
|------|------|-----|
| 1 | Create all 8 NordTypes with exact schemas | Seed route or manual UI |
| 2 | Create all 7 ConnectionTypes with stage labels | Seed route |
| 3 | Create 10 Team Member Nords | Seed route with realistic data |
| 4 | Create 4 Personas with mental models + weights | Seed route |
| 5 | Write the final system prompt | Incorporate all schemas, personas, gates, and calculation formulas |
| 6 | Build the seed script | `scripts/seed_proposal_demo.mjs` |
| 7 | Test end-to-end | Upload a sample RFP and walk through all 6 stages |

---

## Part 4: How This Showcases Nords

| Nords Feature | How the Demo Uses It |
|---------------|---------------------|
| **Completeness gating** | Every stage gate enforces required fields. The AI cannot skip ahead. |
| **Board view + distance_x** | 7-column kanban showing proposal progression across the full lifecycle |
| **Graph view** | Visual web of Opportunity → Phases → Allocations → People. Instantly see staffing density. |
| **Properties system** | 8 distinct NordTypes with 60+ properties across currency, percentage, select, date, multi_select types |
| **Personas** | 4 personas with different temperatures, weights, and mental models — switch lenses to see the proposal from different angles |
| **Temperature** | Proposal Writer at 1.2 (creative) vs Resource Strategist at 0.4 (precise) |
| **Category weights** | Resource Strategist sees "Assigned To" connections at +100, Writer sees them at -20 |
| **Scale property** | Opportunity cards sized by Win Probability. Team Members sized by Utilization. |
| **Connection types** | 7 distinct relationship types with different colors, styles, and semantics |
| **Spectrum view** | Skill Match connections show Weak → Exact → Overqualified along a continuous axis |
| **MCP session capture** | Agent creates Nords during conversation, they persist as proposal artifacts |

---

## Part 5: Platform Feature Gap Analysis

> **Key finding:** This demo is achievable with what Nords supports today. The MCP agent handles all calculation logic — the platform provides data structures and visualization.

### ✅ Works Today — No Changes Needed

| Capability | Platform Feature Used | Status |
|------------|----------------------|--------|
| 8 NordTypes with `properties_schema` | PropertySchema system with all types (`currency`, `percentage`, `select`, `multi_select`, `date`, etc.) | ✅ Ships today |
| `required: true` on properties | Completeness system (§12 of schema ref) | ✅ Ships today |
| 7-column board with stage progression | `distance_x` + `x_stage_labels` on ConnectionType | ✅ Ships today |
| Graph view showing Opportunity → Phase → Allocation → Person web | Graph view with typed edges, colors, directions | ✅ Ships today |
| 4 Personas with mental models, weights, temperature | Persona system with `temperature` slider (just shipped) | ✅ Ships today |
| `scale_property` on NordTypes | Scale-by-property rendering | ✅ Ships today |
| Seed data via API | Existing seed route pattern (`/api/projects/:id/seed`) | ✅ Ships today |
| MCP flags on project | `mcp_enabled`, `mcp_capture_data`, `mcp_mutable` | ✅ Ships today |

### 🤖 Agent Logic — No Platform Changes Required

These capabilities live **entirely in the system prompt**. The MCP agent does the math and writes results to existing property fields.

| Capability | How the Agent Handles It |
|------------|-------------------------|
| Capacity calculation | Agent reads Team Member's `Current Utilization` + `Weekly Capacity`, computes availability, writes result to Resource Allocation's `Allocated Hours` |
| Blended rate / margin validation | Agent reads `Effective Rate` × `Allocated Hours` across allocations, sums them, writes `Total Price` and `Actual Margin` to Proposal Document |
| Stage gate enforcement | Agent checks completeness of all connected Nords before updating `distance_x` on the Proposal Stage connection |
| Skill matching / triangulation | Agent compares Opportunity's `Tech Stack Required` multi_select against each Team Member's `Skills` multi_select, creates Skill Match connections |
| Timeline feasibility | Agent compares `Available From` dates against `Start Week` calculations, flags conflicts in conversation |

### 🔧 Nice-to-Have Platform Features (Not Blockers)

These would make the **production** version better but can be cleanly worked around for the demo:

| Feature | What It Would Do | Demo Workaround | Build Effort |
|---------|------------------|-----------------|-------------|
| **Computed properties** | Auto-calculate `Line Cost = Allocated Hours × Effective Rate` when either field changes | Agent calculates and writes the value after setting the inputs. User sees correct values. | Medium — new property type + UI rendering |
| **Cross-nord query helper** | API endpoint to query "all Team Members where Skills contains 'React' AND Utilization < 80%" | Agent fetches all Team Member Nords, filters in-memory. Works fine at demo scale (10 people). | Medium — JQL-like filter on properties JSONB |
| **File-to-text parsing** | Upload RFP PDF → extract text → populate Opportunity fields | User pastes scope text manually, or agent receives it via chat context. Not a visual feature. | Large — requires PDF parsing service |

### 📋 What This Means for the Demo Plan

The demo needs **zero new platform features**. Everything works with:
1. Existing NordType/ConnectionType schema definitions
2. Existing board + graph views  
3. Existing persona system (with the new temperature slider)
4. A well-crafted seed script to pre-load the team roster
5. A comprehensive system prompt that encodes all the business logic

The 3 nice-to-haves above are worth considering for the product roadmap but should **not** block the demo build.

---

## Part 6: Feature Design Sketches

> Three questions from the planning session that require concrete design answers.

---

### 6.1 MCP System Prompt as a Project Setting

**Question:** *Could we store the agent's system prompt on the project so it's plug-and-play with any LLM?*

**Answer: Yes — and this is the killer feature.**

The insight is that a Nords project becomes a **self-contained AI application definition**:
- The **NordTypes** define the data schema
- The **Personas** define the AI's personality and priorities  
- The **System Prompt** defines the agent's behavior and business logic
- The **Graph data** is the live state

Any MCP-connected LLM (Gemini, Claude, GPT, Llama) receives the same prompt + context and can operate the project. The LLM is just a runtime — the project is the program.

#### Migration

```sql
-- Migration 013: Add MCP system prompt to projects
ALTER TABLE projects
  ADD COLUMN mcp_system_prompt TEXT DEFAULT NULL;

COMMENT ON COLUMN projects.mcp_system_prompt IS
  'System prompt injected into MCP agent sessions. Combined with schema context and persona at session start.';
```

#### Where It Lives in the UI

Add to the existing MCP settings section in Project Settings (alongside `mcp_enabled`, `mcp_capture_data`, `mcp_mutable`):

```
┌─ MCP Settings ──────────────────────────────────────────┐
│  ☑ MCP Enabled    ☑ Capture Data    ☐ Mutable          │
│                                                          │
│  Default Persona:  [Proposal Director ▾]                 │
│  Default Start Nord: [Opportunity: Acme Corp ▾]          │
│                                                          │
│  System Prompt:                                          │
│  ┌──────────────────────────────────────────────────────┐│
│  │ You are the "Proposal Director," an MCP-enabled AI  ││
│  │ agent operating within the Nords spatial graph       ││
│  │ engine. Your objective is to guide users through...  ││
│  │                                                      ││
│  │ (textarea, resizable, ~50 rows)                      ││
│  └──────────────────────────────────────────────────────┘│
│                                                          │
│  Character count: 2,847 / 50,000                         │
└──────────────────────────────────────────────────────────┘
```

#### Prompt Assembly Pipeline

When an MCP session starts, the system assembles the full context in this order:

```
┌─────────────────────────────────────────────────────┐
│  ASSEMBLED AGENT CONTEXT                             │
│                                                      │
│  1. [SYSTEM PROMPT]                                  │
│     projects.mcp_system_prompt                       │
│     (the business logic, gates, behavior rules)      │
│                                                      │
│  2. [SCHEMA CONTEXT]  (auto-generated, not editable) │
│     - All NordType schemas with properties_schema    │
│     - All ConnectionType schemas with stage labels   │
│     - Completeness rules (§12 from schema ref)       │
│                                                      │
│  3. [PERSONA CONTEXT]  (from default_persona_id)     │
│     - Background, motivation, voice, temperature     │
│     - Mental models (injected as system instructions) │
│     - Category weights (attention priorities)         │
│     - Guardrails (always/never rules)                │
│                                                      │
│  4. [GRAPH SNAPSHOT]  (live data)                     │
│     - All Nords with current property values         │
│     - All Connections with current distance_x values │
│     - Completeness status per Nord                   │
│                                                      │
│  5. [USER MESSAGE]                                   │
│     - The actual conversation turn                   │
└─────────────────────────────────────────────────────┘
```

**Key design decision:** The project owner writes **only the system prompt** (#1). Sections #2, #3, and #4 are auto-assembled by the platform. This means the prompt can reference NordType names ("when creating an Opportunity Nord...") without needing to repeat the schema — the schema is injected automatically.

#### Schema Changes

```typescript
// In schemas/projects.ts — add to both Create and Update:
mcp_system_prompt: z.string().max(50000).optional().nullable()
  .describe('System prompt for MCP agent sessions. Combined with auto-generated schema context and persona at session start. Write business logic and behavioral rules here — schema definitions are injected automatically.'),
```

---

### 6.2 Computed Properties

**Question:** *How would computed properties work and be managed easily?*

#### Concept

A `computed` property type is a **read-only property** whose value is derived from a formula referencing other properties on the same Nord.

#### PropertySchema Extension

Add `computed` to the property type enum and a `formula` field to config:

```typescript
// New property type added to the enum:
type: z.enum([
  'short_text', 'long_text', 'url', 'number', 'currency', 'percentage',
  'select', 'multi_select', 'boolean', 'date', 'date_range',
  'user', 'nord_reference', 'file',
  'computed',  // ← NEW
])

// Config for computed properties:
config: {
  formula: "Allocated Hours * Effective Rate",  // expression
  output_type: "currency",                       // how to render the result
  output_config: { symbol: "$" },               // rendering config
}
```

#### Formula DSL (Keep It Simple)

Support only **same-nord property references** with basic arithmetic. No cross-nord lookups in formulas (that's what the query endpoint is for).

```
// Supported operations:
Allocated Hours * Effective Rate           → multiplication
(Total Price - Total Cost) / Total Price   → division with grouping
Estimated Hours * 1.15                     → constant multipliers (contingency)
```

**Parser:** A simple expression evaluator — no need for a full language. ~50 lines of code. Operates on the Nord's own `properties` JSONB.

#### Evaluation Strategy

| Context | When | How |
|---------|------|-----|
| **UI (client)** | On render | Evaluate formula against current `properties` values. Display result in a read-only field with a `ƒ` icon. |
| **API response** | On read | Server evaluates formula and includes computed values in the response JSON. They are NOT stored in the DB. |
| **MCP agent** | On write | Agent writes the input properties. Computed values are recalculated on next read. Agent can also calculate and write them manually (backwards-compatible). |

**Not stored in DB** — computed values are derived on read. This means:
- No stale data
- No migration needed for existing Nords
- Formula changes take effect immediately for all Nords of that type

#### UI in ManageTypes

In the property editor, when `type = computed`:

```
┌─ Property: Line Cost ──────────────────────────────┐
│  Name: [Line Cost          ]                        │
│  Type: [computed ▾]                                 │
│                                                     │
│  Formula:                                           │
│  ┌─────────────────────────────────────────────────┐│
│  │ Allocated Hours * Effective Rate                ││
│  └─────────────────────────────────────────────────┘│
│  Output type: [currency ▾]  Symbol: [$]             │
│  Card row: [2 ▾]                                    │
│                                                     │
│  Preview: $12,000.00  (based on current values)     │
└─────────────────────────────────────────────────────┘
```

#### Migration

No DB migration needed — `properties_schema` is JSONB, so the new `computed` type and `formula` config are just new values in the existing structure. Only code changes:

1. Add `'computed'` to the Zod enum in `schemas/types.ts`
2. Add formula evaluator utility (~50 LOC)
3. Add read-only rendering in the property display components
4. Add formula editor UI in ManageTypes

**Effort estimate:** ~1 day

---

### 6.3 Cross-Nord Query Endpoint

**Question:** *How would cross-nord queries work?*

#### Concept

A new API endpoint that filters Nords by type and property values using Postgres JSONB operators. This replaces the "fetch all, filter in JS" pattern the MCP agent would otherwise need.

#### API Surface

```
GET /api/projects/:projectId/nords/query
  ?type_name=Team Member
  &filter=Skills contains React
  &filter=Current Utilization < 80
  &filter=Available From <= 2026-06-15
  &sort=Current Utilization asc
  &limit=10
```

**Response:** Standard Nord array with properties expanded.

#### Filter Syntax

Keep it simple — 3 operators that map directly to Postgres JSONB:

| Filter Syntax | Postgres Translation | Example |
|--------------|---------------------|---------|
| `property = value` | `properties->>'property' = 'value'` | `Seniority = Senior` |
| `property < value` | `(properties->>'property')::numeric < value` | `Current Utilization < 80` |
| `property contains value` | `properties->'property' @> '"value"'` | `Skills contains React` |

#### Implementation

```typescript
// In routes/graph.ts or a new routes/query.ts:

router.get('/api/projects/:projectId/nords/query', async (req, res) => {
  const { projectId } = req.params;
  const { type_name, filter, sort, limit } = req.query;
  
  // 1. Resolve type_name → type_id
  // 2. Parse filter strings into WHERE clauses
  // 3. Execute parameterized query with JSONB operators
  // 4. Return filtered Nords
});
```

Postgres query shape:

```sql
SELECT n.*
FROM nords n
JOIN nord_types nt ON n.type_id = nt.id
WHERE n.project_id = $1
  AND nt.name = $2
  AND n.deleted_at IS NULL
  AND (n.properties->>'Current Utilization')::numeric < 80
  AND n.properties->'Skills' @> '"React"'::jsonb
ORDER BY (n.properties->>'Current Utilization')::numeric ASC
LIMIT 10;
```

This is entirely supported by Postgres's existing JSONB indexing. For the demo scale (10 team members), no index is needed. For production, add a GIN index:

```sql
CREATE INDEX idx_nords_properties ON nords USING gin (properties);
```

#### MCP Agent Usage

Instead of:
```
1. Fetch ALL nords in project
2. Filter in-memory for type = "Team Member"
3. Filter for Skills containing "React"
4. Filter for Utilization < 80%
```

The agent calls:
```
GET /api/projects/:id/nords/query?type_name=Team Member&filter=Skills contains React&filter=Current Utilization < 80
```

One API call. Server does the work. Scales to hundreds of team members.

#### Zod Schema

```typescript
export const NordQuerySchema = z.object({
  type_name: z.string().optional()
    .describe('Filter by NordType name (e.g., "Team Member")'),
  filter: z.array(z.string()).optional()
    .describe('Property filters: "property operator value" (operators: =, <, >, <=, >=, contains)'),
  sort: z.string().optional()
    .describe('Sort by property: "property asc|desc"'),
  limit: z.number().int().min(1).max(100).optional().default(50)
    .describe('Maximum results to return'),
});
```

**Effort estimate:** ~0.5 day for basic implementation, ~1 day with full filter parsing and validation.

---

### Summary: Three Features, One Theme

All three features serve the same goal — **making a Nords project a self-contained, LLM-portable application:**

| Feature | What It Enables |
|---------|----------------|
| **System Prompt on Project** | The project defines its own AI behavior. Swap LLMs freely. |
| **Computed Properties** | Business logic (pricing, margins) lives in the schema, not the prompt. |
| **Cross-Nord Queries** | The agent can efficiently find and filter graph data without loading everything. |

Together they transform Nords from "a tool the AI uses" into "a platform where the AI runs."

---

## Part 7: UI Impact Assessment

> Mapped against the actual codebase. Each feature identifies which files change, what the user sees, and estimated effort.

---

### 7.1 MCP System Prompt — UI Impact: **Minimal**

**Files touched:** 2

| File | Change | LOC |
|------|--------|-----|
| [ProjectSettings.tsx](file:///Users/danielcrowder/Desktop/Projects/nords/client/src/components/ProjectSettings/ProjectSettings.tsx) | Add `mcp_system_prompt` textarea inside the existing `{form.mcp_enabled && (...)}` block (after the Capture Data / Mutable checkboxes, ~line 306) | ~30 |
| [ProjectSettings.css](file:///Users/danielcrowder/Desktop/Projects/nords/client/src/components/ProjectSettings/ProjectSettings.css) | Styles for the prompt textarea (resizable, monospace, char counter) | ~20 |

**What the user sees:**

When they check "Enable MCP", the existing indent block that shows Capture Data / Mutable now also shows:

```
☑ Enable MCP
  ☑ Capture Data
  ☐ Mutable (experimental)
  
  System Prompt                            2,847 / 50,000
  ┌────────────────────────────────────────────────────┐
  │ You are the "Proposal Director," an MCP-enabled    │
  │ AI agent operating within the Nords spatial graph  │
  │ engine...                                          │
  │                                                    │
  │ (monospace textarea, resizable, ~12 rows default)  │
  └────────────────────────────────────────────────────┘
  💡 Schema context and persona are injected 
     automatically — write business logic only.
```

**What the user does NOT see:** The prompt assembly pipeline (§6.1). That's entirely backend — when the MCP server is built (Phase 5), it reads `mcp_system_prompt` + auto-generates schema/persona context. Zero additional UI.

**No new components.** This is just a textarea + hint text added to an existing form. The pattern already exists in the same component (Description and Purpose are both textareas with validation).

---

### 7.2 Computed Properties — UI Impact: **Moderate**

**Files touched:** 4

| File | Change | LOC |
|------|--------|-----|
| [ManageTypes.tsx](file:///Users/danielcrowder/Desktop/Projects/nords/client/src/components/ManageTypes/ManageTypes.tsx) ~L744-756 | Add `computed` to the property type `<select>` dropdown. When selected, show formula input row in the expandable detail section (~L810+) | ~40 |
| [ManageTypes.css](file:///Users/danielcrowder/Desktop/Projects/nords/client/src/components/ManageTypes/ManageTypes.css) | Styles for formula input row (monospace input, ƒ icon, output type picker) | ~25 |
| [PropertyField.tsx](file:///Users/danielcrowder/Desktop/Projects/nords/client/src/components/Drawer/PropertyField.tsx) ~L50 | Add `case 'computed':` to the switch statement → render a **read-only** `ComputedField` component | ~35 |
| New: `utils/formulaEvaluator.ts` | Simple expression parser that resolves `"Allocated Hours * Effective Rate"` against a `properties` object | ~50 |

**What the user sees in ManageTypes (type editor):**

The property type dropdown at [L749](file:///Users/danielcrowder/Desktop/Projects/nords/client/src/components/ManageTypes/ManageTypes.tsx#L749) currently has: Text, Number, Dropdown, Date, Markdown, URL, Tags. We add **Computed** to this list.

When `computed` is selected, the expandable detail section (which currently shows Default Value + Options) instead shows:

```
┌─ Line Cost ──────────────────────────────────────────┐
│  Name: [Line Cost         ]  Type: [Computed ▾]      │
│                                                       │
│  ▼ Expanded detail:                                   │
│  ┌───────────────────────────────────────────────────┐│
│  │ ƒ Formula:                                        ││
│  │ [ Allocated Hours * Effective Rate              ] ││
│  │                                                   ││
│  │ Display as: [Currency ▾]  Symbol: [$]             ││
│  └───────────────────────────────────────────────────┘│
│                                                       │
│  Req: disabled (computed fields can't be required)    │
│  Hide: [ ]                                            │
└──────────────────────────────────────────────────────┘
```

**Key UI decisions:**
- **Req checkbox is disabled** for computed properties — they derive their value, so "required" is meaningless
- The formula input uses **monospace font** and a `ƒ` prefix icon
- An "output type" picker determines how the result renders (currency with $ symbol, percentage with %, plain number, etc.)

**What the user sees in DetailDrawer (editing a Nord):**

[PropertyField.tsx](file:///Users/danielcrowder/Desktop/Projects/nords/client/src/components/Drawer/PropertyField.tsx) currently renders 8 property types. We add a 9th — `ComputedField`:

```
┌─ Detail Drawer ──────────────────────────────────────┐
│                                                       │
│  Allocated Hours *          [ 120              ]      │
│  Effective Rate *           [ $260             ]      │
│  Line Cost  ƒ               $31,200.00    (read-only) │
│                                                       │
│  The ƒ icon signals "this is computed"                │
│  Muted text, no input — just the evaluated result     │
└──────────────────────────────────────────────────────┘
```

The `ComputedField` component:
- Reads the formula from the property schema's `config.formula`
- Evaluates it against the current Nord's `properties` JSONB
- Renders the result with the `output_type` formatting (e.g., `$31,200.00`)
- Shows `—` if any referenced property is missing
- Is completely **read-only** — no `onChange` handler

**On the card (board/graph view):**

Cards already render visible properties (those with `card_row` set). A computed property with `card_row: 2` renders exactly like a number/currency — just with a `ƒ` indicator and no edit capability on click.

---

### 7.3 Cross-Nord Queries — UI Impact: **None**

**Files touched:** 0 on the client

This is a **server-only** feature. It adds one new API endpoint consumed exclusively by the MCP agent (or future internal tools). There are no visible UI changes.

| What | Where | Detail |
|------|-------|--------|
| New route | `server/src/routes/graph.ts` or new `routes/query.ts` | `GET /api/projects/:id/nords/query` |
| New Zod schema | `server/src/schemas/nords.ts` (new file) or add to existing | `NordQuerySchema` |
| New repository method | `server/src/repositories/nords.ts` | `queryByProperties()` with JSONB WHERE clause builder |

**The user never interacts with this.** It's plumbing for the MCP agent to efficiently ask questions like "find all Team Members with React skills and <80% utilization."

If we later wanted a user-facing "filter Nords" feature, that would be a separate UI epic — but the API built here would power it.

---

### UI Effort Summary

| Feature | UI Files | New Components | CSS | Total Est. |
|---------|---------|---------------|-----|-----------|
| **System Prompt** | 2 modified | 0 | ~20 LOC | **2–3 hours** |
| **Computed Properties** | 3 modified + 1 new util | 1 (`ComputedField`) | ~25 LOC | **1 day** |
| **Cross-Nord Queries** | 0 | 0 | 0 | **0 (server only)** |

**Total UI work across all three features: ~1.5 days.** The heaviest lift is the formula evaluator utility and the `ComputedField` renderer — everything else slots into existing patterns.
