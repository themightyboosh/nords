#!/usr/bin/env node
/**
 * CSS Modules Migration Script
 * 
 * Renames .css → .module.css and updates import statements in TSX files.
 * Does NOT rewrite className strings — that's a manual step.
 * 
 * Usage: node scripts/css-modules-migrate.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, renameSync, existsSync } from 'fs';
import { join, basename, dirname, relative } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const ROOT = new URL('..', import.meta.url).pathname;

// Files that are imported by MULTIPLE TSX files — skip these.
// They need to stay as side-effect imports because multiple components share them.
const SKIP_SHARED = new Set([
  'CanvasEngine.css',   // imported by 5 files (NordNode, GroupToolbar, etc.)
  'AuthScreen.css',     // imported by 3 files (AuthScreen, ForgotPassword, VerifyEmail)
  'PropertyField.css',  // imported by 2 files (PropertyField, DetailDrawer)
]);

// CSS files that are 1:1 with their component — safe to migrate
const MIGRATE = [
  // shared/
  { css: 'client/src/components/shared/CustomSelect.css', tsx: ['client/src/components/shared/CustomSelect.tsx'] },
  // ManageTypes/ (IconPicker.css has no direct import — skip)
  { css: 'client/src/components/ManageTypes/ManageTypes.css', tsx: ['client/src/components/ManageTypes/ManageTypes.tsx'] },
  // Layout/
  { css: 'client/src/components/Layout/ViewportHeader.css', tsx: ['client/src/components/Layout/ViewportHeader.tsx'] },
  { css: 'client/src/components/Layout/GlobalDock.css', tsx: ['client/src/components/Layout/GlobalDock.tsx'] },
  // FloatingPanel/
  { css: 'client/src/components/FloatingPanel/FloatingPanel.css', tsx: ['client/src/components/FloatingPanel/FloatingPanel.tsx'] },
  // Drawer/
  { css: 'client/src/components/Drawer/DetailDrawer.css', tsx: ['client/src/components/Drawer/DetailDrawer.tsx'] },
  { css: 'client/src/components/Drawer/GoalDetailDrawer.css', tsx: ['client/src/components/Drawer/GoalDetailDrawer.tsx'] },
  { css: 'client/src/components/Drawer/PersonaLensDrawer.css', tsx: ['client/src/components/Drawer/PersonaLensDrawer.tsx'] },
  // Canvas/
  { css: 'client/src/components/Canvas/ZoomControls.css', tsx: ['client/src/components/Canvas/ZoomControls.tsx'] },
  { css: 'client/src/components/Canvas/RadialMenu.css', tsx: ['client/src/components/Canvas/RadialMenu.tsx'] },
  { css: 'client/src/components/Canvas/GoalNode.css', tsx: ['client/src/components/Canvas/GoalCanvas.tsx', 'client/src/components/Canvas/GoalNode.tsx'] },
  // Feature components
  { css: 'client/src/components/ChatMessage/ChatMessage.css', tsx: ['client/src/components/ChatMessage/ChatMessage.tsx'] },
  { css: 'client/src/components/EmptyState/EmptyState.css', tsx: ['client/src/components/EmptyState/EmptyState.tsx'] },
  { css: 'client/src/components/ManageGoals/ManageGoals.css', tsx: ['client/src/components/ManageGoals/ManageGoals.tsx'] },
  { css: 'client/src/components/ManagePersonas/ManagePersonas.css', tsx: ['client/src/components/ManagePersonas/ManagePersonas.tsx'] },
  { css: 'client/src/components/ManageVariables/ManageVariables.css', tsx: ['client/src/components/ManageVariables/ManageVariables.tsx'] },
  { css: 'client/src/components/Matrix/MatrixView.css', tsx: ['client/src/components/Matrix/MatrixView.tsx'] },
  { css: 'client/src/components/PreviewChat/PreviewChat.css', tsx: ['client/src/components/PreviewChat/PreviewChat.tsx'] },
  { css: 'client/src/components/ProjectDashboard/ProjectDashboard.css', tsx: ['client/src/components/ProjectDashboard/ProjectDashboard.tsx'] },
  { css: 'client/src/components/ProjectSettings/ProjectSettings.css', tsx: ['client/src/components/ProjectSettings/ProjectSettings.tsx'] },
  { css: 'client/src/components/SessionExplorer/SessionExplorer.css', tsx: ['client/src/components/SessionExplorer/SessionExplorer.tsx'] },
  { css: 'client/src/components/SharePanel/SharePanel.css', tsx: ['client/src/components/SharePanel/SharePanel.tsx'] },
  { css: 'client/src/components/Spectrum/Spectrum.css', tsx: ['client/src/components/Spectrum/Spectrum1D.tsx'] },
  { css: 'client/src/components/Spectrum/SpectrumEditor.css', tsx: ['client/src/components/Spectrum/SpectrumEditor.tsx'] },
  { css: 'client/src/components/TestRunner/TestRunner.css', tsx: ['client/src/components/TestRunner/TestRunner.tsx'] },
  { css: 'client/src/components/ThemeSwitcher/ThemeSwitcher.css', tsx: ['client/src/components/ThemeSwitcher/ThemeSwitcher.tsx'] },
  { css: 'client/src/components/UserProfile/UserProfile.css', tsx: ['client/src/components/UserProfile/UserProfile.tsx'] },
  { css: 'client/src/components/Admin/ManageUIStrings.css', tsx: ['client/src/components/Admin/ManageUIStrings.tsx'] },
  // Pages
  { css: 'client/src/pages/ShareChat/ShareChat.css', tsx: ['client/src/pages/ShareChat/ShareChat.tsx'] },
];

console.log(`\n🔄 CSS Modules Migration ${DRY_RUN ? '(DRY RUN)' : ''}\n`);
console.log(`  Migrating: ${MIGRATE.length} CSS files`);
console.log(`  Skipping:  ${SKIP_SHARED.size} shared CSS files (multi-consumer)\n`);

let renamed = 0;
let updated = 0;

for (const { css, tsx: tsxFiles } of MIGRATE) {
  const cssPath = join(ROOT, css);
  const modulePath = cssPath.replace('.css', '.module.css');
  const cssBasename = basename(css);
  const moduleBasename = cssBasename.replace('.css', '.module.css');

  if (!existsSync(cssPath)) {
    console.log(`  ⚠️  SKIP (not found): ${css}`);
    continue;
  }

  // 1. Rename the CSS file
  console.log(`  📁 ${cssBasename} → ${moduleBasename}`);
  if (!DRY_RUN) {
    renameSync(cssPath, modulePath);
  }
  renamed++;

  // 2. Update import in each TSX file
  for (const tsxRel of tsxFiles) {
    const tsxPath = join(ROOT, tsxRel);
    if (!existsSync(tsxPath)) {
      console.log(`     ⚠️  TSX not found: ${tsxRel}`);
      continue;
    }

    let content = readFileSync(tsxPath, 'utf-8');
    const oldImport = `import './${cssBasename}';`;
    const newImport = `import styles from './${moduleBasename}';`;

    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      console.log(`     ✏️  ${basename(tsxRel)}: import updated`);
      if (!DRY_RUN) {
        writeFileSync(tsxPath, content, 'utf-8');
      }
      updated++;
    } else {
      // Try alternate patterns
      const altOld = `import './${cssBasename}';`;
      console.log(`     ⚠️  ${basename(tsxRel)}: import pattern not found, check manually`);
    }
  }
}

console.log(`\n✅ Done: ${renamed} files renamed, ${updated} imports updated`);
if (!DRY_RUN) {
  console.log(`\n⚡ NEXT STEP: Update className strings in each TSX file.`);
  console.log(`   Use styles.camelCaseName instead of "kebab-case-name"`);
  console.log(`   For dynamic classes, use the cx() utility from utils/cx.ts\n`);
}
