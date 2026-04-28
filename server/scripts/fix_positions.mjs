/**
 * fix_positions.mjs
 * 
 * Normalizes all nord positions to the 0-1 range expected by the graph view.
 * The seed script incorrectly wrote pixel-range values (-800 to +800) instead
 * of normalized values. This script reads all nords via the API and PATCHes
 * any whose position_x or position_y falls outside [0, 1].
 *
 * Run: node server/scripts/fix_positions.mjs
 */

const BASE = 'http://localhost:3000/api';
const PROJECT_ID = '5413fc94-3245-4153-9641-b9d025367e1d';

async function main() {
  console.log('🔧 Fixing nord positions...\n');

  // Fetch the full graph to get all nords
  const res = await fetch(`${BASE}/projects/${PROJECT_ID}/graph`);
  if (!res.ok) throw new Error(`Failed to fetch graph: ${res.status}`);
  const data = await res.json();

  const nords = data.nords || [];
  console.log(`  Found ${nords.length} nords total\n`);

  let fixed = 0;
  let skipped = 0;

  for (const nord of nords) {
    const px = nord.position_x;
    const py = nord.position_y;

    // Already normalized? Skip.
    if (px >= 0 && px <= 1 && py >= 0 && py <= 1) {
      skipped++;
      continue;
    }

    // Normalize: clamp the pixel-range values into 0-1
    // The seed used Math.random() * 1600 - 800, so range is [-800, 800]
    // Map to [0, 1]: (value + 800) / 1600
    const normX = Math.max(0, Math.min(1, (px + 800) / 1600));
    const normY = Math.max(0, Math.min(1, (py + 800) / 1600));

    // PATCH the nord via the API
    const patchRes = await fetch(`${BASE}/nords/${nord.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        position_x: normX,
        position_y: normY,
      }),
    });

    if (patchRes.ok) {
      console.log(`  ✅ Fixed: ${nord.title} (${px.toFixed(1)}, ${py.toFixed(1)}) → (${normX.toFixed(3)}, ${normY.toFixed(3)})`);
      fixed++;
    } else {
      console.log(`  ❌ Failed: ${nord.title} — ${patchRes.status}`);
    }
  }

  console.log(`\n📊 Done: ${fixed} fixed, ${skipped} already normalized (${nords.length} total)`);
}

main().catch(err => {
  console.error('💥 Error:', err.message);
  process.exit(1);
});
