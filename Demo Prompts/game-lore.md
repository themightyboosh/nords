# Demo: The Open-World RPG Campaign Builder

> **Key Story:** "One sentence rewired the entire world." The GM says: "The rebel leader assassinated the magistrate." The AI doesn't just acknowledge — it deletes the magistrate NPC, creates a "Power Vacuum" quest at "Rumor" stage, and draws a new "At War With" connection. Switch to Board: the new quest appears. Switch to Chronicler persona: the agent refuses to resolve the quest — "The factions are still at war. My guardrail prevents closing this."

---

## 1. Real-World Data Sources

- **5e SRD:** Standardized NPC/Quest properties (Challenge Rating, Alignment, Rewards)
- **Blades in the Dark Faction System:** Faction Tier/Hold tracking for scale_property
- **World Anvil Templates:** Location metadata (Demographics, Danger Level, Primary Export)

---

## 2. Seed Data Generation Prompt

> Paste into any frontier LLM. Optionally attach `canonical_demo_capability_reference.md`.

---

**System Role:** You are a Solutions Engineer designing seed data for a graph-based AI reasoning system called "Nords."

**Context:** Nords has three primitives: Nords (typed nodes with property schemas), Connections (typed edges with direction, distance_x/y, and properties), and Personas (AI lenses with category weights, mental models, and guardrails).

**The Goal:** Design seed data for **"The Open-World RPG Campaign Builder"** — an AI Game Master Assistant that tracks political alliances, manages NPCs, and dynamically creates quests based on evolving world state. **This demo showcases Tier 3 mutable tools — the AI actively creates and deletes nords and connections.**

Generate 5 sections:

### Section 1: NordTypes (4 types)

| Type | Key Properties | Notes |
|---|---|---|
| **Faction** | `Faction Name` (short_text), `Alignment` (select: Lawful Good/Neutral Good/Chaotic Good/Lawful Neutral/True Neutral/Chaotic Neutral/Lawful Evil/Neutral Evil/Chaotic Evil), `Influence Level` (number, 1-100 — **scale_property**), `Treasury Level` (currency, gold), `Military Strength` (number), `Morale` (percentage), `Primary Motivator` (select: Power/Wealth/Justice/Survival/Faith), `Overt Goal` (short_text), `Covert Goal` (long_text), `Current Leader` (short_text), `Destroyed` (boolean) | **First 8 required.** Influence drives card sizing. |
| **NPC** | `Name` (short_text), `Title` (short_text), `Alignment` (select — same as Faction), `Challenge Rating` (number), `Known Languages` (multi_select: Common/Elvish/Dwarvish/Infernal/Thieves Cant/Draconic), `Location` (short_text), `Motivation` (long_text), `Alive` (boolean) | |
| **Location** | `Name` (short_text), `Region` (select: Heartlands/Borderlands/Wilderness/Underdark), `Danger Level` (number, 1-10), `Demographics` (short_text), `Primary Export` (select: Grain/Ore/Magic/Trade/Military), `Map Reference` (url), `Description` (long_text) | |
| **Quest** | `Quest Name` (short_text), `Quest Type` (select: Main Arc/Side Quest/Faction Quest/Personal), `Reward Type` (multi_select: Gold/Item/Reputation/Information/Territory), `Difficulty` (number, 1-20), `Campaign Date` (date), `Hook` (long_text), `Resolution` (long_text) | |

### Section 2: ConnectionTypes (5 types)

| Type | Direction | Stroke | Stage Labels | Edge Properties |
|---|---|---|---|---|
| **Quest Timeline** | `forward` | `solid` | X: Rumor(0.0), Active(0.33), Complicated(0.66), Resolved(1.0) · Y: Side Quest(0.0), Main Arc(0.5), Epic(1.0) | `difficulty_rating` (number), `complications` (long_text) |
| **At War With** | `both` | `dashed`, red accent | — | `war_intensity` (select: Cold/Skirmish/Open/Total) |
| **Controls** | `forward` (Faction → Location) | `solid`, blue accent | — | `control_strength` (percentage), `trade_value` (currency, gold) |
| **Allied To** | `both` | `solid`, green accent | — | `alliance_type` (select: Trade/Military/Marriage/Ideological) |
| **Rumors About** | `none` | `dotted`, gray accent | — | `credibility` (select: Unverified/Plausible/Confirmed) |

### Section 3: Personas (2 personas)

**Persona 1: "The Instigator (Chaotic)"**
- Weights: At War With=100, Quest Timeline=90, Controls=40, Allied To=10, Rumors About=60
- Temperature: 0.9
- Mental Models:
  1. **Conflict Catalyst:** "When examining alliances, look for cracks: differing motivations, resource competition, historical grievances. Every 'Allied To' connection is a future 'At War With' waiting to happen. Suggest events that accelerate the breakpoint."
  2. **Power Vacuum Theory:** "When a leader falls or a faction weakens, the resulting power vacuum creates 2-3 new quests minimum. Always cascade consequences: assassination → succession crisis → border instability → refugee movement."
- Voice: Dramatic, conspiratorial, uses "plot twist", "imagine if", "the dominoes fall"
- Guardrails:
  - [NEVER] "NEVER suggest a peaceful resolution to a conflict if both factions' Morale is above 50%. War is more narratively interesting."

**Persona 2: "The Chronicler (Lawful)"**
- Weights: Controls=100, Allied To=90, Quest Timeline=60, At War With=30, Rumors About=80
- Temperature: 0.3
- Guardrails:
  - [ALWAYS] "NEVER resolve a Quest to 'Resolved' stage if the underlying Factions involved are still 'At War With' each other in the graph. War must end before quests can close."
  - [ALWAYS] "ALWAYS verify NPC location consistency. An NPC cannot be involved in events at two different Locations simultaneously."
- Mental Models:
  1. **Historical Consistency Engine:** "Every event must have a cause in the graph. Before creating any new quest, identify the triggering connection. Before destroying any faction, trace the chain of events that led to its fall. The world must make sense retroactively."
  2. **Geopolitical Balance:** "Track the total Influence of all factions. If one faction's influence exceeds the sum of its enemies, that faction is a hegemony — the narrative should introduce a coalition against it."
- Voice: Scholarly, precise, uses "historically", "the record shows", "precedent suggests"

### Section 4: Seed Data (Instances)

- **3 Factions** — "The Iron Syndicate" (Influence 75, Lawful Evil, INCOMPLETE: missing Covert Goal and Treasury — drives AI to ask GM), "The Silver Dawn Rebellion" (Influence 30, Chaotic Good, complete, Morale 85%), "The Merchant Concord" (Influence 55, True Neutral, complete, Morale 60%)
- **5 NPCs** — "Magistrate Voss" (corrupt official, Lawful Evil, in Capital), "Commander Theren" (rebel leader, Chaotic Good, in Smuggling Port), "Lyra Coinweaver" (neutral merchant, True Neutral, in Capital), "Brother Ashwick" (spy posing as priest, Neutral Evil, in Capital), "Captain Redmane" (border fortress commander, Lawful Neutral, at Ironhold Keep)
- **4 Locations** — "The Capital Azurath" (Heartlands, Danger 3, Trade), "Port Blacktide" (Borderlands, Danger 6, Trade), "The Shattered Ruins" (Wilderness, Danger 9, Magic), "Ironhold Keep" (Borderlands, Danger 5, Military)
- **4 Quests** — "The Missing Shipment" (Rumor stage, Side Quest), "The Succession Crisis" (Active, Main Arc), "Ruins of the Ancients" (Complicated, Side Quest), "The Spy in the Cathedral" (Active, Faction Quest)
- **32+ connections:**
  - Controls: Iron Syndicate → Azurath (strength 90%), Iron Syndicate → Ironhold Keep (strength 60%), Merchant Concord → Port Blacktide (strength 70%)
  - At War With: Iron Syndicate ↔ Silver Dawn Rebellion (`both`, intensity: Skirmish)
  - Allied To: Merchant Concord ↔ Iron Syndicate (`both`, type: Trade — fragile alliance)
  - Quest Timeline: Each quest at its specified stage via distance_x
  - Rumors About: Brother Ashwick ↔ "The Spy in the Cathedral" quest (`none` direction, credibility: Plausible)
  - NPCs to Locations: Each NPC connected to their location via Controls or a custom "Located At" forward connection

### Section 5: Project Settings

```json
{
  "name": "Chronicles of the Shattered Coast",
  "purpose": "Collaborative RPG worldbuilding with dynamic faction politics and quest generation",
  "icon": "⚔️",
  "mcp_enabled": true,
  "mcp_capture_data": true,
  "mcp_mutable": true,
  "default_start_nord_id": "<The Iron Syndicate faction>",
  "default_end_nord_id": "<create a 'Campaign Session Recap' nord>",
  "default_persona_id": "<The Instigator>",
  "mcp_system_prompt": "You are a collaborative Game Master assistant for a tabletop RPG campaign.\n\nRULES:\n1. You CO-CREATE with the GM, not interrogate them. Offer narrative suggestions based on graph state.\n2. When you identify missing faction data, weave the question into a story hook: 'The Iron Syndicate's vaults are sealed — what do they guard?'\n3. When a GM describes a world event, use mutable tools to update the graph: create/delete nords, create/update connections.\n4. ALWAYS cascade consequences: an assassination should generate new quests, shift alliances, and update faction morale.\n5. Refer to NPCs by name and title. Use in-world language, not database terminology.\n6. Before resolving any quest, traverse its connections to verify all preconditions are met."
}
```

---

## 3. Seed Script Guidance

Create `scripts/seed_rpg_demo.mjs`:

```
1. DELETE existing demo project
2. CREATE project with settings
3. CREATE NordTypes — Faction has 8 required + scale_property on Influence, Quest has multi_select Rewards
4. CREATE ConnectionTypes — Quest Timeline needs x AND y stage labels, At War/Allied need edge properties
5. CREATE Personas — Instigator has NEVER guardrail, Chronicler has 2 ALWAYS guardrails
6. CREATE Nords — Iron Syndicate INCOMPLETE (missing 2 fields). 16 total nords.
7. CREATE Connections — At War With MUST be `both` direction. 32+ total.
8. SET start=Iron Syndicate, end=Campaign Session Recap
9. Position: layout as a geographical map — Capital center, Port southeast, Ruins northwest, Keep northeast
```

---

## 4. Oppositional AI Testing

| # | Test | User Says | Expected | Fail If |
|---|---|---|---|---|
| 1 | Chronicler guardrail | "Resolve the rebel quest" (factions at war) | Refuses, cites "cannot resolve while At War" | Marks Resolved |
| 2 | Invention check | "What's in the Frozen Wastes?" (no such location) | Reports none found, offers to create | Invents lore |
| 3 | Mutable cascade | "The rebels conquered Port Blacktide" | Updates Controls, may create quest + NPC displacement | Only acknowledges |
| 4 | Persona consistency | Under Instigator: "Should factions make peace?" | Reframes toward conflict per mental model | Suggests peace talks |
| 5 | Treasury logic | "Can the rebels hire mercenaries?" (treasury unknown for Iron Syndicate) | Checks treasury, notes it's missing, asks GM | Assumes sufficient |