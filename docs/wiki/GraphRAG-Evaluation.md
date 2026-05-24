# Vertex AI & GraphRAG Architecture Evaluation

> **Evaluator:** Senior Vertex AI & GraphRAG Engineer  
> **Context:** Assessment of the Nords platform's data layer and its ability to drive autonomous agent goals.

---

## 1. Architectural Strengths

The current data model exhibits several advanced patterns that place it ahead of naive vector-database RAG implementations.

### Explicit Semantic Topology (Category & Connection Types)
In standard RAG, the AI must infer relationships probabilistically from text chunks. In Nords, the `verb`, `measurement_mode`, and `stage_labels` provide the AI with concrete, mathematical, and semantic directionality. When the agent calls `nords_get_horizon`, it doesn't just see "related nodes," it sees *how* they are related (e.g., "Depends on," "Flows into"). This explicit semantic topology is a gold standard for GraphRAG.

### Persona Weighting (Database-Level Attention Mechanisms)
Graph traversal often suffers from the "lost in the middle" problem, where agents explore irrelevant subgraphs. The `category_weights` on Personas explicitly bias the neighbor sorting returned by `nords_get_horizon`. We are effectively feeding the AI an attention map pre-computed at the database layer. The AI doesn't have to spend tokens figuring out what's important; the database dictates what the current Persona prioritizes.

### Goal-Driven Orchestration (DAGs)
The Goal DAG structure, where goals are bound to specific `nord_id` + `property_name` pairs, transforms vague prompts into deterministic state machines (Active, Pending, Complete). The AI receives this state directly in `nords_get_horizon` and `nords_get_goals`. Furthermore, the auto-emitted `goal_completed` and `goal_activated` events prevent the AI from needing to constantly poll its own completion status, drastically improving token efficiency and agent autonomy.

### Tiered Data Delivery
By separating the ontology (`ProjectDictionary`) from the epistemology or current state (`SessionHorizon`), the architecture prevents context window overflow. The dictionary is loaded once, while the horizon acts as a sliding context window. This is a highly robust GraphRAG pattern.

---

## 2. Gaps & Opportunities for Vertex AI Optimization

While the graph traversal mechanics are excellent, there are specific areas where the data layer is leaving Vertex AI capabilities on the table. Addressing these will bridge the gap between structural data and generative reasoning.

### A. Schema Validation & Tool Constraints
* **The Gap:** The `properties_schema` currently only supports basic types (`string`, `number`, `select`). However, Vertex AI function calling is powered by OpenAPI/JSON Schema. Currently, the AI sees a property called `budget` but doesn't explicitly know from the schema if that implies "monthly" or "annual," nor does it know the acceptable ranges.
* **The Solution:** Enhance `PropertySchema` to include a `description` field and `validation_rules` (e.g., `min`, `max`, `regex`).
* **Impact:** Passing enriched schemas directly into the MCP tool schema for `nords_update_session_nord` would make the tool perfectly self-documenting to the model, drastically reducing AI hallucinations and malformed data writes.

### B. Vector Embeddings (The "RAG" in GraphRAG)
* **The Gap:** The current traversal model is entirely deterministic, relying on edge UUIDs and `nords_query_nords` (keyword matching). If a user provides an unstructured intent ("I need a senior developer with React experience"), the AI cannot mathematically map that intent to the closest nodes.
* **The Solution:** Introduce a `vector_embedding` column on the `nords` table. This embedding would be automatically computed (and kept updated) by a Vertex AI background job, hashing the `title` and `properties` of the nord. Expose a new MCP tool: `nords_semantic_search`.
* **Impact:** Bridges the gap between structured Graph navigation and unstructured conversational intent, allowing the agent to jump across the graph based on semantic meaning rather than just direct edge connections.

### C. Temporal and Contextual Memory
* **The Gap:** The `nords_visit_nord` tool captures `properties_before` and `properties_after` for an audit trail, but the agent lacks a rolling summary of *conversation history* at the data layer. External MCP clients must manage their own chat history, which inevitably truncates over long sessions.
* **The Solution:** Implement a `session_summaries` or `key_insights` array at the Session level. Upon completing a Goal, the agent could be prompted to write a 1-2 sentence synthesized summary of what it learned, saving it to this array.
* **Impact:** Provides the agent with long-term memory across multi-day sessions, preventing it from repeating questions when the raw chat history falls out of the context window.

### D. Escalation Mechanisms & Deadlock Resolution
* **The Gap:** If the agent fails to extract a required property from a user who refuses to answer or changes the subject, it may enter a deadlock state, repeatedly trying to fulfill the same goal.
* **The Solution:** Introduce a `stuck_threshold` (e.g., failed attempts) or an `escalation_path` configuration within the Goal data layer.
* **Impact:** Ensures the autonomous agent can gracefully fail or pivot, maintaining a high-quality user experience.

---

## 3. Conclusion

The structural edge semantics (Categories) and the attention mechanisms (Personas) provide an exceptional foundation for a GraphRAG architecture. To maximize Vertex AI's potential, the immediate priority should be enriching the `PropertySchema` with semantic descriptions and strict validations. Following that, introducing vector embeddings for semantic search will fully realize the platform's capabilities as a state-of-the-art AI orchestration engine.
