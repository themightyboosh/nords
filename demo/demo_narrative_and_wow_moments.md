# Elevating the Demo: Narrative & "Wow" Moments

> A product demo shouldn't just be a walkthrough of features—it needs a compelling narrative arc, visual spectacle, and moments that make the audience lean in. Here is how we take the Proposal Director plan from a "solid technical showcase" to an "unforgettable product demonstration."

---

## 1. Start *In Media Res* (The Setup)

**Don't start with a blank screen.** Starting from scratch forces the audience to watch data entry, which kills momentum.

**The Strategy:** The seed script should generate a workspace that is already alive.
*   **1 Won Proposal:** For historical reference.
*   **1 Lost Proposal:** To show debrief data.
*   **1 Active Proposal (The Crisis):** This is the focus. It's a high-value RFP ("Project Apex") stuck at the **Design Lock** gate.

**The Opening Shot:** Open in **Graph View**. The user sees a complex web of Solution Phases and Resource Allocations. The Opportunity card is huge (scaled by `Win Probability`). But there are pulsing red dashed lines (Blocks) and a Team Member node (Alex Chen, Senior Architect) that is massive (scaled by `Current Utilization` = 110%).

*The narrative is immediately clear: We have a great opportunity, but our star architect is overbooked, and the proposal is blocked.*

## 2. The Three "Jaw-Drop" Moments

These are the carefully choreographed sequences designed to showcase Nords' unique differentiators.

### Wow Moment 1: The Persona Pivot (Visualizing AI Attention)
**The Setup:** The user needs to fix the staffing crisis.
**The Action:**
1. The user opens the Global Dock and switches the persona from **Proposal Director** to **Resource Strategist**.
2. **The Graph Animates:** The audience watches the physics engine physically restructure the graph. The "Proposal Stage" connections fade to the background, and the "Assigned To" and "Skill Match" connections snap to the forefront. Team members physically move closer to the center based on their skill relevance.
**The Takeaway:** "The AI isn't just changing its prompt; it's changing *what it looks at*. You are seeing the AI's mental model shift in real-time."

### Wow Moment 2: The Computed Constraint Tripwire
**The Setup:** The user replaces the overbooked Senior Architect with a Mid-Level Developer and an External Contractor to handle the workload.
**The Action:**
1. The user opens the Detail Drawer for the new External Resource and types in an `Estimated Rate` of $150/hr.
2. Because of **Computed Properties**, the `Line Cost` updates instantly.
3. The `Total Price` on the Proposal Document updates instantly.
4. The `Actual Margin` drops to 22% (below the target of 25%).
5. The MCP Agent instantly chimes in via the chat panel: *"Warning: The new staffing mix has dropped the actual margin to 22%. The Gold Review gate requires a minimum of 25%. I cannot advance this proposal until we adjust hours or increase the blended rate."*
**The Takeaway:** "Nords isn't just a database; it's an active participant that enforces your business rules mathematically and conversationally."

### Wow Moment 3: The Cross-Nord Triangulation
**The Setup:** We need a specific skill (AWS Migration) but our margin is too tight to hire an expensive contractor.
**The Action:**
1. The user asks the agent: *"Find me anyone on the team who has AWS skills, is under 50% utilized next month, and costs less than $120/hr."*
2. The agent uses the **Cross-Nord Query Endpoint** (`GET /nords/query?filter=Skills contains AWS&filter=Current Utilization < 50...`).
3. Within milliseconds, the agent replies with the perfect junior developer who has adjacent skills and capacity. The agent automatically drafts the "Skill Match" connection on the graph.
**The Takeaway:** "The AI has instant, structured access to the entire agency's state. It does hours of resource-management spreadsheet math in two seconds."

## 3. The "Director's Cut" Enhancements

To make the demo feel premium and polished, we should implement these subtle touches:

*   **Scale by Pain:** Set the `scale_property` for Team Members to `Current Utilization`. An overbooked team member should literally look bloated and massive on the canvas, drawing the eye immediately to the problem.
*   **Spectrum Connections for Skill Match:** Use the Spectrum UI for the "Skill Match" connection. Visually show a connection sliding from 0.2 (Weak adjacent skill) to 1.0 (Exact match). It's much more nuanced than a simple binary edge.
*   **The "Won -> Kickoff" Transition:** End the demo by moving the proposal to the final stage. The agent should say: *"Congratulations on the win. I am now severing the 'Proposal Stage' connections and converting all Solution Phases into 'Sprint Epics' for the delivery team."* Show the graph shedding its sales metadata and transforming into a clean project management view.

## 4. The Seed Script Requirements (The Magic Behind the Scenes)

To pull this off seamlessly, the `seed_proposal_demo.mjs` script needs to be meticulously crafted:

1.  **Deterministic Dates:** The script must generate dates relative to `Date.now()` so the demo always feels like it's happening *today* (e.g., "Available From" dates are exactly 3 days from now).
2.  **Deliberate Conflicts:** The seed data must intentionally include the "Alex Chen is overbooked" conflict. The demo relies on this puzzle existing.
3.  **Rich Text Content:** The `Scope Summary` and `Bio` fields shouldn't be "lorem ipsum." Use real-sounding agency jargon ("Enterprise React migration with zero-downtime AWS cutover") so the AI has meaty text to reference.

## 5. Scripting the Walkthrough (The Run Show)

| Minute | Mode | Action | Talk Track |
| :--- | :--- | :--- | :--- |
| **0:00** | Board | Show the 7-stage pipeline. | *"Most CRMs stop here. Cards in columns. But this hides the complexity of resourcing."* |
| **1:30** | Graph | Switch to Graph view. Show the "Project Apex" knot. | *"Underneath, Nords is a spatial graph. We can see immediately that Alex is a bottleneck."* |
| **3:00** | Graph | **WOW MOMENT 1:** Switch to Resource Strategist persona. | *"Watch how the AI changes its focus to solve the staffing problem."* |
| **4:30** | Chat | Ask agent to find alternative staffing. | *"Let's ask the agent to query the graph for a cheaper, available alternative."* |
| **6:00** | Drawer | **WOW MOMENT 2:** Update contractor rate; watch margin tripwire. | *"Nords enforces the business logic. It won't let us submit an unprofitable bid."* |
| **8:00** | Board | Drag the Proposal past the final gate. | *"We fixed the margin. The gate unlocks. We win the deal."* |
| **9:00** | Graph | **WOW MOMENT 3:** The graph transforms for Kickoff. | *"The sales tool just became the delivery tool. No data entry required."* |
