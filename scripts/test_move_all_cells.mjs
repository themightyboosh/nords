#!/usr/bin/env node
/**
 * test_move_all_cells.mjs — Verifies a single card can be moved to every
 * column and swimlane on the board, then restores its original position.
 *
 * Checks:
 *   1. Can write distance_x = 0 (first column edge case)
 *   2. Can write distance_x = 1 (last column edge case)
 *   3. All column centers + Voronoi bounds resolve correctly
 *   4. All swimlane rows resolve correctly (quadrant mode)
 *
 * Usage: node scripts/test_move_all_cells.mjs
 */

const BASE = 'http://localhost:3000';

async function apiGet(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

function resolveStageLabel(distance, labels) {
  if (labels.length === 0) return null;
  if (labels.length === 1) return labels[0].label;
  const sorted = [...labels].sort((a, b) => a.position - b.position);
  for (let i = 0; i < sorted.length - 1; i++) {
    const boundary = (sorted[i].position + sorted[i + 1].position) / 2;
    if (distance <= boundary) return sorted[i].label;
  }
  return sorted[sorted.length - 1].label;
}

function getColumnBounds(label, labels) {
  if (labels.length === 0) return { min: 0, max: 1, center: 0.5 };
  const sorted = [...labels].sort((a, b) => a.position - b.position);
  const idx = sorted.findIndex(l => l.label === label);
  if (idx === -1) return { min: 0, max: 1, center: 0.5 };
  const center = sorted[idx].position;
  const min = idx === 0 ? 0 : (sorted[idx - 1].position + center) / 2;
  const max = idx === sorted.length - 1 ? 1 : (center + sorted[idx + 1].position) / 2;
  return { min, max, center };
}

function normalizeStageLabels(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === 'object' && raw[0] !== null && 'label' in raw[0]) {
    return [...raw].sort((a, b) => a.position - b.position);
  }
  if (typeof raw[0] === 'string') {
    return raw.map((label, i) => ({
      label,
      position: raw.length === 1 ? 0.5 : i / (raw.length - 1),
    }));
  }
  return [];
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('Single Card → All Cells Movement Test');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Setup
  const projects = await apiGet('/api/projects');
  if (projects.length === 0) { console.log('❌ No projects'); return; }
  const project = projects[0];
  console.log(`Project: "${project.name}"\n`);

  const graph = await apiGet(`/api/projects/${project.id}/graph`);

  const boardType = graph.connection_types.find(ct => {
    const labels = normalizeStageLabels(ct.x_stage_labels);
    return labels.length >= 2;
  });
  if (!boardType) { console.log('❌ No board-capable type'); return; }

  const xLabels = normalizeStageLabels(boardType.x_stage_labels);
  const yLabels = normalizeStageLabels(boardType.y_stage_labels || []);
  const isQuadrant = yLabels.length > 0;

  console.log(`Board: "${boardType.name}" — ${xLabels.length} cols × ${yLabels.length || 1} rows`);
  console.log(`Mode: ${isQuadrant ? 'QUADRANT' : 'SPECTRUM'}\n`);

  // Show grid structure
  console.log('Columns:');
  for (const lbl of xLabels) {
    const b = getColumnBounds(lbl.label, xLabels);
    console.log(`  ${lbl.label.padEnd(15)} pos=${lbl.position.toFixed(3)}  bounds=[${b.min.toFixed(3)}, ${b.max.toFixed(3)}]  center=${b.center.toFixed(3)}`);
  }
  if (isQuadrant) {
    console.log('Rows:');
    for (const lbl of yLabels) {
      const b = getColumnBounds(lbl.label, yLabels);
      console.log(`  ${lbl.label.padEnd(15)} pos=${lbl.position.toFixed(3)}  bounds=[${b.min.toFixed(3)}, ${b.max.toFixed(3)}]  center=${b.center.toFixed(3)}`);
    }
  }
  console.log('');

  // 2. Pick a test card — find a nord with exactly 1 connection of this type
  let testConnId = null;
  let testNordId = null;
  let testNordName = null;
  let originalDistX = null;
  let originalDistY = null;

  for (const conn of graph.connections) {
    if (conn.type_id !== boardType.id) continue;
    testConnId = conn.id;
    testNordId = conn.source_nord_id;
    originalDistX = conn.distance_x;
    originalDistY = conn.distance_y;
    break;
  }

  if (!testConnId) { console.log('❌ No connections of this type'); return; }

  const testNord = graph.nords.find(n => n.id === testNordId);
  testNordName = testNord?.title || testNordId.slice(0, 8);

  const origColLabel = resolveStageLabel(originalDistX, xLabels);
  const origRowLabel = isQuadrant ? resolveStageLabel(originalDistY, yLabels) : null;

  console.log(`Test Card: "${testNordName}"`);
  console.log(`  Connection: ${testConnId}`);
  console.log(`  Original: col="${origColLabel}" row="${origRowLabel || '-'}" dist=(${originalDistX.toFixed(4)}, ${originalDistY.toFixed(4)})`);
  console.log('');

  // 3. Test moving to every cell
  const cells = [];
  for (const xLbl of xLabels) {
    if (isQuadrant) {
      for (const yLbl of yLabels) {
        cells.push({ col: xLbl, row: yLbl });
      }
    } else {
      cells.push({ col: xLbl, row: null });
    }
  }

  console.log(`Testing ${cells.length} cell positions...\n`);

  let passCount = 0;
  let failCount = 0;
  const failures = [];

  for (const cell of cells) {
    const xBounds = getColumnBounds(cell.col.label, xLabels);
    const yBounds = cell.row ? getColumnBounds(cell.row.label, yLabels) : null;

    const writeX = xBounds.center;
    const writeY = yBounds ? yBounds.center : 0.5;

    // Write to the connection
    try {
      await apiPut(`/api/connections/${testConnId}`, {
        distance_x: writeX,
        distance_y: writeY,
      });
    } catch (err) {
      failCount++;
      const cellName = cell.row ? `${cell.col.label}|${cell.row.label}` : cell.col.label;
      failures.push({ cell: cellName, error: `API write failed: ${err.message}` });
      console.log(`  ❌ ${cellName}: API write failed (distance_x=${writeX})`);
      continue;
    }

    // Read back
    const updated = await apiGet(`/api/projects/${project.id}/graph`);
    const conn = updated.connections.find(c => c.id === testConnId);
    if (!conn) {
      failCount++;
      const cellName = cell.row ? `${cell.col.label}|${cell.row.label}` : cell.col.label;
      failures.push({ cell: cellName, error: 'Connection not found after write' });
      console.log(`  ❌ ${cellName}: Connection disappeared!`);
      continue;
    }

    const readX = conn.distance_x;
    const readY = conn.distance_y;
    const resolvedCol = resolveStageLabel(readX, xLabels);
    const resolvedRow = isQuadrant ? resolveStageLabel(readY, yLabels) : null;

    const colMatch = resolvedCol === cell.col.label;
    const rowMatch = !isQuadrant || resolvedRow === cell.row.label;

    const cellName = cell.row ? `${cell.col.label}|${cell.row.label}` : cell.col.label;

    if (colMatch && rowMatch) {
      passCount++;
      console.log(`  ✅ ${cellName.padEnd(30)} wrote=(${writeX.toFixed(4)}, ${writeY.toFixed(4)}) → read=(${readX.toFixed(4)}, ${readY.toFixed(4)}) → resolved="${resolvedCol}${resolvedRow ? '|' + resolvedRow : ''}"`);
    } else {
      failCount++;
      failures.push({
        cell: cellName,
        error: `Resolved to "${resolvedCol}|${resolvedRow}" instead of "${cell.col.label}|${cell.row?.label}"`,
        wrote: { x: writeX, y: writeY },
        read: { x: readX, y: readY },
      });
      console.log(`  ❌ ${cellName.padEnd(30)} wrote=(${writeX.toFixed(4)}, ${writeY.toFixed(4)}) → read=(${readX.toFixed(4)}, ${readY.toFixed(4)}) → resolved="${resolvedCol}|${resolvedRow}" MISMATCH!`);
    }
  }

  // 4. Also test edge values
  console.log('\nEdge value tests:');
  const edgeTests = [
    { name: 'distance_x = 0 (absolute min)', x: 0, y: 0.5, expectCol: xLabels[0].label },
    { name: 'distance_x = 1 (absolute max)', x: 1, y: 0.5, expectCol: xLabels[xLabels.length - 1].label },
    { name: 'distance_x = 0.5 (midpoint)', x: 0.5, y: 0.5, expectCol: resolveStageLabel(0.5, xLabels) },
    { name: 'distance_x = null → default', x: null, y: 0.5, expectCol: null },
  ];

  for (const test of edgeTests) {
    if (test.x === null) {
      // Test what happens with null/undefined — skip API write, just test resolution
      const resolved = resolveStageLabel(0.5, xLabels); // default fallback
      console.log(`  ℹ️  ${test.name}: resolves to "${resolved}" (null uses 0.5 default via ??)`);
      continue;
    }

    try {
      await apiPut(`/api/connections/${testConnId}`, { distance_x: test.x, distance_y: test.y });
      const g = await apiGet(`/api/projects/${project.id}/graph`);
      const c = g.connections.find(cc => cc.id === testConnId);
      const readX = c?.distance_x ?? -1;
      const resolved = resolveStageLabel(readX, xLabels);
      const ok = resolved === test.expectCol;
      if (ok) {
        passCount++;
        console.log(`  ✅ ${test.name}: wrote=${test.x} → read=${readX.toFixed(4)} → "${resolved}"`);
      } else {
        failCount++;
        console.log(`  ❌ ${test.name}: wrote=${test.x} → read=${readX.toFixed(4)} → "${resolved}" (expected "${test.expectCol}")`);
        failures.push({ cell: test.name, error: `Resolved to "${resolved}" not "${test.expectCol}"` });
      }
    } catch (err) {
      failCount++;
      console.log(`  ❌ ${test.name}: ${err.message}`);
      failures.push({ cell: test.name, error: err.message });
    }
  }

  // 5. Restore original position
  console.log('\nRestoring original position...');
  try {
    await apiPut(`/api/connections/${testConnId}`, {
      distance_x: originalDistX,
      distance_y: originalDistY,
    });
    console.log(`  ✅ Restored to (${originalDistX.toFixed(4)}, ${originalDistY.toFixed(4)})`);
  } catch (err) {
    console.log(`  ⚠️  Failed to restore: ${err.message}`);
  }

  // 6. Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures) {
      console.log(`  • ${f.cell}: ${f.error}`);
    }
  }
  console.log(failCount === 0
    ? '\n✅ ALL TESTS PASSED — Card can move to every cell'
    : '\n🔴 SOME TESTS FAILED — See failures above');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
