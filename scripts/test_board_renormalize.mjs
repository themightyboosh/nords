#!/usr/bin/env node
/**
 * test_board_renormalize.mjs — Board drag renormalization smoke test.
 *
 * Simulates a card drop and checks whether unmoved nords change swimlanes.
 *
 * Steps:
 *   1. Fetch graph, find a board-capable connection type with stage labels
 *   2. Snapshot every nord's column/row assignment (BEFORE)
 *   3. Pick a card and move it to a different column via API
 *   4. Re-fetch graph and snapshot every nord's column/row assignment (AFTER)
 *   5. Report which unmoved nords changed cells → these are the bugs we need to catch
 *   6. Run the renormalization algorithm inline and re-check (AFTER RENORM)
 *
 * Usage: node scripts/test_board_renormalize.mjs
 */

const BASE = 'http://localhost:3000';

// ── Helpers ──

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

/** Voronoi midpoint resolution — mirrors stageLabels.ts */
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
    return raw.sort((a, b) => a.position - b.position);
  }
  if (typeof raw[0] === 'string') {
    return raw.map((label, i) => ({
      label,
      position: raw.length === 1 ? 0.5 : i / (raw.length - 1),
    }));
  }
  return [];
}

/** Build a snapshot of which cell each nord is in */
function snapshotCells(graph, typeId, xLabels, yLabels) {
  const isQuadrant = yLabels.length > 0;
  const cells = new Map(); // nordId → { col, row, distX, distY }

  // Derive average distance per nord from connections
  const accX = new Map();
  const accY = new Map();
  for (const conn of graph.connections) {
    if (conn.type_id !== typeId) continue;
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      const ax = accX.get(nid) || { sum: 0, count: 0 };
      ax.sum += conn.distance_x ?? 0.5;
      ax.count++;
      accX.set(nid, ax);

      const ay = accY.get(nid) || { sum: 0, count: 0 };
      ay.sum += conn.distance_y ?? 0.5;
      ay.count++;
      accY.set(nid, ay);
    }
  }

  for (const [nordId, ax] of accX) {
    const distX = ax.sum / ax.count;
    const ay = accY.get(nordId) || { sum: 0.5, count: 1 };
    const distY = ay.sum / ay.count;
    const col = resolveStageLabel(distX, xLabels);
    const row = isQuadrant ? (resolveStageLabel(distY, yLabels) || yLabels[0]?.label) : null;
    cells.set(nordId, { col, row, distX, distY });
  }

  return cells;
}

// ── Main ──

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('Board Drag Renormalization Test');
  console.log('═══════════════════════════════════════════════════\n');

  // 1. Find a project
  const projects = await apiGet('/api/projects');
  if (projects.length === 0) { console.log('❌ No projects found'); return; }
  const project = projects[0];
  console.log(`Project: "${project.name}" (${project.id})\n`);

  // 2. Fetch graph
  const graph = await apiGet(`/api/projects/${project.id}/graph`);
  console.log(`  Nords: ${graph.nords.length}`);
  console.log(`  Connections: ${graph.connections.length}`);
  console.log(`  Connection Types: ${graph.connection_types.length}\n`);

  // 3. Find a connection type with stage labels
  const boardType = graph.connection_types.find(ct => {
    const labels = normalizeStageLabels(ct.x_stage_labels);
    return labels.length >= 2;
  });

  if (!boardType) {
    console.log('❌ No board-capable connection type with ≥2 stage labels found');
    return;
  }

  const xLabels = normalizeStageLabels(boardType.x_stage_labels);
  const yLabels = normalizeStageLabels(boardType.y_stage_labels || []);

  console.log(`Board Type: "${boardType.name}" (${boardType.id})`);
  console.log(`  X Labels: ${xLabels.map(l => `${l.label}@${l.position.toFixed(2)}`).join(', ')}`);
  if (yLabels.length > 0) {
    console.log(`  Y Labels: ${yLabels.map(l => `${l.label}@${l.position.toFixed(2)}`).join(', ')}`);
  }
  console.log(`  Mode: ${yLabels.length > 0 ? 'QUADRANT' : 'SPECTRUM'}\n`);

  // Show column Voronoi bounds
  console.log('Column Voronoi Bounds:');
  for (const lbl of xLabels) {
    const b = getColumnBounds(lbl.label, xLabels);
    console.log(`  ${lbl.label}: [${b.min.toFixed(3)} .. ${b.center.toFixed(3)} .. ${b.max.toFixed(3)}]`);
  }
  console.log('');

  // 4. Snapshot BEFORE
  const before = snapshotCells(graph, boardType.id, xLabels, yLabels);
  console.log(`Cards on this board: ${before.size}\n`);

  if (before.size < 2) {
    console.log('❌ Need at least 2 cards on the board to test');
    return;
  }

  // Display current card positions
  console.log('BEFORE — Card positions:');
  const nordNameMap = new Map(graph.nords.map(n => [n.id, n.title || 'Untitled']));
  for (const [nordId, cell] of before) {
    const name = nordNameMap.get(nordId) || nordId.slice(0, 8);
    console.log(`  ${name}: col="${cell.col}" row="${cell.row || '-'}" dist=(${cell.distX.toFixed(4)}, ${cell.distY.toFixed(4)})`);
  }
  console.log('');

  // 5. Pick a card to move — find one NOT in the first column, move it to column 1
  const entries = [...before.entries()];
  const cardToMove = entries.find(([, cell]) => cell.col !== xLabels[0].label);
  if (!cardToMove) {
    console.log('❌ All cards are in the first column — nothing to move');
    return;
  }

  const [movedNordId, movedCell] = cardToMove;
  const movedName = nordNameMap.get(movedNordId) || movedNordId.slice(0, 8);
  const targetLabel = xLabels[0].label;
  const targetBounds = getColumnBounds(targetLabel, xLabels);

  console.log(`SIMULATING DROP: "${movedName}" from "${movedCell.col}" → "${targetLabel}"`);
  console.log(`  Target column center: ${targetBounds.center.toFixed(4)}\n`);

  // Find this nord's connections of this type
  const movedConns = graph.connections.filter(c =>
    c.type_id === boardType.id &&
    (c.source_nord_id === movedNordId || c.target_nord_id === movedNordId)
  );

  console.log(`  Connections to update: ${movedConns.length}`);

  // Now simulate what the micro-spread does: set ALL cards in the target cell
  // to spread positions (same as MatrixView handleCellDrop)
  const cardsAlreadyInTarget = entries.filter(([id, cell]) =>
    cell.col === targetLabel && id !== movedNordId
  );

  const allCellCards = [
    ...cardsAlreadyInTarget.map(([id]) => id),
    movedNordId,
  ];

  const n = allCellCards.length;
  console.log(`  Cards in target cell after drop: ${n}`);
  console.log('');

  // Write spread distances
  console.log('MICRO-SPREAD writes:');
  for (let i = 0; i < n; i++) {
    const nordId = allCellCards[i];
    const spreadX = n === 1
      ? targetBounds.center
      : targetBounds.min + ((i + 1) / (n + 1)) * (targetBounds.max - targetBounds.min);
    const name = nordNameMap.get(nordId) || nordId.slice(0, 8);

    // Check if this spread would cross a boundary
    const resolvedCol = resolveStageLabel(spreadX, xLabels);
    const crossed = resolvedCol !== targetLabel;

    console.log(`  ${name}: spread_x=${spreadX.toFixed(4)} → resolves to "${resolvedCol}" ${crossed ? '⚠️  BOUNDARY CROSSED!' : '✅'}`);

    // Actually write to the connections
    const conns = graph.connections.filter(c =>
      c.type_id === boardType.id &&
      (c.source_nord_id === nordId || c.target_nord_id === nordId)
    );
    for (const conn of conns) {
      await apiPut(`/api/connections/${conn.id}`, { distance_x: spreadX });
    }
  }
  console.log('');

  // 6. Re-fetch and snapshot AFTER micro-spread
  const graphAfter = await apiGet(`/api/projects/${project.id}/graph`);
  const after = snapshotCells(graphAfter, boardType.id, xLabels, yLabels);

  console.log('AFTER MICRO-SPREAD — Checking for cell drift:');
  let driftCount = 0;
  for (const [nordId, beforeCell] of before) {
    if (nordId === movedNordId) continue; // skip the moved card
    const afterCell = after.get(nordId);
    if (!afterCell) continue;

    const colChanged = beforeCell.col !== afterCell.col;
    const rowChanged = beforeCell.row !== afterCell.row;

    if (colChanged || rowChanged) {
      driftCount++;
      const name = nordNameMap.get(nordId) || nordId.slice(0, 8);
      console.log(`  ⚠️  "${name}" DRIFTED: col "${beforeCell.col}" → "${afterCell.col}", row "${beforeCell.row || '-'}" → "${afterCell.row || '-'}"`);
      console.log(`      distX: ${beforeCell.distX.toFixed(4)} → ${afterCell.distX.toFixed(4)}`);
    }
  }

  if (driftCount === 0) {
    console.log('  ✅ No unmoved nords changed cells — micro-spread was safe in this case');
  } else {
    console.log(`\n  🔴 ${driftCount} nord(s) drifted cells — renormalization IS needed`);
  }
  console.log('');

  // 7. Now run renormalization logic (inline, mirrors boardRenormalize.ts)
  console.log('RUNNING RENORMALIZATION...');
  const renormGraph = await apiGet(`/api/projects/${project.id}/graph`);
  let corrections = 0;

  // Build per-nord positions
  const nordMap = new Map();
  for (const conn of renormGraph.connections) {
    if (conn.type_id !== boardType.id) continue;
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      let entry = nordMap.get(nid);
      if (!entry) {
        entry = { nordId: nid, connectionIds: [], distanceX: 0, distanceY: 0, sortOrder: 0 };
        nordMap.set(nid, entry);
      }
      if (!entry.connectionIds.includes(conn.id)) {
        entry.connectionIds.push(conn.id);
      }
    }
  }
  for (const entry of nordMap.values()) {
    let sx = 0, sy = 0, ct = 0;
    for (const cid of entry.connectionIds) {
      const c = renormGraph.connections.find(cc => cc.id === cid);
      if (!c) continue;
      sx += c.distance_x ?? 0.5;
      sy += c.distance_y ?? 0.5;
      ct++;
    }
    if (ct > 0) { entry.distanceX = sx / ct; entry.distanceY = sy / ct; }
    const orders = entry.connectionIds.map(cid => {
      const c = renormGraph.connections.find(cc => cc.id === cid);
      return c?.sort_order ?? 0;
    });
    entry.sortOrder = Math.min(...orders);
  }

  // Group by cell
  const cells = new Map();
  for (const entry of nordMap.values()) {
    const col = resolveStageLabel(entry.distanceX, xLabels);
    if (!col) continue;
    const row = yLabels.length > 0 ? (resolveStageLabel(entry.distanceY, yLabels) || yLabels[0]?.label) : null;
    const key = row ? `${col}|${row}` : col;
    let bucket = cells.get(key);
    if (!bucket) { bucket = []; cells.set(key, bucket); }
    bucket.push(entry);
  }

  // Re-spread each cell
  for (const [cellKey, cards] of cells) {
    cards.sort((a, b) => a.sortOrder - b.sortOrder);
    const cn = cards.length;
    const parts = cellKey.split('|');
    const colLabel = parts[0];
    const rowLabel = parts[1] || null;
    const xBounds = getColumnBounds(colLabel, xLabels);
    const yBounds = rowLabel ? getColumnBounds(rowLabel, yLabels) : null;

    for (let i = 0; i < cn; i++) {
      const card = cards[i];
      const idealX = cn === 1 ? xBounds.center : xBounds.min + ((i + 1) / (cn + 1)) * (xBounds.max - xBounds.min);
      const idealY = yBounds
        ? (cn === 1 ? yBounds.center : yBounds.min + ((i + 1) / (cn + 1)) * (yBounds.max - yBounds.min))
        : card.distanceY;

      const dxOff = Math.abs(card.distanceX - idealX) > 0.001;
      const dyOff = yBounds ? Math.abs(card.distanceY - idealY) > 0.001 : false;

      if (dxOff || dyOff) {
        const patch = {};
        if (dxOff) patch.distance_x = idealX;
        if (dyOff) patch.distance_y = idealY;

        for (const cid of card.connectionIds) {
          await apiPut(`/api/connections/${cid}`, patch);
          corrections++;
        }
        const name = nordNameMap.get(card.nordId) || card.nordId.slice(0, 8);
        console.log(`  Corrected "${name}": distX ${card.distanceX.toFixed(4)} → ${idealX.toFixed(4)}`);
      }
    }
  }
  console.log(`  Total corrections: ${corrections}\n`);

  // 8. Final verification
  const finalGraph = await apiGet(`/api/projects/${project.id}/graph`);
  const finalSnap = snapshotCells(finalGraph, boardType.id, xLabels, yLabels);

  console.log('FINAL VERIFICATION — Comparing to original positions:');
  let finalDriftCount = 0;
  for (const [nordId, beforeCell] of before) {
    if (nordId === movedNordId) continue;
    const finalCell = finalSnap.get(nordId);
    if (!finalCell) continue;

    const colChanged = beforeCell.col !== finalCell.col;
    const rowChanged = beforeCell.row !== finalCell.row;

    if (colChanged || rowChanged) {
      finalDriftCount++;
      const name = nordNameMap.get(nordId) || nordId.slice(0, 8);
      console.log(`  ⚠️  "${name}" STILL DRIFTED: col "${beforeCell.col}" → "${finalCell.col}"`);
    }
  }

  if (finalDriftCount === 0) {
    console.log('  ✅ All unmoved nords are back in their original cells after renormalization');
  } else {
    console.log(`  🔴 ${finalDriftCount} nord(s) still drifted — renormalization needs a pre-drop snapshot!`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log(driftCount > 0 && finalDriftCount === 0
    ? '✅ PASS — Renormalization corrected all drift'
    : driftCount === 0
    ? '✅ PASS — No drift detected in this scenario (micro-spread was safe)'
    : '🔴 FAIL — Renormalization could not fix all drift — need pre-drop snapshot');
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
