# AI-Optimized Agile Schemas

When designing project management entities (Epics, Features, User Stories) for consumption by Autonomous Agents (like LLMs or MCP-driven tools), human-centric narratives ("As a user...") create unnecessary token bloat and ambiguity. AI agents require deterministic constraints, explicit file paths, strict relational UUIDs, and highly computable acceptance criteria.

The following schemas represent the ideal data structure for AI-to-AI or Human-to-AI task delegation within the Nords environment.

---

## 1. The Epic Schema
**Scope:** A massive initiative spanning multiple repositories or architectural shifts. For an AI, an Epic serves strictly as the *Global Context Boundary*. It defines what the AI is *not* allowed to touch.

```yaml
# Schema: AI_Epic
properties:
  id: "UUID"
  title: "String" # High-level identifier
  objective_summary: "String" # Concise technical goal
  
  # AI Guardrails
  architectural_invariants: "Array<String>" # Crucial: Hard rules the AI must NEVER break.
    - "Do not introduce state-management libraries (e.g., Redux). Use native React Context."
    - "All distance logic must remain pure Euclidean. No path-finding algorithms."
  
  out_of_scope_boundaries: "Array<String>"
    - "Do not modify the Auth tables."
  
  # Relational
  child_features: "Array<UUID>" # Binds downwards
```

---

## 2. The Feature Schema
**Scope:** A bounded deliverable. For an AI, a Feature defines the *System Impact Zone*. It tells the agent which domains, APIs, or database tables are currently vulnerable to mutation.

```yaml
# Schema: AI_Feature
properties:
  id: "UUID"
  parent_epic_id: "UUID"
  title: "String"
  
  # Technical Surface Area
  impact_zone: 
    directories: "Array<String>" # e.g., ["src/components/Canvas/", "docs/frontend/"]
    database_tables: "Array<String>" # e.g., ["nodes", "edges"]
  
  data_contracts:
    inputs: "JSON Schema" # Expected payload entering the feature
    outputs: "JSON Schema" # Expected payload leaving the feature
  
  # Relational
  dependencies: "Array<UUID>" # Other features that MUST be closed before this can be started
  child_stories: "Array<UUID>"
```

---

## 3. The User Story (Task) Schema
**Scope:** The micro-execution unit. Human user stories explain *why* (empathy). AI user stories explain *how to verify* (testability). The acceptance criteria must be explicit commands the AI can locally run.

```yaml
# Schema: AI_Story
properties:
  id: "UUID"
  parent_feature_id: "UUID"
  title: "String"
  
  # Execution Directives
  target_files: "Array<String>" # Explicit URIs the agent must edit.
    - "file:///src/components/Canvas/CustomEdge.tsx"
  
  mutation_directive: "Markdown" 
    # Exact technical instructions. No narrative fluff.
    # e.g., "Implement quadratic bezier curve math inside the render function of CustomEdge."
  
  # Computable Validation
  pre_conditions:
    # Commands the agent runs before starting to ensure environment health
    - command: "npm run lint"
      expected_exit_code: 0
      
  acceptance_criteria:
    # Commands the agent runs after completing code modification to prove success
    - command: "npm test -- test/CanvasEdge.spec.ts"
      expected_exit_code: 0
    - command: "tsc --noEmit"
      expected_exit_code: 0
      
  # Relational
  blocked_by: "Array<UUID>" # Sibling stories
```

## Summary of the Paradigm Shift
1. **Zero Empathy:** Drop the "As a..." syntax. The AI doesn't care about user personas; it cares about variables and DOM elements.
2. **Computable Verification:** Replace "Verify the button looks good" with "Run the visual regression script and expect a 0% delta."
3. **Rigid Blast Radiuses:** AI agents lack human intuition for what *not* to touch. The "Out of Scope" and "Architectural Invariants" fields are arguably more important than the task instructions themselves.
