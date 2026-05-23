# Access Tokens

> Per-project authentication tokens that let external MCP clients — Claude, Cursor, custom agents — connect to your Nords project securely.

---

## Overview

Access Tokens enable **external MCP clients** to connect to a Nords project. Any tool that supports the Model Context Protocol — Claude Desktop, Cursor, custom-built agents — can authenticate using a project-scoped token and interact with the graph through the same session-based protocol used by [[Preview Chat]].

Tokens are designed with security as a first principle: they're scoped to a single project, hashed before storage (SHA-256), shown exactly once at creation, and revocable immediately from Project Settings.

---

## The Problem

- **Sharing AI access means sharing credentials or building custom auth.** When a team wants multiple AI tools to access their project data, they face a choice: share a single set of credentials (security risk) or build a custom authentication layer for each integration (engineering overhead). There is no standard, per-tool token model out of the box.
- **No granularity between "full access" and "no access."** Most tools offer binary permissions — either the AI can do everything or nothing. Teams need the ability to give some agents read-only access while granting others full mutation rights, scoped per-project with independent revocation.
- **Compromised credentials have blast radius.** A leaked API key in a typical setup exposes all projects, all data, all operations. Per-project scoping, one-time display, and instant revocation limit the blast radius of any single compromise.

---

## User Stories

- **As a developer,** I want to generate an access token so I can connect my IDE's AI agent to our Nords project and have it navigate the knowledge graph.
- **As a project admin,** I want to revoke a token immediately if a team member leaves or a token is compromised, without affecting other tokens.
- **As a security-conscious team,** I want tokens to be hashed at rest so that a database breach doesn't expose live credentials.
- **As an integration builder,** I want a standard authentication mechanism that works with any MCP-compatible client, not a custom auth flow.
- **As an org admin,** I want each token scoped to a single project so that a compromised token can't access other projects.

---

## Key Capabilities

| Capability | Description |
|------------|-------------|
| **Per-project scoping** | Each token is bound to a single project. No cross-project access — a token for Project A cannot read or modify Project B. |
| **Scope levels** | Tokens support Read-Only, Read-Write, and Admin scopes — matching human permission levels (Permission Parity). See [[AI Integration]] for how scope maps to tool tiers. |
| **One-time display** | The plaintext token is shown exactly once at creation. It cannot be retrieved again — if lost, generate a new one. |
| **SHA-256 hashing** | Tokens are hashed before storage. The server validates by hashing the presented token and comparing against stored hashes. The plaintext is never persisted. |
| **Instant revocation** | Tokens can be revoked from Project Settings → Access Tokens. Revocation takes effect immediately — the next MCP request with that token is rejected. |
| **Audit readiness** | Revoked tokens are soft-deleted for audit trail purposes. Creation and revocation events are logged. |

---

## Key Interactions

### Generating a Token
1. Navigate to **Project Settings → Access Tokens**
2. Click **"Generate Token"**
3. The server creates a cryptographically random token, stores its SHA-256 hash, and returns the plaintext
4. **Copy the token immediately** — it will never be shown again
5. Paste the token into your external MCP client's configuration

### Revoking a Token
1. Navigate to **Project Settings → Access Tokens**
2. Find the token in the list (identified by creation date and a truncated hash prefix)
3. Click **"Revoke"**
4. The token is immediately invalidated — all future MCP requests using it will be rejected

### Using a Token in an External Client

Configure your MCP client with:
- **Server URL**: Your Nords project's MCP endpoint
- **Authentication**: Bearer token (the plaintext token you copied at creation)

The client connects via MCP and receives the same tools, sessions, and Horizon as [[Preview Chat]].

---

## Technical Notes

- Token generation uses Node.js `crypto.randomBytes` (256 bits of entropy).
- Tokens are stored as SHA-256 hashes — the server never stores or logs the plaintext after initial display.
- Token authentication is checked before any MCP tool execution — unauthenticated requests receive no schema or tool information.
- Revoked tokens are soft-deleted (marked as revoked with a timestamp) for audit trail purposes.
- Multiple active tokens can exist per project simultaneously for different team members or integrations.
- Token scope (Read-Only, Read-Write, Admin) controls which [[MCP Integration]] tool tiers are accessible — matching the Permission Parity principle where AI agents have the same permission model as human users.
