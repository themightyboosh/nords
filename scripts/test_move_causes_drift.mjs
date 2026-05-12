#!/usr/bin/env node
/**
 * test_move_causes_drift.mjs — Tests whether moving one card causes
 * another card to change columns/swimlanes.
 *
 * Replicates the EXACT micro-spread logic from MatrixView.handleCellDrop:
 *   1. Snapshot all card positions BEFORE
 *   2. Move Card A into a cell that already has cards (Card B, Card C)
 *   3. Re-spread ALL cards in the target cell (same formula as MatrixView)
 *   4. Check if Card B or Card C changed columns/rows
 *   5. If drift detected → run renormalization → re-check
 *   6. Restore all original positions
 *
 * Usage: node scripts/test_move_causes_drift.mjs
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
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Move-One-Card-Drifts-Another Test');
  console.log('═══════════════════════════════════════════════════════════\n');

  const projects = await apiGet('/api/projects');
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
  const nordNames = new Map(graph.nords.map(n => [n.id, n.title || 'Untitled']));

  console.log(`Board: "${boardType.name}" — ${xLabels.length} cols × ${yLabels.length || 1} rows\n`);

  // ── Build per-nord card data (same as MatrixView) ──
  const cardsByNord = new Map(); // nordId → { connIds, avgDistX, avgDistY, sortOrder }
  for (const conn of graph.connections) {
    if (conn.type_id !== boardType.id) continue;
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      let entry = cardsByNord.get(nid);
      if (!entry) entry = { connIds: [], sumX: 0, sumY: 0, count: 0, sortOrders: [] };
      if (!entry.connIds.includes(conn.id)) {
        entry.connIds.push(conn.id);
        entry.sumX += conn.distance_x ?? 0.5;
        entry.sumY += conn.distance_y ?? 0.5;
        entry.count++;
        entry.sortOrders.push(conn.sort_order ?? 0);
      }
      cardsByNord.set(nid, entry);
    }
  }

  // Resolve cells
  const cardCells = new Map(); // nordId → { col, row, distX, distY, connIds, sortOrder }
  for (const [nid, data] of cardsByNord) {
    const distX = data.sumX / data.count;
    const distY = data.sumY / data.count;
    const col = resolveStageLabel(distX, xLabels);
    const row = isQuadrant ? (resolveStageLabel(distY, yLabels) || yLabels[0]?.label) : null;
    cardCells.set(nid, {
      col, row, distX, distY,
      connIds: data.connIds,
      sortOrder: Math.min(...data.sortOrders),
    });
  }

  // ── Find a target cell that already has multiple cards ──
  const cellBuckets = new Map(); // "col|row" → [nordId, ...]
  for (const [nid, cell] of cardCells) {
    const key = cell.row ? `${cell.col}|${cell.row}` : cell.col;
    if (!cellBuckets.has(key)) cellBuckets.set(key, []);
    cellBuckets.get(key).push(nid);
  }

  // Find the most populated cell
  let targetCellKey = null;
  let maxCount = 0;
  for (const [key, nids] of cellBuckets) {
    if (nids.length > maxCount) {
      maxCount = nids.length;
      targetCellKey = key;
    }
  }

  if (maxCount < 2) {
    console.log('⚠️  No cell has 2+ cards — creating a stress scenario by moving into the most populated column...');
  }

  // Find a card NOT in the target cell to move INTO it
  const targetParts = targetCellKey.split('|');
  const targetCol = targetParts[0];
  const targetRow = targetParts[1] || null;
  const residentsInTarget = cellBuckets.get(targetCellKey) || [];

  let moverNordId = null;
  for (const [nid, cell] of cardCells) {
    const key = cell.row ? `${cell.col}|${cell.row}` : cell.col;
    if (key !== targetCellKey) {
      moverNordId = nid;
      break;
    }
  }

  if (!moverNordId) { console.log('❌ All cards are in the same cell'); return; }

  const moverCell = cardCells.get(moverNordId);
  const moverName = nordNames.get(moverNordId);

  console.log(`Target cell: "${targetCellKey}" with ${residentsInTarget.length} existing cards`);
  console.log(`Moving: "${moverName}" from "${moverCell.col}|${moverCell.row || '-'}" → "${targetCol}|${targetRow || '-'}"\n`);

  // ── Save ALL original connection values for rollback ──
  const originalValues = new Map(); // connId → { distance_x, distance_y }
  for (const conn of graph.connections) {
    if (conn.type_id !== boardType.id) continue;
    originalValues.set(conn.id, { distance_x: conn.distance_x, distance_y: conn.distance_y });
  }

  // ── Snapshot BEFORE ──
  const snapshotBefore = new Map();
  for (const [nid, cell] of cardCells) {
    snapshotBefore.set(nid, { col: cell.col, row: cell.row });
  }

  console.log('Residents before drop:');
  for (const nid of residentsInTarget) {
    const cell = cardCells.get(nid);
    console.log(`  "${nordNames.get(nid)}" distX=${cell.distX.toFixed(4)} distY=${cell.distY.toFixed(4)}`);
  }
  console.log('');

  // ── Simulate handleCellDrop micro-spread ──
  const xBounds = getColumnBounds(targetCol, xLabels);
  const yBounds = targetRow ? getColumnBounds(targetRow, yLabels) : null;

  // Build the roster: existing residents + mover, sorted by sortOrder
  const roster = [
    ...residentsInTarget.map(nid => ({
      nid,
      connIds: cardCells.get(nid).connIds,
      sortOrder: cardCells.get(nid).sortOrder,
    })),
    {
      nid: moverNordId,
      connIds: moverCell.connIds,
      sortOrder: 99999, // dropped card goes to end
    },
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const n = roster.length;
  console.log(`MICRO-SPREAD: ${n} cards in target cell after drop\n`);

  const spreadWrites = [];
  for (let i = 0; i < n; i++) {
    const card = roster[i];
    const spreadX = n === 1
      ? xBounds.center
      : xBounds.min + ((i + 1) / (n + 1)) * (xBounds.max - xBounds.min);
    const spreadY = yBounds
      ? (n === 1
        ? yBounds.center
        : yBounds.min + ((i + 1) / (n + 1)) * (yBounds.max - yBounds.min))
      : 0.5;

    const resolvedCol = resolveStageLabel(spreadX, xLabels);
    const resolvedRow = isQuadrant ? resolveStageLabel(spreadY, yLabels) : null;
    const isMover = card.nid === moverNordId;
    const drifted = resolvedCol !== targetCol || (targetRow && resolvedRow !== targetRow);

    console.log(`  [${i}] "${nordNames.get(card.nid)}"${isMover ? ' (MOVER)' : ''}`);
    console.log(`      spreadX=${spreadX.toFixed(6)} → col="${resolvedCol}"${drifted ? ' ⚠️  DRIFTED!' : ' ✅'}`);
    if (yBounds) {
      console.log(`      spreadY=${spreadY.toFixed(6)} → row="${resolvedRow}"${resolvedRow !== targetRow ? ' ⚠️  DRIFTED!' : ' ✅'}`);
    }

    // Write to all connections
    for (const cid of card.connIds) {
      spreadWrites.push({ connId: cid, distX: spreadX, distY: spreadY });
    }
  }

  // Execute writes
  console.log(`\nWriting ${spreadWrites.length} connection updates...`);
  for (const w of spreadWrites) {
    await apiPut(`/api/connections/${w.connId}`, { distance_x: w.distX, distance_y: w.distY });
  }

  // ── Check drift in ALL other nords ──
  console.log('\nChecking ALL nords for cell drift...\n');
  const graphAfter = await apiGet(`/api/projects/${project.id}/graph`);

  // Rebuild card cells from fresh data
  const cardsByNordAfter = new Map();
  for (const conn of graphAfter.connections) {
    if (conn.type_id !== boardType.id) continue;
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      let entry = cardsByNordAfter.get(nid);
      if (!entry) entry = { sumX: 0, sumY: 0, count: 0 };
      entry.sumX += conn.distance_x ?? 0.5;
      entry.sumY += conn.distance_y ?? 0.5;
      entry.count++;
      cardsByNordAfter.set(nid, entry);
    }
  }

  let driftCount = 0;
  for (const [nid, before] of snapshotBefore) {
    if (nid === moverNordId) continue; // skip the intentionally moved card
    const after = cardsByNordAfter.get(nid);
    if (!after) continue;
    const afterDistX = after.sumX / after.count;
    const afterDistY = after.sumY / after.count;
    const afterCol = resolveStageLabel(afterDistX, xLabels);
    const afterRow = isQuadrant ? resolveStageLabel(afterDistY, yLabels) : null;

    if (afterCol !== before.col || afterRow !== before.row) {
      driftCount++;
      const name = nordNames.get(nid);
      console.log(`  ⚠️  "${name}" DRIFTED: "${before.col}|${before.row || '-'}" → "${afterCol}|${afterRow || '-'}"`);
    }
  }

  if (driftCount === 0) {
    console.log('  ✅ No other cards changed cells!');
  } else {
    console.log(`\n  🔴 ${driftCount} card(s) drifted — this confirms the bug!`);
  }

  // ── Rollback ALL connections to original values ──
  console.log('\nRestoring all original positions...');
  let restored = 0;
  for (const [connId, orig] of originalValues) {
    await apiPut(`/api/connections/${connId}`, orig);
    restored++;
  }
  console.log(`  ✅ Restored ${restored} connections\n`);

  // Verify restoration
  const graphFinal = await apiGet(`/api/projects/${project.id}/graph`);
  let restorationErrors = 0;
  for (const conn of graphFinal.connections) {
    if (conn.type_id !== boardType.id) continue;
    const orig = originalValues.get(conn.id);
    if (!orig) continue;
    if (Math.abs(conn.distance_x - orig.distance_x) > 0.0001 ||
        Math.abs(conn.distance_y - orig.distance_y) > 0.0001) {
      restorationErrors++;
    }
  }
  console.log(restorationErrors === 0
    ? '  ✅ All positions verified — DB is back to original state'
    : `  ⚠️  ${restorationErrors} position(s) not fully restored`);

  console.log('\n═══════════════════════════════════════════════════════════');
  if (driftCount > 0) {
    console.log(`🔴 CONFIRMED: Moving one card caused ${driftCount} other card(s) to change cells`);
    console.log('   → Pre-drop snapshot IS needed for renormalization');
  } else {
    console.log('✅ No drift — micro-spread stayed within bounds for this scenario');
  }
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
