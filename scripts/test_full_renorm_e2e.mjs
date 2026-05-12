#!/usr/bin/env node
/**
 * test_full_renorm_e2e.mjs — End-to-end test of the complete drop flow:
 *   1. Capture pre-drop snapshot
 *   2. Micro-spread (causes drift)
 *   3. Renormalize with snapshot (corrects drift)
 *   4. Verify ALL unmoved cards stayed in their original cells
 *   5. Restore original DB state
 *
 * Usage: node scripts/test_full_renorm_e2e.mjs
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

/** Mirrors captureGridSnapshot from boardRenormalize.ts */
function captureSnapshot(graph, typeId, xLabels, yLabels, dirFilter) {
  const snap = new Map();
  const isQ = yLabels.length > 0;
  const accX = new Map();
  const accY = new Map();
  for (const conn of graph.connections) {
    if (conn.type_id !== typeId) continue;
    if (dirFilter !== 'all' && conn.direction !== dirFilter) continue;
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      const ax = accX.get(nid) || { sum: 0, count: 0 };
      ax.sum += conn.distance_x ?? 0.5; ax.count++;
      accX.set(nid, ax);
      const ay = accY.get(nid) || { sum: 0, count: 0 };
      ay.sum += conn.distance_y ?? 0.5; ay.count++;
      accY.set(nid, ay);
    }
  }
  for (const [nid, ax] of accX) {
    const dx = ax.sum / ax.count;
    const ay = accY.get(nid) || { sum: 0.5, count: 1 };
    const dy = ay.sum / ay.count;
    const col = resolveStageLabel(dx, xLabels);
    if (!col) continue;
    const row = isQ ? (resolveStageLabel(dy, yLabels) || yLabels[0]?.label) : null;
    snap.set(nid, { col, row });
  }
  return snap;
}

/** Mirrors renormalizeGridPositions from boardRenormalize.ts */
async function renormalize(graph, typeId, xLabels, yLabels, dirFilter, movedNordId, preSnap) {
  const EPSILON = 0.001;
  const isQ = yLabels.length > 0;
  const nordMap = new Map();

  for (const conn of graph.connections) {
    if (conn.type_id !== typeId) continue;
    if (dirFilter !== 'all' && conn.direction !== dirFilter) continue;
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      let e = nordMap.get(nid);
      if (!e) { e = { nordId: nid, connIds: [], distX: 0, distY: 0, sortOrder: 0 }; nordMap.set(nid, e); }
      if (!e.connIds.includes(conn.id)) e.connIds.push(conn.id);
    }
  }

  for (const e of nordMap.values()) {
    let sx = 0, sy = 0, ct = 0;
    for (const cid of e.connIds) {
      const c = graph.connections.find(cc => cc.id === cid);
      if (!c) continue;
      sx += c.distance_x ?? 0.5; sy += c.distance_y ?? 0.5; ct++;
    }
    if (ct > 0) { e.distX = sx / ct; e.distY = sy / ct; }
    const ords = e.connIds.map(cid => { const c = graph.connections.find(cc => cc.id === cid); return c?.sort_order ?? 0; });
    e.sortOrder = Math.min(...ords);
  }

  // Build mover's protected connection set
  const moverConnSet = new Set();
  if (movedNordId) {
    const me = nordMap.get(movedNordId);
    if (me) for (const cid of me.connIds) moverConnSet.add(cid);
  }

  // Step 2: Drift correction
  let corrections = 0;
  if (preSnap && movedNordId) {
    for (const e of nordMap.values()) {
      if (e.nordId === movedNordId) continue;
      const orig = preSnap.get(e.nordId);
      if (!orig) continue;
      const curCol = resolveStageLabel(e.distX, xLabels);
      const curRow = isQ ? (resolveStageLabel(e.distY, yLabels) || yLabels[0]?.label) : null;
      const colDrifted = curCol !== orig.col;
      const rowDrifted = isQ && curRow !== orig.row;
      if (colDrifted || rowDrifted) {
        const xb = getColumnBounds(orig.col, xLabels);
        const yb = orig.row ? getColumnBounds(orig.row, yLabels) : null;
        const patch = {};
        if (colDrifted) { patch.distance_x = xb.center; e.distX = xb.center; }
        if (rowDrifted && yb) { patch.distance_y = yb.center; e.distY = yb.center; }
        for (const cid of e.connIds) {
          if (moverConnSet.has(cid)) continue;
          await apiPut(`/api/connections/${cid}`, patch);
          corrections++;
        }
      }
    }
  }

  // Step 3: Re-spread within cells (protecting mover's connections)
  const movedConnIds = new Set();
  if (movedNordId) {
    const me = nordMap.get(movedNordId);
    if (me) for (const cid of me.connIds) movedConnIds.add(cid);
  }

  const cells = new Map();
  for (const e of nordMap.values()) {
    const col = resolveStageLabel(e.distX, xLabels);
    if (!col) continue;
    const row = isQ ? (resolveStageLabel(e.distY, yLabels) || yLabels[0]?.label) : null;
    const key = row ? `${col}|${row}` : col;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(e);
  }

  for (const [key, cards] of cells) {
    cards.sort((a, b) => a.sortOrder - b.sortOrder);
    const n = cards.length;
    const parts = key.split('|');
    const xb = getColumnBounds(parts[0], xLabels);
    const yb = parts[1] ? getColumnBounds(parts[1], yLabels) : null;

    for (let i = 0; i < n; i++) {
      const c = cards[i];
      const ix = n === 1 ? xb.center : xb.min + ((i + 1) / (n + 1)) * (xb.max - xb.min);
      const iy = yb ? (n === 1 ? yb.center : yb.min + ((i + 1) / (n + 1)) * (yb.max - yb.min)) : c.distY;
      const dxC = Math.abs(c.distX - ix) > EPSILON;
      const dyC = yb ? Math.abs(c.distY - iy) > EPSILON : false;
      if (dxC || dyC) {
        const patch = {};
        if (dxC) patch.distance_x = ix;
        if (dyC) patch.distance_y = iy;
        for (const cid of c.connIds) {
          if (movedConnIds.has(cid)) continue;
          await apiPut(`/api/connections/${cid}`, patch);
          corrections++;
        }
      }
    }
  }
  return corrections;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  Full E2E Test: Snapshot → Micro-spread → Renorm → Verify');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const projects = await apiGet('/api/projects');
  const project = projects[0];
  const graph = await apiGet(`/api/projects/${project.id}/graph`);
  const nordNames = new Map(graph.nords.map(n => [n.id, n.title || 'Untitled']));

  const boardType = graph.connection_types.find(ct =>
    normalizeStageLabels(ct.x_stage_labels).length >= 2
  );
  if (!boardType) { console.log('❌ No board-capable type'); return; }

  const xLabels = normalizeStageLabels(boardType.x_stage_labels);
  const yLabels = normalizeStageLabels(boardType.y_stage_labels || []);
  const isQ = yLabels.length > 0;
  const dirFilter = 'all';

  console.log(`Board: "${boardType.name}" — ${xLabels.length} cols × ${yLabels.length || 1} rows\n`);

  // Save ALL original values for rollback
  const origValues = new Map();
  for (const c of graph.connections) {
    if (c.type_id !== boardType.id) continue;
    origValues.set(c.id, { distance_x: c.distance_x, distance_y: c.distance_y });
  }

  // Build card cell map
  const cardCells = new Map();
  const cardConns = new Map();
  for (const conn of graph.connections) {
    if (conn.type_id !== boardType.id) continue;
    for (const nid of [conn.source_nord_id, conn.target_nord_id]) {
      if (!cardConns.has(nid)) cardConns.set(nid, { ids: [], sumX: 0, sumY: 0, ct: 0, sorts: [] });
      const e = cardConns.get(nid);
      if (!e.ids.includes(conn.id)) {
        e.ids.push(conn.id);
        e.sumX += conn.distance_x ?? 0.5;
        e.sumY += conn.distance_y ?? 0.5;
        e.ct++;
        e.sorts.push(conn.sort_order ?? 0);
      }
    }
  }
  for (const [nid, d] of cardConns) {
    const dx = d.sumX / d.ct, dy = d.sumY / d.ct;
    const col = resolveStageLabel(dx, xLabels);
    const row = isQ ? (resolveStageLabel(dy, yLabels) || yLabels[0]?.label) : null;
    cardCells.set(nid, { col, row, dx, dy, connIds: d.ids, sortOrder: Math.min(...d.sorts) });
  }

  // Find most populated cell
  const buckets = new Map();
  for (const [nid, c] of cardCells) {
    const k = c.row ? `${c.col}|${c.row}` : c.col;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(nid);
  }
  let targetKey = null, maxN = 0;
  for (const [k, nids] of buckets) { if (nids.length > maxN) { maxN = nids.length; targetKey = k; } }
  const targetParts = targetKey.split('|');
  const targetCol = targetParts[0], targetRow = targetParts[1] || null;
  const residents = buckets.get(targetKey);

  // Find a mover NOT in target cell
  let moverNordId = null;
  for (const [nid, c] of cardCells) {
    const k = c.row ? `${c.col}|${c.row}` : c.col;
    if (k !== targetKey) { moverNordId = nid; break; }
  }
  if (!moverNordId) { console.log('❌ Cannot find a card outside target cell'); return; }

  const moverName = nordNames.get(moverNordId);
  console.log(`Target cell: "${targetKey}" (${residents.length} cards)`);
  console.log(`Mover: "${moverName}" → into target cell\n`);

  // ══════════════════════════════════════════════════════════════
  // PHASE 1: Pre-drop snapshot
  // ══════════════════════════════════════════════════════════════
  console.log('PHASE 1: Capturing pre-drop snapshot...');
  const preSnap = captureSnapshot(graph, boardType.id, xLabels, yLabels, dirFilter);
  console.log(`  Captured ${preSnap.size} card positions\n`);

  // ══════════════════════════════════════════════════════════════
  // PHASE 2: Micro-spread (same as MatrixView.handleCellDrop)
  // ══════════════════════════════════════════════════════════════
  console.log('PHASE 2: Executing micro-spread...');
  const xBounds = getColumnBounds(targetCol, xLabels);
  const yBounds = targetRow ? getColumnBounds(targetRow, yLabels) : null;

  const moverCell = cardCells.get(moverNordId);
  const roster = [
    ...residents.map(nid => ({ nid, connIds: cardCells.get(nid).connIds, sortOrder: cardCells.get(nid).sortOrder })),
    { nid: moverNordId, connIds: moverCell.connIds, sortOrder: 99999 },
  ].sort((a, b) => a.sortOrder - b.sortOrder);

  const n = roster.length;
  let writeCount = 0;
  for (let i = 0; i < n; i++) {
    const card = roster[i];
    const sX = n === 1 ? xBounds.center : xBounds.min + ((i + 1) / (n + 1)) * (xBounds.max - xBounds.min);
    const sY = yBounds ? (n === 1 ? yBounds.center : yBounds.min + ((i + 1) / (n + 1)) * (yBounds.max - yBounds.min)) : 0.5;
    for (const cid of card.connIds) {
      await apiPut(`/api/connections/${cid}`, { distance_x: sX, distance_y: sY });
      writeCount++;
    }
  }
  console.log(`  Wrote ${writeCount} connection updates\n`);

  // Check drift BEFORE renorm
  const graphMidway = await apiGet(`/api/projects/${project.id}/graph`);
  const midSnap = captureSnapshot(graphMidway, boardType.id, xLabels, yLabels, dirFilter);
  let preDriftCount = 0;
  for (const [nid, orig] of preSnap) {
    if (nid === moverNordId) continue;
    const mid = midSnap.get(nid);
    if (!mid) continue;
    if (mid.col !== orig.col || mid.row !== orig.row) preDriftCount++;
  }
  console.log(`  Drift BEFORE renorm: ${preDriftCount} card(s) changed cells\n`);

  // ══════════════════════════════════════════════════════════════
  // PHASE 3: Renormalize with pre-drop snapshot
  // ══════════════════════════════════════════════════════════════
  console.log('PHASE 3: Running renormalization with pre-drop snapshot...');
  const freshGraph = await apiGet(`/api/projects/${project.id}/graph`);
  const corrected = await renormalize(freshGraph, boardType.id, xLabels, yLabels, dirFilter, moverNordId, preSnap);
  console.log(`  Corrections applied: ${corrected}\n`);

  // ══════════════════════════════════════════════════════════════
  // PHASE 4: Verify — no unmoved card should have changed cells
  // ══════════════════════════════════════════════════════════════
  console.log('PHASE 4: Final verification...');
  const finalGraph = await apiGet(`/api/projects/${project.id}/graph`);
  const finalSnap = captureSnapshot(finalGraph, boardType.id, xLabels, yLabels, dirFilter);

  // Build the mover's connection set for checking shared connections
  const moverConns = new Set();
  for (const c of finalGraph.connections) {
    if (c.type_id !== boardType.id) continue;
    if (c.source_nord_id === moverNordId || c.target_nord_id === moverNordId) {
      moverConns.add(c.id);
    }
  }

  let realDriftCount = 0;
  let expectedDriftCount = 0;
  for (const [nid, orig] of preSnap) {
    if (nid === moverNordId) continue;
    const fin = finalSnap.get(nid);
    if (!fin) continue;
    if (fin.col !== orig.col || fin.row !== orig.row) {
      // Check if ALL this card's connections are shared with the mover
      const cardConns = [];
      for (const c of finalGraph.connections) {
        if (c.type_id !== boardType.id) continue;
        if (c.source_nord_id === nid || c.target_nord_id === nid) {
          cardConns.push(c.id);
        }
      }
      const allShared = cardConns.length > 0 && cardConns.every(cid => moverConns.has(cid));

      if (allShared) {
        expectedDriftCount++;
        console.log(`  ℹ️  "${nordNames.get(nid)}" moved with mover (shares all connections) — EXPECTED`);
      } else {
        realDriftCount++;
        console.log(`  ⚠️  "${nordNames.get(nid)}" DRIFTED independently: "${orig.col}|${orig.row}" → "${fin.col}|${fin.row}"`);
      }
    }
  }

  // Verify mover IS in target cell
  const moverFinal = finalSnap.get(moverNordId);
  const moverInTarget = moverFinal && moverFinal.col === targetCol && (!targetRow || moverFinal.row === targetRow);

  console.log('');
  if (moverInTarget) console.log('  ✅ Mover card arrived in target cell');
  else console.log(`  ❌ Mover NOT in target cell: "${moverFinal?.col}|${moverFinal?.row}"`);
  
  if (realDriftCount === 0) console.log('  ✅ No independent drift — all unmoved cards stayed in their cells');
  else console.log(`  ❌ ${realDriftCount} card(s) drifted independently`);
  
  if (expectedDriftCount > 0) console.log(`  ℹ️  ${expectedDriftCount} card(s) correctly moved with mover (shared connections)`);


  // ══════════════════════════════════════════════════════════════
  // PHASE 5: Restore
  // ══════════════════════════════════════════════════════════════
  console.log('\nPHASE 5: Restoring original DB state...');
  for (const [cid, orig] of origValues) {
    await apiPut(`/api/connections/${cid}`, orig);
  }
  console.log(`  ✅ Restored ${origValues.size} connections\n`);

  // ══════════════════════════════════════════════════════════════
  // RESULT
  // ══════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Drift BEFORE renorm:  ${preDriftCount} card(s)`);
  console.log(`  Independent drift:    ${realDriftCount} card(s)`);
  console.log(`  Expected co-movement: ${expectedDriftCount} card(s) (share connections with mover)`);
  console.log(`  Mover in target:      ${moverInTarget ? 'YES' : 'NO'}`);
  console.log('');
  if (realDriftCount === 0 && moverInTarget) {
    console.log('  ✅ PASS — Renormalization corrected all independent drift');
  } else {
    console.log('  🔴 FAIL — Renormalization did not fix all drift');
  }
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
