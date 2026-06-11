#!/usr/bin/env node
/**
 * Wrap all CSS module files in :global { ... } so existing string classNames
 * continue to work. This is the safe migration step — classes stay global
 * but the infrastructure is in place for incremental scoping.
 * 
 * Usage: node scripts/css-modules-globalize.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { globSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;

// Find all .module.css files
const { execSync } = await import('child_process');
const files = execSync('find client/src -name "*.module.css"', { cwd: ROOT, encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`\n🌐 Wrapping ${files.length} module files in :global { ... }\n`);

for (const file of files) {
  const fullPath = join(ROOT, file);
  const content = readFileSync(fullPath, 'utf-8');
  
  // Skip if already wrapped
  if (content.trimStart().startsWith(':global {')) {
    console.log(`  ⏭️  ${basename(file)}: already wrapped`);
    continue;
  }

  // Wrap entire file in :global { ... }
  // This preserves all existing class names as global (unscoped)
  const wrapped = `/* CSS Module — classes are :global until incrementally scoped */\n:global {\n${content}}\n`;
  
  writeFileSync(fullPath, wrapped, 'utf-8');
  console.log(`  ✅ ${basename(file)}: wrapped in :global`);
}

console.log(`\n✅ Done. All classes remain globally accessible.\n`);
console.log(`To scope a class, move it outside :global { } and reference via styles.className\n`);
