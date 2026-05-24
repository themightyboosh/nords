/**
 * uiStrings.ts — Centralized UI copy for admin panels.
 *
 * All user-facing descriptive text lives here for easy content management.
 * To update copy, edit this single file — no need to touch components.
 */

export const UI_STRINGS = {
  // ── Types Panel ──
  types: {
    title: 'Manage Types',
    titleNordOnly: 'Manage Types',
    titleCategoryOnly: 'Manage Categories',
    subtitle: 'Define the building blocks of your project — types shape how nords look, behave, and what data they carry.',
    subtitleNordOnly: 'Types control the icon, color, and properties schema for each kind of nord.',
    subtitleCategoryOnly: 'Categories define the relationships between nords — how they connect and what those connections mean.',
    tabNordTypes: 'Types',
    tabCategories: 'Categories',
    newNordType: 'New Type',
    newCategory: 'New Category',
    emptyNordTypes: 'No types yet. Create your first type to define what kinds of nords your project uses.',
    emptyCategories: 'No categories yet. Create a category to define how nords relate to each other.',
    emptyEditor: 'Select a type to configure its properties, icon, and color.',
    emptyEditorNoItems: 'Create your first type to get started.',
  },

  // ── Personas Panel ──
  personas: {
    title: 'Personas',
    subtitle: 'Design AI conversation partners — each with a unique voice, perspective, and set of priorities that shape how they interact.',
    emptyList: 'Create your first persona to give your AI a distinct personality and perspective.',
    emptyEditor: 'Select a persona to configure their background, motivation, and category priorities.',
  },

  // ── Goals Panel ──
  goals: {
    title: 'Goals',
    subtitle: 'Set objectives for guided sessions — the AI will steer conversations toward completing these milestones.',
    emptyList: 'No goals yet. Create a goal to give guided sessions a clear target to work toward.',
    emptyEditor: 'Select a goal to define what it looks like when it\'s achieved.',
  },
} as const;
