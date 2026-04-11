# Nards: Project Admin, Templates & Onboarding

## 1. Project Initialization Flow
When initiating a new workspace, users progress through a strict creation flow to establish database parameters before reaching the live canvas.
* **Step 1: Project Naming & Top-Level Meta:** Assign name and description.
* **Step 2: Temporal Axis Selection (Snapshot Typology):** Time/state tracking must be selected.
  * *Standard Snapshots (Event-Driven):* Manual keyframes (e.g., "Draft 1", "Scene 4"). Ideal for Storyboarding, RAG mapping, non-linear creative work.
  * *Dated Snapshots (Chronological):* Tied strictly to a calendar/sprint cycle. Ideal for OKRs, Project Management.
* **Step 3: Template Selection (Schema Injection):** Choose a pre-built framework from the Template Library or select a Blank Canvas to build custom structures.

## 2. Template Hierarchy & Sample Data
To prevent user confusion, templates are strictly divided:
* **Component Templates (Nards & Lines):** Metadata schemas (e.g., "Standard Task"). They dictate color, shape, and data fields, but contain no user content.
* **Project Templates:** A pre-packaged bundle of Component Templates and pre-configured Lens settings.
* **Sample Data Injection:** Users can toggle "Load with Sample Data". The engine populates the canvas with a pre-built, fully tethered mock-graph so the user can immediately interact with the physics engine and see Lens transitions.

## 3. Global Schema Management (The Palettes)
Entity and Tether schemas are not siloed within individual projects, guaranteeing cross-organization consistency.
* **Workspace-Level Libraries:** The "Nard-Builder" and "Line Library" exist globally.
* **Project Application:** Inside a project, users access a "Nard Palette" and "Connections Palette" filtering in down the global templates. Updating a template globally propagates the schema changes across all affiliated projects.

## 4. Standard Template Library (Go-To-Market Workflows)
Four initial Go-To-Market templates demonstrate the engine's versatility, answering the "blank canvas" problem.

### Template 1: Strategic Alignment (OKRs)
* **Concept:** Visualizing company goals and preventing "orphan" work.
* **Entities:** Objectives, Key Results, Initiatives.
* **Tethers:** Alignment / Contribution.
* **Mechanic:** Initiatives must physically tether to Key Results. Disconnected (orphan) work floats to the edges of the canvas, immediately highlighting rogue projects.

### Template 2: Narrative Geometry (Storyboarding)
* **Concept:** Mapping emotional/physical geometry using Snapshots as scenes.
* **Entities:** Characters, Props, Settings, Plot Points.
* **Tethers:** Emotional Tension, Physical Proximity, Alliance.
* **Mechanic:** Users duplicate Snapshots to move chronologically, dragging characters to dynamically update narrative tension in each scene.

### Template 3: Multi-Dimensional Project Management
* **Concept:** View identical project data through different operational lenses without altering entities.
* **Entities:** Tasks, Bugs, Milestones, Team Members.
* **Tethers:** Blockers (Dependencies), Assignments.
* **Mechanic:** Toggling Tether visibility reorganizes the canvas from an "Assigned To" cluster into a linear "Blocker" sequence dynamically via physics.

### Template 4: Visual Vector RAG (AI Knowledge Mapping)
* **Concept:** Demystify AI retrieval through a 2D spatial interface mapping high-dimensional vector embeddings.
* **Entities:** Document Chunks, Queries, AI Agents.
* **Tethers:** Semantic Similarity (Cosine Distance).
* **Mechanic:** When a Query Nard is placed, relevant Document Chunks physically snap tighter. Users visually audit / manually tweak the RAG context window by dragging documents in or out of the Query's gravity well.

## 5. Onboarding Flow (Progressive Complexity)
* **First Nard:** Create the first item natively.
* **First Line:** User defines first relationship manually ("Depends on", "Is Led By").
* **Spatial Definition:** User explicitly tells the system what distance means for that line ("Closer means more important").
* **The First Drag:** User drags Nard B towards A, watching the raw mathematical data entry occur via visual spatialization.
