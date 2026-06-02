#!/usr/bin/env npx tsx
/**
 * run-ai-tests.ts — Programmatic AI Test Runner
 *
 * Triggers test scenarios via the REST API, streams SSE progress,
 * generates critiques, then produces a comparative analysis report.
 *
 * Usage:
 *   npx tsx scripts/run-ai-tests.ts [--runs N] [--scenario NAME_PATTERN]
 *
 * Defaults:
 *   --runs 3        Number of runs per scenario
 *   --scenario all  All scenarios, or a substring filter
 */

const API_BASE = 'http://localhost:3000/api';

interface Scenario {
  id: string;
  name: string;
  user_profile: string;
  max_rounds: number;
  stop_on_goal_id: string | null;
  goal_name: string | null;
}

interface RunResult {
  id: string;
  scenario_id: string;
  status: string;
  stop_reason: string | null;
  rounds_completed: number;
  completion_pct: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_latency_ms: number;
  tool_call_count: number;
  synthetic_nps: number | null;
  user_sentiment: string | null;
  hallucination_score: number | null;
  hallucination_details: string | null;
  passed: boolean | null;
  properties_collected: Record<string, unknown>;
  coverage_gaps: Array<{ variable_id: string; name: string }>;
  score: Record<string, unknown>;
  critique: any;
  transcript: any[];
}

// ── Helpers ──

async function fetchJSON<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function getProjectId(): Promise<string> {
  // Find the Pulse Sense CGM project
  const projects = await fetchJSON<any[]>(`${API_BASE}/projects`);
  const project = projects.find(p => p.name?.includes('Pulse Sense'));
  if (!project) throw new Error('Pulse Sense CGM project not found. Run seed-demo first.');
  return project.id;
}

async function getScenarios(projectId: string): Promise<Scenario[]> {
  return fetchJSON<Scenario[]>(`${API_BASE}/projects/${projectId}/test-scenarios`);
}

async function startRun(scenarioId: string): Promise<{ runId: string; streamUrl: string }> {
  return fetchJSON(`${API_BASE}/test-scenarios/${scenarioId}/run`, { method: 'POST' });
}

async function getRun(runId: string): Promise<RunResult> {
  return fetchJSON<RunResult>(`${API_BASE}/test-runs/${runId}`);
}

async function getCritique(runId: string): Promise<any> {
  return fetchJSON<any>(`${API_BASE}/test-runs/${runId}/critique`, { method: 'POST' });
}

function streamRun(runId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/test-runs/${runId}/stream`;
    
    // Use EventSource-like polling since we're in Node
    const pollInterval = setInterval(async () => {
      try {
        const run = await getRun(runId);
        const status = run.status;
        
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          clearInterval(pollInterval);
          if (status === 'failed') {
            console.log(`    ❌ Run failed: ${(run as any).error || 'Unknown error'}`);
          }
          resolve();
        } else {
          process.stdout.write(`    ⏳ Round ${run.rounds_completed}/${(run as any).max_rounds || '?'} | ${run.completion_pct ?? 0}% complete\r`);
        }
      } catch {
        // Run might not be queryable yet
      }
    }, 5000);
    
    // Safety timeout: 15 minutes per run
    setTimeout(() => {
      clearInterval(pollInterval);
      resolve();
    }, 15 * 60 * 1000);
  });
}

// ── Analysis ──

interface RunSummary {
  scenarioName: string;
  profile: string;
  runId: string;
  status: string;
  passed: boolean;
  rounds: number;
  completionPct: number;
  nps: number | null;
  hallucinationScore: number | null;
  sentiment: string | null;
  stopReason: string | null;
  toolCalls: number;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  propertiesCollected: number;
  coverageGaps: string[];
  critique: any;
}

function summarizeRun(scenario: Scenario, run: RunResult): RunSummary {
  const coverageGaps = Array.isArray(run.coverage_gaps)
    ? run.coverage_gaps.map((g: any) => g.name || g.variable_name || JSON.stringify(g))
    : [];

  return {
    scenarioName: scenario.name,
    profile: scenario.user_profile,
    runId: run.id,
    status: run.status,
    passed: run.passed ?? false,
    rounds: run.rounds_completed,
    completionPct: run.completion_pct ?? 0,
    nps: run.synthetic_nps,
    hallucinationScore: run.hallucination_score,
    sentiment: run.user_sentiment,
    stopReason: run.stop_reason,
    toolCalls: run.tool_call_count,
    tokensIn: run.total_tokens_in,
    tokensOut: run.total_tokens_out,
    latencyMs: run.total_latency_ms,
    propertiesCollected: Object.keys(run.properties_collected || {}).length,
    coverageGaps,
    critique: run.critique,
  };
}

function generateReport(summaries: RunSummary[]): string {
  const lines: string[] = [];
  
  lines.push('# AI Test Runner — Comparative Analysis Report');
  lines.push(`\n**Generated**: ${new Date().toISOString()}`);
  lines.push(`**Total Runs**: ${summaries.length}\n`);

  // Group by scenario
  const byScenario = new Map<string, RunSummary[]>();
  for (const s of summaries) {
    const key = s.scenarioName;
    if (!byScenario.has(key)) byScenario.set(key, []);
    byScenario.get(key)!.push(s);
  }

  // ── Overall Summary Table ──
  lines.push('## Overall Results\n');
  lines.push('| Scenario | Profile | Runs | Pass Rate | Avg NPS | Avg Grounding | Avg Completion | Avg Rounds |');
  lines.push('|----------|---------|------|-----------|---------|---------------|----------------|------------|');
  
  for (const [name, runs] of byScenario) {
    const passRate = Math.round((runs.filter(r => r.passed).length / runs.length) * 100);
    const avgNps = runs.filter(r => r.nps != null).length > 0
      ? (runs.reduce((sum, r) => sum + (r.nps || 0), 0) / runs.filter(r => r.nps != null).length).toFixed(1)
      : 'N/A';
    const avgHall = runs.filter(r => r.hallucinationScore != null).length > 0
      ? (runs.reduce((sum, r) => sum + (r.hallucinationScore || 0), 0) / runs.filter(r => r.hallucinationScore != null).length).toFixed(1)
      : 'N/A';
    const avgCompletion = (runs.reduce((sum, r) => sum + r.completionPct, 0) / runs.length).toFixed(1);
    const avgRounds = (runs.reduce((sum, r) => sum + r.rounds, 0) / runs.length).toFixed(1);
    const profile = runs[0].profile;
    lines.push(`| ${name.slice(0, 40)} | ${profile} | ${runs.length} | ${passRate}% | ${avgNps} | ${avgHall}/10 | ${avgCompletion}% | ${avgRounds} |`);
  }

  // ── Per-Scenario Detail ──
  for (const [name, runs] of byScenario) {
    lines.push(`\n---\n\n## ${name}\n`);
    lines.push(`**Profile**: ${runs[0].profile} | **Target Goal**: ${runs[0].stopReason || 'N/A'}\n`);

    lines.push('| Run | Status | Completion | NPS | Grounding | Rounds | Tools | Tokens | Latency | Props | Gaps |');
    lines.push('|-----|--------|------------|-----|-----------|--------|-------|--------|---------|-------|------|');
    
    for (let i = 0; i < runs.length; i++) {
      const r = runs[i];
      const statusIcon = r.passed ? '✅' : '❌';
      const tokens = `${((r.tokensIn + r.tokensOut) / 1000).toFixed(0)}K`;
      const latency = `${(r.latencyMs / 1000).toFixed(1)}s`;
      const hall = r.hallucinationScore != null ? `${r.hallucinationScore}/10` : '-';
      lines.push(`| ${i + 1} | ${statusIcon} ${r.stopReason || r.status} | ${r.completionPct}% | ${r.nps ?? '-'} | ${hall} | ${r.rounds} | ${r.toolCalls} | ${tokens} | ${latency} | ${r.propertiesCollected} | ${r.coverageGaps.length} |`);
    }

    // Sentiment
    const sentiments = runs.filter(r => r.sentiment).map(r => r.sentiment);
    if (sentiments.length > 0) {
      lines.push('\n### Synthetic User Sentiments\n');
      sentiments.forEach((s, i) => lines.push(`- **Run ${i + 1}**: "${s}"`));
    }

    // Coverage Gaps analysis
    const gapFrequency = new Map<string, number>();
    for (const r of runs) {
      for (const g of r.coverageGaps) {
        gapFrequency.set(g, (gapFrequency.get(g) || 0) + 1);
      }
    }
    if (gapFrequency.size > 0) {
      lines.push('\n### Persistent Coverage Gaps\n');
      lines.push('| Variable | Missed in N Runs | Frequency |');
      lines.push('|----------|------------------|-----------|');
      const sorted = [...gapFrequency.entries()].sort((a, b) => b[1] - a[1]);
      for (const [gap, count] of sorted) {
        const freq = `${count}/${runs.length}`;
        const severity = count === runs.length ? '🔴 Always' : count > 1 ? '🟡 Often' : '🟢 Rare';
        lines.push(`| ${gap} | ${freq} | ${severity} |`);
      }
    }

    // AI Critique synthesis
    const critiques = runs.filter(r => r.critique).map(r => r.critique);
    if (critiques.length > 0) {
      lines.push('\n### AI Critique Synthesis\n');
      
      // Aggregate suggestions across runs
      const allSuggestions: Array<{ category: string; severity: string; title: string; detail: string; action: string }> = [];
      for (const c of critiques) {
        const parsed = typeof c === 'string' ? JSON.parse(c) : c;
        if (parsed.suggestions) {
          allSuggestions.push(...parsed.suggestions);
        }
      }

      if (allSuggestions.length > 0) {
        // Count recurring themes
        const titleCounts = new Map<string, { count: number; detail: string; action: string; category: string; severity: string }>();
        for (const s of allSuggestions) {
          const key = s.title || s.detail?.slice(0, 50) || 'unknown';
          if (!titleCounts.has(key)) {
            titleCounts.set(key, { count: 0, detail: s.detail, action: s.action, category: s.category, severity: s.severity });
          }
          titleCounts.get(key)!.count++;
        }

        lines.push('| Severity | Category | Issue | Recurrence | Action |');
        lines.push('|----------|----------|-------|------------|--------|');
        const sortedSuggestions = [...titleCounts.entries()].sort((a, b) => b[1].count - a[1].count);
        for (const [title, info] of sortedSuggestions) {
          const recurrence = info.count > 1 ? `${info.count}x 🔁` : '1x';
          lines.push(`| ${info.severity} | ${info.category} | ${title} | ${recurrence} | ${info.action?.slice(0, 80) || '-'} |`);
        }
      }
    }
  }

  // ── Goal Achievement Analysis ──
  lines.push('\n---\n\n## Goal Achievement Analysis\n');
  
  const goalTerminations = summaries.filter(r => r.stopReason === 'goal_completed');
  const maxRoundsTerminations = summaries.filter(r => r.stopReason === 'max_rounds');
  const sessionEndTerminations = summaries.filter(r => r.stopReason === 'session_end');
  
  lines.push('| Stop Reason | Count | % of Runs |');
  lines.push('|-------------|-------|-----------|');
  lines.push(`| Goal Achieved | ${goalTerminations.length} | ${Math.round(goalTerminations.length / summaries.length * 100)}% |`);
  lines.push(`| Max Rounds | ${maxRoundsTerminations.length} | ${Math.round(maxRoundsTerminations.length / summaries.length * 100)}% |`);
  lines.push(`| Session End | ${sessionEndTerminations.length} | ${Math.round(sessionEndTerminations.length / summaries.length * 100)}% |`);

  // ── Recommendations ──
  lines.push('\n## Recommendations for Seed/Project Improvements\n');
  
  // Auto-generate recommendations based on patterns
  const avgPassRate = summaries.filter(r => r.passed).length / summaries.length;
  const avgNpsAll = summaries.filter(r => r.nps != null);
  const avgNps = avgNpsAll.length > 0
    ? avgNpsAll.reduce((sum, r) => sum + (r.nps || 0), 0) / avgNpsAll.length
    : null;

  if (avgPassRate < 0.5) {
    lines.push('> [!WARNING]');
    lines.push(`> **Low pass rate (${Math.round(avgPassRate * 100)}%)**: The agent is failing to reach termination conditions. Consider reviewing goal bindings or system prompt.`);
    lines.push('');
  }
  if (avgNps != null && avgNps < 6) {
    lines.push('> [!WARNING]');
    lines.push(`> **Low NPS (avg ${avgNps.toFixed(1)}/10)**: Synthetic users are unsatisfied. Review agent conversation style — it may be too robotic or not acknowledging user inputs well enough.`);
    lines.push('');
  }
  if (maxRoundsTerminations.length > summaries.length * 0.5) {
    lines.push('> [!CAUTION]');
    lines.push('> **Most runs hit max_rounds**: The agent is not converging on goals. This could indicate: graph complexity is too high, the agent is looping through nords without collecting data, or goal bindings are misaligned with available nords.');
    lines.push('');
  }

  // Always-missed variables
  const globalGapFrequency = new Map<string, number>();
  for (const r of summaries) {
    for (const g of r.coverageGaps) {
      globalGapFrequency.set(g, (globalGapFrequency.get(g) || 0) + 1);
    }
  }
  const alwaysMissed = [...globalGapFrequency.entries()].filter(([, count]) => count === summaries.length);
  if (alwaysMissed.length > 0) {
    lines.push('> [!IMPORTANT]');
    lines.push(`> **Always-missed variables**: ${alwaysMissed.map(([name]) => '`' + name + '`').join(', ')} were never collected across any run. These may be unreachable from the graph, or the agent doesn't know how to prompt for them.`);
    lines.push('');
  }

  return lines.join('\n');
}

// ── Main ──

async function main() {
  const args = process.argv.slice(2);
  const runsPerScenario = parseInt(args.find((_, i) => args[i - 1] === '--runs') || '3');
  const scenarioFilter = args.find((_, i) => args[i - 1] === '--scenario') || 'all';

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  🧪 AI Test Runner — Comparative Analysis   ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Runs per scenario: ${runsPerScenario}                      ║`);
  console.log(`║  Scenario filter:   ${scenarioFilter.padEnd(25)}║`);
  console.log('╚══════════════════════════════════════════════╝\n');

  // 1. Get project and scenarios
  const projectId = await getProjectId();
  console.log(`📦 Project ID: ${projectId}\n`);

  let scenarios = await getScenarios(projectId);
  if (scenarioFilter !== 'all') {
    scenarios = scenarios.filter(s => s.name.toLowerCase().includes(scenarioFilter.toLowerCase()));
  }
  console.log(`📋 Found ${scenarios.length} scenario(s)\n`);

  if (scenarios.length === 0) {
    console.error('No matching scenarios found. Available:');
    const allScenarios = await getScenarios(projectId);
    allScenarios.forEach(s => console.error(`  - ${s.name}`));
    process.exit(1);
  }

  // 2. Execute runs
  const allSummaries: RunSummary[] = [];

  for (const scenario of scenarios) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📋 ${scenario.name}`);
    console.log(`   Profile: ${scenario.user_profile} | Max Rounds: ${scenario.max_rounds} | Goal: ${scenario.goal_name || 'none'}`);
    console.log('═'.repeat(60));

    for (let run = 1; run <= runsPerScenario; run++) {
      console.log(`\n  🔄 Run ${run}/${runsPerScenario}...`);

      try {
        // Start the run
        const { runId } = await startRun(scenario.id);
        console.log(`    📌 Run ID: ${runId.slice(0, 8)}...`);

        // Stream progress
        await streamRun(runId);

        // Fetch final results
        const result = await getRun(runId);
        
        const statusIcon = result.passed ? '✅' : '❌';
        console.log(`    ${statusIcon} ${result.status} | ${result.completion_pct ?? 0}% | NPS: ${result.synthetic_nps ?? '?'} | Rounds: ${result.rounds_completed} | Stop: ${result.stop_reason}`);

        // Generate critique
        if (result.status === 'completed') {
          try {
            console.log('    🔍 Generating AI critique...');
            const critique = await getCritique(runId);
            result.critique = critique;
            console.log(`    💡 Critique: ${critique.summary?.slice(0, 100) || 'Generated'}`);
          } catch (err) {
            console.log(`    ⚠️ Critique failed: ${(err as Error).message}`);
          }
        }

        allSummaries.push(summarizeRun(scenario, result));

      } catch (err) {
        console.error(`    💥 Run failed: ${(err as Error).message}`);
        allSummaries.push({
          scenarioName: scenario.name,
          profile: scenario.user_profile,
          runId: 'FAILED',
          status: 'error',
          passed: false,
          rounds: 0,
          completionPct: 0,
          nps: null,
          hallucinationScore: null,
          sentiment: null,
          stopReason: 'error',
          toolCalls: 0,
          tokensIn: 0,
          tokensOut: 0,
          latencyMs: 0,
          propertiesCollected: 0,
          coverageGaps: [],
          critique: null,
        });
      }
    }
  }

  // 3. Generate comparative report
  console.log('\n\n📊 Generating comparative analysis report...\n');
  const report = generateReport(allSummaries);
  
  // Write report to file
  const reportPath = `scripts/test-report-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.md`;
  const fs = await import('fs');
  fs.writeFileSync(reportPath, report);
  console.log(`📝 Report saved to: ${reportPath}`);
  
  // Also print to stdout
  console.log('\n' + '═'.repeat(60));
  console.log(report);

  // Exit with appropriate code
  const failedRuns = allSummaries.filter(r => !r.passed);
  if (failedRuns.length > 0) {
    console.log(`\n⚠️ ${failedRuns.length}/${allSummaries.length} runs failed`);
    process.exit(1);
  } else {
    console.log(`\n✅ All ${allSummaries.length} runs passed!`);
  }
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
