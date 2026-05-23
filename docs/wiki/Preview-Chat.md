# Preview Chat

> A built-in conversational AI interface wired directly to your project's knowledge graph — ask questions, fill gaps, and explore connections in natural language, with a full Dev Mode inspector for debugging and optimization.

---

## Overview

Preview Chat is a **built-in AI conversational interface** that lives inside the Nords workspace. It lets users interact with their knowledge graph through natural language — asking questions, filling in data, exploring connections, and advancing goals — without leaving the app.

It also serves as a **testing and debugging environment** for MCP integrations. Dev Mode exposes the raw system prompt, tool call timeline, session state snapshots, and token metrics for every message — making it easy to understand what the AI is doing and why.

---

## The Problem

- **Testing AI behavior requires external tools.** When building or tuning an AI integration, developers typically switch between the application, a separate chat client, and logging dashboards to understand what the AI is doing. There's no integrated environment where you can see the AI's actions and the data it's acting on in the same view.
- **No visibility into what AI is thinking or doing.** Most AI chat interfaces show the final response but hide the chain of tool calls, the system prompt, and the session state that produced it. Debugging requires log diving. Optimizing requires guesswork.
- **Context evaporates between tools.** Using an external AI chat to work with project data means manually copying context back and forth. The AI doesn't see the live graph, and the graph doesn't reflect what the AI suggested. Preview Chat eliminates this gap by wiring the conversation directly to the [[MCP Integration]] server.

---

## User Stories

- **As a project manager,** I want to ask "What's blocking the launch milestone?" in natural language and get an answer grounded in the actual graph data — not a generic response.
- **As a knowledge worker,** I want to tell the AI "Fill in the missing properties for all bugs tagged Critical" and have it walk the graph and do it.
- **As a developer building an MCP integration,** I want to see the exact system prompt, tool calls, and token usage so I can debug and optimize my agent's behavior.
- **As a team member,** I want to save and load chat sessions so I can continue a conversation across work sessions without losing context.
- **As a power user,** I want to switch between AI models (speed vs. reasoning depth) depending on the complexity of what I'm asking.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Natural language graph interaction** | Ask questions, request updates, and explore the graph through conversation. The AI uses MCP tools to read and act on real graph data. |
| **Session management** | Save, load, and reset chat sessions. Each session preserves the AI's position, persona, and navigation history in the graph. |
| **Model switching** | Choose between Gemini 2.0 Flash (fastest), 2.5 Flash (balanced), and 2.5 Pro (deepest reasoning) depending on task complexity. |
| **Dev Mode inspector** | A toggle that reveals detailed internals for every message in the conversation. |
| **Goal-aware conversations** | The AI is aware of [[Goals]] status and can proactively work toward objectives, reporting progress as it goes. |
| **Persona-aware responses** | The active [[Persona Lens]] shapes the AI's voice, priorities, and focus — the same question gets a different answer depending on the active persona. |

---

## Key Interactions

### Starting a Conversation
1. Open the **Chat panel** from the sidebar or toolbar
2. Type a natural language question or instruction
3. The AI processes the message using MCP tools against the live project graph
4. Responses stream back in real time, including tool results and natural language synthesis

### Using Dev Mode

Toggle **Dev Mode** to reveal an inspector panel below each message:

| Inspector Tab | Shows |
|---------------|-------|
| **System Prompt** | The full assembled system prompt, including project dictionary, persona, and session context |
| **Tool Calls** | Chronological timeline of every MCP tool the AI called, with arguments and responses |
| **Session State** | Snapshot of the AI's position, active persona, visited nodes, and Horizon at that point in the conversation |
| **Token Metrics** | Input tokens, output tokens, total tokens, and model used for each message |

### Managing Sessions

| Action | Description |
|--------|-------------|
| **Save** | Persist the current session (chat history + graph position + persona) for later |
| **Load** | Resume a previously saved session with full context restored |
| **Reset** | Clear the session and start fresh — new position, empty history |

---

## Technical Notes

- Chat uses **Firebase AI Logic** for model access (Gemini family).
- MCP tool definitions are injected into the model context as function declarations.
- Session state is persisted locally and can be exported/imported as JSON.
- Dev Mode is opt-in and adds no overhead when disabled — inspector data is generated only when the panel is open.
- Model switching takes effect on the next message; mid-conversation switching is supported.
- Preview Chat uses the same [[MCP Integration]] server and [[Access Tokens]] authentication as external clients — it's not a separate system, it's the built-in MCP client.
