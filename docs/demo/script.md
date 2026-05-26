# Nords — Talk Track Script

> **Read this out loud. Every line is exactly what you say.**
>
> `[BRACKETS]` = what you do on screen. Don't read these.
>
> `...` = pause. Let it breathe.
>
> **Total runtime: ~3 minutes**

---

## THE HOOK (0:00 – 0:15)

You know what happens every single day in every company using AI?

Someone copies their Kanban board... pastes it into ChatGPT... and says, "Help me prioritize this."

And the AI says... "Based on the information provided..."

Because it has no idea what's connected to what. What's blocked. What matters. It has no map.

...

So we built one.

`[NORDS LOGO — "Map Knowledge. Wire Meaning. Deliver Expertise."]`

---

## THE CANVAS (0:15 – 0:45)

`[Open Pulse Sense project. Full canvas visible. ~60 cards.]`

This is Nords. You're looking at a medical device team building a continuous glucose monitor.

Every card you see is a typed data object — requirements, risks, test cases, team members. Every line between them is a typed relationship... with a real value.

`[Zoom in slowly to a Risk card. Show the property sheet.]`

This risk — "battery thermal runaway" — has a severity of 4, a probability of 1, and a mitigation strategy. It's connected to a requirement... through a relationship called "Mitigates."

Now watch this.

`[Drag the Risk card closer to the Requirement.]`

I just dragged it closer. And the distance value changed. From 0.6... to 0.3. The stage label updated from "Controls"... to "Monitoring."

I changed the data... by dragging a card.

That's the idea. Distance... is data. And the AI reads these exact same values.

---

## BOARD VIEW (0:45 – 1:05)

`[Click Board View.]`

Now — same project. Board view.

`[Show Design Control Phase columns.]`

These columns? They're the FDA design control waterfall. User Need... Design Input... Verification... Validation... Transfer to Production. Generated from one relationship type. No setup.

`[Drag a Test Case card from "Protocol Ready" to "Tested".]`

Drag a card to advance it. The value updates everywhere — the canvas, the AI session, the goals. Everywhere.

But here's the thing.

`[Click the dimension dropdown. Switch to "Blocks".]`

Switch the dimension... and the same cards rearrange by what's BLOCKING what.

`[Switch to "Assigned To".]`

Switch again — now you see capacity. Marcus has seven items. He's overloaded. You can see that... in one click.

Every relationship type you create... is already a board. You never configure anything.

---

## PERSONA LENS (1:05 – 1:30)

`[Click Persona Lens.]`

Five people work on this device. They need to see five different things.

`[Click Dr. Priya Sharma — Regulatory.]`

This is Dr. Sharma. VP of Regulatory Affairs. Watch what happens.

`[Heatmap renders. Risks and regulatory items snap to center.]`

Risks... submission blockers... traceability gaps — they snap to the center. Architecture decisions, team assignments — they fade.

She sees what she needs to see. Without a filter. Without a dashboard. The graph reshapes around her priorities.

`[Click Marcus Cole — Engineering.]`

Now Marcus. Lead Systems Engineer.

`[Graph reshapes. Subsystems and architecture pull to center.]`

Completely different map. Same sixty-four cards. He sees architecture, interfaces, failure surfaces.

`[Quick click Sarah Kim — Clinical.]`

Sarah — Clinical Affairs.

`[Clinical protocols and patient-facing items center.]`

Clinical endpoints. Patient data. Study protocols.

Same project. Three people. Three completely different maps.

And when AI adopts one of these personas... it doesn't just see differently. It *thinks* differently. It *talks* differently.

---

## GOALS (1:30 – 1:50)

`[Click Goals view. Show the DAG.]`

Now — goals.

These aren't status labels you toggle in a meeting. They're bound to actual data in the graph.

`[Point to the DAG — 6 goals, prerequisite edges visible.]`

This is the path to FDA submission. Six goals. A dependency chain. You can't submit until verification is complete. You can't verify until requirements are locked AND risk analysis is done.

`[Click "Risk Analysis Complete" — show 75% complete.]`

Risk Analysis is at seventy-five percent. Two risk items are missing mitigation strategies. The goal knows this... because it's reading the properties.

`[Click "Verification Complete" — show BLOCKED.]`

Verification is blocked. Not because someone marked it blocked. Because its prerequisite... isn't finished yet.

The data IS the status. No ceremonies. No judgment calls. Computed.

---

## THE AI SESSION (1:50 – 2:40)

`[Open Preview Chat. Dr. Sharma persona. Guided mode.]`

OK. Here's where it all comes together.

When AI connects to this project, it doesn't get a text dump. It gets a session. A position in the graph. A persona. And a live view of what's around it — what's incomplete, what's blocked, what goals it can advance.

We call that the Horizon.

`[Click New Session. AI greeting appears with full context awareness.]`

Look at that first message. It already knows. 510(k) requires four upstream goals. Risk Analysis is at seventy-five percent. Two items need mitigation. It's not guessing. It read the graph.

`[Type: "What's blocking verification?"]`

I'll ask it — what's blocking verification?

`[AI responds, traverses the graph, identifies the specific gap.]`

It traversed the dependency chain. Found the specific requirement missing traceability. Told me exactly what to fix.

Now watch it work.

`[AI navigates to Risk #5 — adhesive contact dermatitis. Asks about mitigation.]`

It found a risk with no mitigation strategy. Severity 3, probability 4. And it's asking me the right question.

`[Type a mitigation answer. AI fills the property. Goal progress updates.]`

I answered. It saved the data. And the goal... just moved from seventy-five to eighty-seven percent.

`[Toggle Dev Mode ON. Show tool call timeline.]`

And if you want to see under the hood... Dev Mode. Every tool call. Every argument. The full system prompt with persona weights and goal bindings.

`[Flash the system prompt tab. Flash the tool call sequence.]`

No black box. You see exactly what the AI sees, why it said what it said, and every step it took to get there.

`[Switch back to Canvas. Show the Risk card has animated to a new position.]`

And look — back on the canvas... the card moved. The AI updated a value, and the physics engine animated the graph.

The AI didn't summarize my project. It worked... in it.

---

## THREE MODES (2:40 – 2:50)

`[Show Project Settings → Mode selector.]`

One more thing.

Three project modes. One dial for how structured you want the AI to be.

`[Flash each mode card.]`

Explore — open canvas, no tracking. Think of it as research mode.

Collect — structured data capture with completion tracking. Interview mode.

Guided — full goal orchestration with prerequisites, gates, and sessions that end when the mission is complete. This is what you just saw.

Start exploring. Start collecting. Start shipping.

---

## THE CLOSE (2:50 – 3:00)

`[Pull back to full canvas. Slow zoom out.]`

Your AI has been guessing long enough.

Give it a map.

`[Canvas blurs. Logo and byline fade in.]`

Nords. Map Knowledge. Wire Meaning. Deliver Expertise.

`[Beat.]`

Free to start. nords.dev.

`[Black.]`

---

## DELIVERY NOTES

**Pacing:** This is NOT a feature tour. It's a story with a reveal. The hook sets up a problem everyone recognizes. The canvas is the "wait, what?" moment. Board and Persona are "oh, that's smart." Goals build tension. The AI session is the climax — the payoff of everything before it. Three Modes is the denouement. The close is the mic drop.

**Tone:** Confident but not aggressive. You're showing someone something you genuinely love. Steve Jobs energy is not hype — it's *conviction*. You believe this is better. You're proving it.

**Pauses:** The script has natural breath points marked with `...`. USE THEM. The most powerful moments are the ones where you let the demo speak. Drag the card. Let the number change. Say nothing for a beat. Then explain what just happened.

**Speed:** Scenes 1-4 move quickly — you're building momentum. Scene 5 (AI session) slows down. This is where you let the viewer absorb. Don't rush the goal event. Don't rush Dev Mode. Let the viewer see the data change.

**Voice:** Conversational. Like you're showing a friend. Not presenting to a boardroom. Drop the "As you can see..." and "What I'd like to show you..." fillers. Just talk.

**Music:** Low ambient electronic underneath. Builds slightly during the persona switches. Swells during the AI session reveal. Drops to silence for the close.
