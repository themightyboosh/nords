#!/usr/bin/env node
/**
 * REVERT CSS Modules migration — rename .module.css back to .css
 * and restore side-effect imports.
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { execSync } from 'child_process';

const ROOT = new URL('..', import.meta.url).pathname;

// Find all .module.css files
const files = execSync('find client/src -name "*.module.css"', { cwd: ROOT, encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`\n🔄 Reverting ${files.length} CSS module files back to plain .css\n`);

let renamed = 0;

for (const file of files) {
  const modulePath = join(ROOT, file);
  const plainPath = modulePath.replace('.module.css', '.css');
  const moduleBasename = basename(file);
  const plainBasename = moduleBasename.replace('.module.css', '.css');

  // 1. Remove the :global wrapper
  let content = readFileSync(modulePath, 'utf-8');
  if (content.startsWith('/* CSS Module — classes are :global until incrementally scoped */\n:global {\n')) {
    // Remove the wrapper: first line comment + `:global {` at start + `}` at end
    content = content
      .replace('/* CSS Module — classes are :global until incrementally scoped */\n:global {\n', '')
      .replace(/\n}\s*$/, '\n');
    writeFileSync(modulePath, content, 'utf-8');
    console.log(`  🧹 ${moduleBasename}: removed :global wrapper`);
  }

  // 2. Rename back to .css
  renameSync(modulePath, plainPath);
  console.log(`  📁 ${moduleBasename} → ${plainBasename}`);
  renamed++;
}

// 3. Fix all TSX imports: `import styles from './X.module.css'` → `import './X.css'`
const tsxFiles = execSync('find client/src -name "*.tsx" -o -name "*.ts" | grep -v node_modules | grep -v ".d.ts"', { cwd: ROOT, encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

let updated = 0;
for (const tsxFile of tsxFiles) {
  const tsxPath = join(ROOT, tsxFile);
  let content = readFileSync(tsxPath, 'utf-8');

  // Match: import styles from './Something.module.css';
  const moduleImportRegex = /import\s+styles\s+from\s+'([^']+)\.module\.css';/g;
  if (moduleImportRegex.test(content)) {
    content = content.replace(/import\s+styles\s+from\s+'([^']+)\.module\.css';/g, "import '$1.css';");
    writeFileSync(tsxPath, content, 'utf-8');
    console.log(`  ✏️  ${basename(tsxFile)}: import reverted`);
    updated++;
  }

  // Also fix: import '../ManageTypes/ManageTypes.module.css';
  const sideEffectModuleRegex = /import\s+'([^']+)\.module\.css';/g;
  content = readFileSync(tsxPath, 'utf-8');
  if (sideEffectModuleRegex.test(content)) {
    content = content.replace(/import\s+'([^']+)\.module\.css';/g, "import '$1.css';");
    writeFileSync(tsxPath, content, 'utf-8');
    console.log(`  ✏️  ${basename(tsxFile)}: side-effect import reverted`);
    updated++;
  }
}

console.log(`\n✅ Reverted: ${renamed} files renamed, ${updated} imports fixed\n`);
