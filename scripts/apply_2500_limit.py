import os

out_dir = "docs/stories"

def modify_file(filename, replacements):
    path = os.path.join(out_dir, filename)
    if not os.path.exists(path):
        return
    with open(path, "r") as f:
        content = f.read()

    for target, injection in replacements.items():
        if target in content and injection not in content:
            content = content.replace(target, target + "\n" + injection + "\n")
            
    with open(path, "w") as f:
        f.write(content)

# Inject into 05_canvas_engine.md as a new story limit
modify_file("05_canvas_engine.md", {
    "## [FEATURE] 4.3: Node Spawning": """## [FEATURE] 4.3: Node Spawning

### [STORY] 4.3.0: 2500 Node Hard Cap (Performance Guardrail)
* **Target:** `src/hooks/useNodeCountLimit.ts`
* **Directive:** Export a hook that tracks total node count. If `total >= 2500`, disable all Add buttons, Radial Spawns, and MCP creation APIs. Show persistent warning toast: "Workspace at maximum capacity (2500 Nords)."
* **Ref:** `10_technology_and_infrastructure.md` (Node Limits)
* **AC:** Reaching exactly 2500 nodes visibly disables creation UI. Attempting to spawn node 2501 via API rejects with 422 limit error.
"""
})

# Update degradation story in 13_animations_and_perf.md to scale accordingly
path13 = os.path.join(out_dir, "13_animations_and_perf.md")
with open(path13, "r") as f:
    c = f.read()
    c = c.replace("Large Graph Degradation (500+ Nodes)", "Large Graph Degradation (1500+ Nodes)")
    c = c.replace("At 500+ visible nords:", "At 1500+ visible nords:")
    c = c.replace("With 500 nodes:", "With 1500 nodes:")
    c = c.replace("With 500 nords:", "With 1500 nords:")
with open(path13, "w") as f:
    f.write(c)

print("Applied 2500 node limitations.")
