# Nords: Human-AI Collaboration via MCP

## 1. AI as Consumer (Graph Analysis)
AI reads the graph to provide insights. The AI can execute natural language queries (e.g., "Show me everything that influences the Q3 launch") by interpreting intent and routing via MCP. Capabilities include:
* Graph Analysis, Cluster summarization, Status reporting, Path/Gap detection.
* **Tension Detection:** AI analyzes the graph to flag contradictions — nords that have opposing spatial values across different line types (e.g. tight proximity on "Depends-On" but 0 proximity on "Communication").

## 2. Model Context Protocol (MCP) & Permissions
To enable seamless human-AI collaboration, the platform exposes its spatial database to external LLMs and agents via an MCP Server.
* **Permission Parity:** AI agents possess the exact same operational permissions as standard human users. They can mutate the canvas, alter Nard schemas, and manage Snapshots based on their access token.

## 3. AI Spatial Translation (How the AI "Sees")
Because external LLMs are text-based, the Nords engine cannot just dump x/y coordinates into context. It utilizes a highly optimized Dual-Payload translation. Every time the AI reads the canvas, it receives:
* **The Semantic Layer (Mermaid.js):** The backend compiles active Nords and Tethers into a Mermaid string. This leverages the LLM's native training to grasp topology, dependencies, and flow instantly.
* **The Spatial Layer (JSON):** A structured JSON array providing explicit schemas, Kanban matrix buckets, and the exact 0.0 to 1.0 normalized value of all active Tethers.

## 4. The AI Traversal Architecture (How the AI Walks)
*Anthropic's MCP Golden Rule: Progressive Disclosure.* Avoid dumping infinite JSON into context.

### 4.1 The Nords URI Scheme (Resources):
Static payload resources:
* `nords://[workspace]/projects` (List projects)
* `nords://[workspace]/templates` (Global Schemas)
* `nords://[project]/snapshots/[id]` (Historical keyframes)

### 4.2 The Semantic Dictionary (Step Zero Resource):
Before accessing topology, the AI pulls `nords://[project]/semantic_dictionary`. This resource acts as the "Rulebook" containing Project Meta, Nard Lexicon, and Tether definitions. The AI deduces the specific qualitative meaning of the workspace *before* walking the data. If the user invokes a "Blank Canvas", the AI operates gracefully on minimal context without forcing heavy rigid deductions.

### 4.3 Progressive Traversal Tooling:
* `get_macro_topology(args)`: The "Map". Returns highly compressed Mermaid diagram.
* `read_nard_detail(args)`: The "Magnifying Glass". Full markdown and specific fields for a node.
* `explore_neighborhood(args)`: The "Flashlight". Returns a Dual-Payload radius outward from a target node.
* `calculate_spatial_delta(args)`: Compares 0.0-1.0 shifts across snapshots automatically.

### 4.4 The AI Traversal Loop (System Prompt Mandate)
MCP injects this prompt wrapper to the connected agent:
* **Step 0 (Semantic Deduction):** Read Semantic Dictionary to understand schemas and line implications.
* **Step 1 (Macro Topology):** Run `get_macro_topology`.
* **Step 2 (Targeted Discovery):** Identify targets and `read_nard_detail`.
* **Step 3 (Micro Traversal):** Trace specific vectors using `explore_neighborhood(depth: 1)`.

## 5. Spatial Manipulation & Autonomous Actions (How the AI "Acts")
AI agents act as multiplayer co-creators.
* **Autonomous Graph Mutation:** Spawning Nords, establishing and severing Tethers, updating metadata.
* **Real-Time Physics Interaction:** When an AI updates the 0.0-1.0 value of a Tether natively, it triggers the force-directed physics engine on the user's screen — visually animating the canvas live.
* **Temporal Autonomy:** AI agents can spawn and lock Snapshots autonomously.

## 6. AI Context Window & State Management
* **Default to Live State:** AI active context defaults exclusively to the "Live Canvas State".
* **Just-In-Time Refreshing:** Before the AI executes a physical movement via write tool, the MCP Server auto-refreshes the Dual-Payload array so the AI acts on real-time coordinates.
* **Snapshot Retrieval:** The AI only loads historical Snapshots when directed vs. keeping them in context memory.

## 7. Nard DNA (Portable Context URLs)
Every nard has a unique URL. For an AI tool handling the URL via MCP, it dumps a massive context-bomb payload including the single Nard details, the 1st degree neighborhood arrays, spatial distances, and textual connection descriptions immediately to the local chat stream. It acts as the viral loop wrapper for PMs dropping knowledge bits into IDEs.

## 8. The Gravity Summary (Always-On AI Insight)
A single button in the Viewport Header — **"Summarize This View"** — takes the current visible canvas state (respecting active Lens filters and zoom level) and generates a natural-language paragraph via MCP:
* *Example output:* "This project has 47 active tasks. 12 are blocked. The Marketing cluster has drifted 40% further from Engineering since last week's snapshot. 3 initiatives are orphaned."
