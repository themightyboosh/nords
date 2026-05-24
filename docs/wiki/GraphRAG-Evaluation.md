# MCP Architecture & Data Layer Evaluation

> **Evaluator Lens:** AI Engineer + Product Lead  
> **Core Constraint:** Nords is a plug-and-play MCP server. Any LLM with MCP access (Claude, GPT, Gemini, Llama, Mistral, etc.) must be able to connect and operate effectively without model-specific tuning.  
> **Scope:** Does the data layer contribute everything it can to drive AI quality, goal completion, and user experience — across any LLM client?

---

## 1. The Portability Problem

Today, the system has **two classes of AI consumer** with dramatically different context:

| | Built-in Gemini Chat | External MCP Client (Claude, GPT, etc.) |
|---|---|---|
| System prompt | ✅ 130 lines of protocol, verb semantics, pacing rules, goal event handling | ❌ None — the LLM's own system prompt |
| Tool descriptions | Rich, project-context-enriched | Terse (e.g., "Move to a connected nord. Returns updated horizon.") |
| Behavioral guidance | "Better to deeply explore 3 topics than shallowly touch 10" | Nothing |
| Verb interpretation | "flows into → prerequisite gate" | Raw verb string, no interpretation |
| Stage label usage | "Use stage labels instead of raw numbers" | Raw `distance_x: 0.2`, no guidance |
| Goal event reactions | Explicit per-event instructions | Raw event JSON |
| Planning queue | "Never expose to participant" | Field in JSON, no privacy hint |

**This means:** An external LLM connecting via MCP gets structured data but no instructions for how to interpret it. The intelligence is trapped in a Gemini-specific system prompt instead of being embedded in the data layer itself.

**The principle:** If a behavior depends on a system prompt to work, it's not portable. If it's embedded in the data or tool responses, it works with any LLM.

---

## 2. What We're Doing Right

These architectural decisions are model-agnostic and work across any MCP client.

### Semantic Topology in the Data Layer
Connection `verb`, `measurement_mode`, `stage_labels`, and `direction_prepositions` are returned in tool responses, not system prompts. Any LLM reading the horizon sees `"verb": "flows into", "stage": "In Progress"` — the semantics travel with the data. This is excellent.

### Database-Level Attention (Persona × Category Weights)
Neighbors arrive pre-sorted by `persona_bias + goal_proximity`. The sorting is done server-side, so any LLM naturally focuses on the first items in the list. No prompt engineering required.

### Goal DAG as Reactive State Machine
`goal_events` are returned inline with `nords_update_session_nord` responses. Any LLM sees `"type": "goal_completed", "achieved_prompt": "Thank the user for..."` in the tool response. The event structure is self-describing.

### Tiered Context Delivery
Dictionary → Horizon → Goal Events. The sliding-window pattern prevents context overflow regardless of which LLM is consuming the data.

---

## 3. What We're Getting Wrong

### A. Properties Are Opaque — The AI Doesn't Know *What to Ask*
**Severity: Critical | Effort: Low | Portability Impact: Extreme**

When any LLM receives `remaining_schema` from the horizon, each property looks like:
```json
{ "name": "Budget", "type": "number", "required": true, "source": "mcp" }
```

The LLM knows *what to collect* but not *what it means*, *how to ask*, or *what a valid answer looks like*. Gemini gets partial help from the system prompt saying "weave into conversation naturally" — but an external Claude/GPT client gets nothing.

**The fix:** Add `description` and `hint` to `PropertySchema`:
```json
{
  "name": "Budget",
  "type": "number",
  "required": true,
  "source": "mcp",
  "description": "Annual project budget in USD",
  "hint": "What's the approximate annual budget for this initiative?"
}
```

These travel with the horizon response. Any LLM reading `remaining_schema` now knows exactly what to ask and how to frame it — no system prompt needed.

### B. No Collection Priority — The AI Doesn't Know *What Order*
**Severity: High | Effort: Low | Portability Impact: High**

8 remaining properties arrive in schema-definition order. Gemini's system prompt says "pace unhurriedly" but an external LLM may blitz through them top-to-bottom.

**The fix:** Add `priority` (1–5) to `PropertySchema`. Sort `remaining_schema` by priority descending in `computeRemainingSchema()`. Any LLM naturally asks about the first items first. The protocol becomes self-directing.

### C. No Conditional Logic — The AI Asks Irrelevant Questions
**Severity: High | Effort: Medium | Portability Impact: High**

If `Employment Status = "Student"`, asking about "Current Company" is wrong. No system prompt can anticipate every conditional — this must live in the schema.

**The fix:** Add `depends_on` to `PropertySchema`:
```json
{
  "name": "Current Company",
  "depends_on": { "property": "Employment Status", "values": ["Employed", "Self-employed"] }
}
```

`computeRemainingSchema()` evaluates conditions against `session_properties` and excludes inapplicable properties before any LLM sees them. The data layer makes the decision, not the LLM.

### D. Protocol Knowledge Is Trapped in the System Prompt
**Severity: High | Effort: Medium | Portability Impact: Critical**

The built-in Gemini chat receives 130 lines of behavioral protocol:
- "Connection verbs encode causal logic" → prerequisite gates
- "Use stage labels instead of raw numbers"
- "Planning queue is internal — never expose to user"
- "Goal events: goal_completed → acknowledge naturally"
- "Pacing: deeply explore 3 topics, not shallowly 10"

External MCP clients get **none of this**. An LLM connecting via Claude Desktop or Cursor has no idea what `planning_queue` is for or that it shouldn't be shared with the user.

**The fix:** Embed behavioral hints in tool responses, not just system prompts. Two approaches:

1. **Enrich the briefing response** — `nords_get_briefing` already returns dictionary + horizon + goals. Add a `protocol` section:
```json
{
  "protocol": {
    "planning_queue": "Internal only. Never share with participant.",
    "verbs": "Connection verbs encode causality: 'flows into' = prerequisite, 'depends on' = dependency.",
    "stages": "Use stage label names in conversation, not raw distance numbers.",
    "pacing": "Explore topics deeply before moving on. Complete current thread before pivoting.",
    "goal_events": {
      "goal_completed": "Acknowledge naturally. Weave achieved_prompt if set. Don't say 'Goal complete!'",
      "goal_activated": "Transition to new topics naturally.",
      "goal_cancelled": "Stop pursuing silently. Don't mention to user.",
      "session_terminating": "Bring conversation to warm close."
    }
  }
}
```

2. **Enrich MCP tool descriptions** — The `mcp-server.ts` tool descriptions are very terse ("Move to a connected nord"). They should be as rich as the `geminiTools.ts` descriptions. Today there is a quality gap between the two.

### E. No Revisit Context — The AI Forgets What Happened Here
**Severity: Medium | Effort: Low | Portability Impact: Medium**

When any LLM traverses back to a previously visited nord, it sees `session_properties` (collected values) and `remaining_schema` (what's left). But it has no record of *what was discussed* or *why it left*. The built-in Gemini chat has chat history in its context window to partially compensate — external MCP clients don't even have that.

**The fix:** Add `visit_notes` to `mcp_session_nords`. When `nords_visit_nord` is called with `context`, persist it. Surface it in the horizon's `current_nord` response. Any LLM instantly knows "Last time I was here, the user said they'd follow up on pricing."

### F. Goal Bindings Can't Express Connection Properties
**Severity: Medium | Effort: Low | Portability Impact: Low**

Goals bind to `nord_id + property_name` pairs only. But Categories also have `properties_schema`. A goal like "Qualify the deal" might need the connection between two nords to have its `qualification_score` filled — unexpressible today.

**The fix:** Extend `goal_properties` to optionally support `connection_id + property_name` bindings. Update `evaluateExplicitGoal()`.

### G. No Confidence Signal on Collected Values
**Severity: Medium | Effort: Medium | Portability Impact: Low**

All values saved by `nords_update_session_nord` are treated as equally certain. "Our budget is $500K" and "we're a startup so probably small" produce the same data record. Neither Gemini nor external clients can flag uncertainty.

**The fix:** Accept an optional `confidence` map alongside `properties` in `nords_update_session_nord`. Low-confidence values surface for confirmation.

---

## 4. What Was Previously Recommended But Should Be Deprioritized

### Vector Embeddings / Semantic Search
Graphs are 10–100 nords, not 10,000. `nords_get_graph` and the horizon's pre-sorted neighbors are better retrieval mechanisms than cosine similarity for structured navigation at this scale. Defer to Phase 2.

### Escalation / Deadlock Resolution
Better solved by the `priority` field (B) and `depends_on` logic (C), which prevent the AI from getting stuck in the first place. Adding data-layer deadlock detection over-engineers a symptom rather than fixing the root cause.

---

## 5. Prioritized Action Plan

Ranked by `(portability impact × AI quality improvement) / effort`:

| Rank | Action | Impact | Effort | Why |
|------|--------|--------|--------|-----|
| **1** | **Property `description` + `hint`** | Critical | Low | Any LLM instantly knows what to ask. Zero prompt engineering. Travels with horizon. |
| **2** | **Embed protocol in briefing / tool responses** | Critical | Medium | Makes the MCP server truly plug-and-play. External clients get the same behavioral intelligence as the built-in chat. |
| **3** | **Property `priority` ordering** | High | Low | Self-directing collection order. No system prompt needed. |
| **4** | **Conditional `depends_on` logic** | High | Medium | Data layer makes the relevance decision. No LLM can ask irrelevant questions. |
| **5** | **Enrich `mcp-server.ts` tool descriptions** | High | Low | Parity between built-in Gemini descriptions and external MCP descriptions. |
| **6** | **Visit notes on session nords** | Medium | Low | Cross-session, cross-LLM memory. Works without chat history. |
| **7** | **Connection property goal bindings** | Medium | Low | Completes the goal binding model. |
| **8** | **Confidence scores on values** | Medium | Medium | Data quality layer. |

### Sprint Plan

**Sprint 1 — Schema Intelligence (Items 1, 3, 4):**
Add `description`, `hint`, `priority`, and `depends_on` to `PropertySchema`. Update `computeRemainingSchema()` to sort by priority and evaluate conditions. Update ManageTypes UI to expose these fields.
*Result: The `remaining_schema` in horizon responses becomes self-documenting and self-directing for any LLM. No system prompt dependency.*

**Sprint 2 — MCP Portability (Items 2, 5):**
Embed a `protocol` section in `nords_get_briefing` responses. Enrich `mcp-server.ts` tool descriptions to match `geminiTools.ts` quality. Consider extracting the system prompt protocol into a shared source consumed by both.
*Result: Any LLM connecting via MCP gets the same behavioral intelligence as the built-in Gemini chat.*

**Sprint 3 — Data Quality (Items 6, 7, 8):**
Add `visit_notes`, connection goal bindings, and confidence tracking.
*Result: Complete data quality and recall layer that works across any client.*

---

## 6. Conclusion

The graph structure (Categories, Personas, Goals) is architecturally sound and model-agnostic. The **critical gap** is that behavioral intelligence is trapped in a Gemini-specific system prompt instead of being embedded in the data layer and tool responses.

The highest-leverage changes are:
1. **Make properties self-describing** (`description`, `hint`, `priority`, `depends_on`) so any LLM knows what to ask, how to ask it, and in what order — without prompt engineering.
2. **Make the protocol portable** by embedding behavioral guidance in tool responses (`nords_get_briefing`) so external MCP clients operate at the same quality level as the built-in chat.

When these changes ship, a project designer can configure a Nords project once, and it works with Claude, GPT, Gemini, Llama, or any future LLM with MCP support — no per-model tuning required. That's the plug-and-play promise.
