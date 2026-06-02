/**
 * Captures the full MCP payloads sent to the LLM and writes them to a markdown doc.
 * Run: npx tsx --env-file=.env src/scripts/capture-llm-payload.ts
 */
import * as mcpRepo from '../repositories/mcpSessions.js';
import * as goalsRepo from '../repositories/goals.js';
import * as projectsRepo from '../repositories/projects.js';
import { query, pool } from '../db.js';

const PROJECT_ID = '011097d1-c383-4662-aa7c-84c861a4dec1';
const SESSION_ID = 'aaaaaaaa-0000-0000-0000-000000000001';

// Persona IDs
const PERSONAS = {
  priya:  '5c845b9a-13df-4426-ab45-dccdc9ee6b7e',
  marcus: '9ead317a-b3bb-420d-a864-95fe9027273e',
  elena:  '93355247-f809-4679-ba46-8485b35b31b5',
};

async function captureHorizon(label: string): Promise<string> {
  const horizon = await mcpRepo.getSessionHorizon(SESSION_ID);
  return `### ${label}\n\n\`\`\`json\n${JSON.stringify(horizon, null, 2)}\n\`\`\`\n`;
}

// ── Protocol Builder (copied from toolDispatch.ts for standalone capture) ──
function buildProtocol(
  project: { name?: string | null; purpose?: string | null; mcp_system_prompt?: string | null; mcp_welcome_message?: string | null; project_mode?: string | null } | null,
  horizon: mcpRepo.SessionHorizon,
): Record<string, unknown> {
  const mode = project?.project_mode || 'collect';

  const modeOverview: Record<string, string> = {
    explore: 'You navigate a knowledge graph via MCP tools. Your role is to guide and discuss — help the user explore their project, understand relationships, and discover insights.',
    collect: 'You navigate a knowledge graph via MCP tools. Nords drive the conversation — each nord IS a topic, and its connections to neighbors tell you what to explore next.',
    guided: 'You navigate a knowledge graph via MCP tools. Nords drive the conversation — each nord IS a topic, and its connections to neighbors (weighted by your persona) tell you what to explore next.',
  };

  return {
    overview: modeOverview[mode] || modeOverview.collect,
    project: {
      name: project?.name || null,
      purpose: project?.purpose || null,
      mode,
      instructions: project?.mcp_system_prompt ? project.mcp_system_prompt.slice(0, 300) + '...' : null,
    },
    welcome_message: project?.mcp_welcome_message ? project.mcp_welcome_message.slice(0, 200) + '...' : 'On your first turn, greet the user warmly.',
    persona: horizon.persona
      ? (() => {
          const parts = [
            `You are operating as "${horizon.persona.name}".`,
            horizon.persona.primary_motivation ? `Your primary motivation: ${horizon.persona.primary_motivation}` : null,
            horizon.persona.voice_and_tone ? `Voice & tone: ${horizon.persona.voice_and_tone}` : null,
          ].filter(Boolean);

          if (horizon.persona.guardrails && horizon.persona.guardrails.length > 0) {
            parts.push('GUARDRAILS:');
            for (const g of horizon.persona.guardrails) {
              const prefix = g.mode === 'must' ? '✅ MUST' : g.mode === 'never' ? '🚫 NEVER' : '⚡ PREFER';
              parts.push(`  ${prefix}: ${g.text}`);
            }
          }

          if (horizon.persona.mental_models && horizon.persona.mental_models.length > 0) {
            parts.push('Mental models:');
            for (const m of horizon.persona.mental_models) {
              parts.push(`  • ${m.name}: ${m.body}`);
            }
          }

          return parts.join('\n');
        })()
      : null,
    navigation: {
      verbs: 'Connection verbs encode causality. Use verbs to infer sequencing.',
      suggested_next: 'Ranked list of connected nords ordered by persona-weighted score.',
    },
    data_collection: {
      obligation: 'Save data when the user provides it.',
      save_immediately: 'Save EACH value as soon as you learn it.',
    },
  };
}

async function main() {
  // Ensure test session exists
  await pool.query(`
    INSERT INTO mcp_sessions (id, project_id, persona_id, current_nord_id, status)
    SELECT $1, $2, $3,
      (SELECT id FROM nords WHERE project_id = $2 AND deleted_at IS NULL LIMIT 1),
      'active'
    WHERE NOT EXISTS (SELECT 1 FROM mcp_sessions WHERE id = $1)
  `, [SESSION_ID, PROJECT_ID, PERSONAS.priya]);

  let md = `# 🔍 What the LLM Sees — MCP Tool Payloads\n\n`;
  md += `> **Captured**: ${new Date().toISOString()}\n>\n`;
  md += `> This document shows the actual JSON payloads the LLM receives through MCP tool responses.\n> Each section represents a different tool call or persona lens.\n\n---\n\n`;

  // ── 1. Briefing ──
  const [dictionary, horizon, goals, project] = await Promise.all([
    mcpRepo.getProjectDictionary(PROJECT_ID),
    mcpRepo.getSessionHorizon(SESSION_ID),
    goalsRepo.findSessionGoals(SESSION_ID, PROJECT_ID),
    projectsRepo.findById(PROJECT_ID),
  ]);

  const dictSummary = {
    nord_types: (dictionary as any).nord_types?.map((t: any) => ({ id: t.id, name: t.name, properties_count: t.properties_schema?.length ?? 0 })),
    connection_types: (dictionary as any).connection_types?.map((t: any) => ({ id: t.id, name: t.name, verb: t.verb })),
    personas: (dictionary as any).personas?.map((p: any) => ({ id: p.id, name: p.name })),
  };

  md += `## 1. \`nords_get_briefing\` — Cold Start Payload\n\n`;
  md += `> **Called once** at session start. Contains: dictionary (ontology), horizon (position), goals, and protocol (behavioral rules).\n\n`;

  md += `### 1a. Dictionary (Project Ontology)\n\n`;
  md += `The dictionary defines what types of things exist in the graph.\n\n`;
  md += `\`\`\`json\n${JSON.stringify(dictSummary, null, 2)}\n\`\`\`\n\n`;

  md += `### 1b. Protocol (Behavioral Rules)\n\n`;
  md += `This is the instruction set the LLM follows. It's generated from the project mode, persona, and guardrails.\n\n`;
  const protocol = buildProtocol(project, horizon);
  md += `\`\`\`json\n${JSON.stringify(protocol, null, 2)}\n\`\`\`\n\n`;

  md += `### 1c. Goals\n\n`;
  md += `Active goals with their variable bindings and completion state.\n\n`;
  md += `\`\`\`json\n${JSON.stringify(goals, null, 2)}\n\`\`\`\n\n`;

  md += `### 1d. Project Metadata\n\n`;
  md += `\`\`\`json\n${JSON.stringify({
    name: project?.name,
    purpose: project?.purpose,
    mode: project?.project_mode,
    welcome_message: project?.mcp_welcome_message?.slice(0, 200) + '...',
  }, null, 2)}\n\`\`\`\n\n`;

  md += `---\n\n`;

  // ── 2. Horizon as Priya ──
  md += `## 2. \`nords_get_horizon\` — Dr. Priya Sharma's Lens\n\n`;
  md += `> The horizon shows the LLM its **current position**, **neighbors** (sorted by persona weights), **suggested_next**, and **remaining work**.\n\n`;
  md += await captureHorizon('Horizon: Dr. Priya Sharma (Regulatory)');
  md += `\n---\n\n`;

  // ── 3. Switch to Marcus ──
  await mcpRepo.updateSessionPersona(SESSION_ID, PERSONAS.marcus);
  md += `## 3. \`nords_get_horizon\` — Marcus Cole's Lens\n\n`;
  md += `> Same graph position, different persona. Notice how **suggested_next** and **persona_bias** values change.\n\n`;
  md += await captureHorizon('Horizon: Marcus Cole (Engineering)');
  md += `\n---\n\n`;

  // ── 4. Switch to Elena ──
  await mcpRepo.updateSessionPersona(SESSION_ID, PERSONAS.elena);
  md += `## 4. \`nords_get_horizon\` — Elena Vasquez's Lens\n\n`;
  md += `> Elena's product-focused weights reorder the suggested path differently.\n\n`;
  md += await captureHorizon('Horizon: Elena Vasquez (Product)');
  md += `\n---\n\n`;

  // ── 5. Tools reference ──
  md += `## 5. MCP Tool Reference\n\n`;
  md += `| Tool | Purpose | When Called |\n`;
  md += `|------|---------|------------|\n`;
  md += `| \`nords_get_briefing\` | Cold start — dictionary + horizon + goals + protocol | First turn only |\n`;
  md += `| \`nords_get_horizon\` | Current position + weighted neighbors + completion % | After every navigation |\n`;
  md += `| \`nords_navigate\` | Navigate by name, type, or UUID — auto-resolves traverse vs jump | When advancing the conversation |\n`;
  md += `| \`nords_get_nord\` | Get nord details by UUID — also updates position | When needing specific nord details |\n`;
  md += `| \`nords_update_session_variables\` | Save a project-level variable value | When user provides information |\n`;
  md += `| \`nords_switch_persona\` | Change the active persona lens | When nudge suggests it |\n`;
  md += `| \`nords_visit_nord\` | Log a visit event with before/after | When inspecting a nord |\n`;
  md += `| \`nords_get_session_state\` | Full session dump (position, history) | Debugging |\n`;
  md += `| \`nords_get_dictionary\` | Full project ontology | Rarely needed after briefing |\n`;
  md += `| \`nords_get_goals\` | All goals + variable bindings | Check goal status |\n`;
  md += `| \`nords_get_graph\` | Full graph (all nords + connections) | Large payload — rarely used |\n`;
  md += `| \`nords_get_incomplete_nords\` | Nords with unfilled required properties | Progress check |\n`;
  md += `| \`nords_reset_session\` | Abandon current session + start fresh | Reset |\n`;

  // Write
  const fs = await import('fs');
  const outPath = '/Users/danielcrowder/.gemini/antigravity-ide/brain/08f66146-1b82-4a37-9bf1-1ff3cf16c981/llm_payload_capture.md';
  fs.writeFileSync(outPath, md);
  console.log(`✅ Written to: ${outPath}`);

  // Cleanup
  await pool.query('DELETE FROM mcp_session_nords WHERE session_id = $1', [SESSION_ID]).catch(() => {});
  await pool.query('DELETE FROM mcp_session_variables WHERE session_id = $1', [SESSION_ID]).catch(() => {});
  await pool.query('DELETE FROM mcp_traversals WHERE session_id = $1', [SESSION_ID]).catch(() => {});
  await pool.query('DELETE FROM mcp_sessions WHERE id = $1', [SESSION_ID]);
  console.log('🧹 Test session cleaned up');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
