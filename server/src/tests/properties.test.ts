/**
 * Property System Integration Tests
 *
 * End-to-end coverage for the unified property system across every layer:
 *
 *   1. Schema CRUD — every property type can be created, updated, deleted on types
 *   2. Type-specific config — select options, required, hidden (card_row), defaults
 *   3. Shared component — same schema works for Nord types AND Connection types (categories)
 *   4. Collection variables — single-variable form with type, required, options
 *   5. Nord-level values — users can set property values on nords
 *   6. Connection-level values — users can set property values on connections
 *   7. Required validation — server enforces required properties on save
 *   8. Hidden properties — card_row=null/0 hides from UI but flows to AI
 *   9. Nord properties as read-only context — properties appear on horizon as metadata, not collection targets
 *  10. Goal completion via collections — variables bound to goals complete when filled
 *
 * Uses a SINGLE shared project to avoid Neon connection limits on serverless PG.
 * All tests create throwaway entities within this project and clean up. Re-runnable.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { nordTypesRepo, connectionTypesRepo } from '../repositories/types.js';
import * as nordsRepo from '../repositories/nords.js';
import * as connectionsRepo from '../repositories/connections.js';
import * as variablesRepo from '../repositories/variables.js';
import * as goalsRepo from '../repositories/goals.js';
import * as mcpRepo from '../repositories/mcpSessions.js';
import {
  PROPERTY_TYPES, UI_PROPERTY_TYPES, PROPERTY_TYPE_META,
  normalizePropertyType, needsOptions, LEGACY_TYPE_MAP,
} from '@nords/shared/propertyTypes';
import {
  createTestProject, createTestNordType, createTestNord,
  createTestConnectionType, createTestConnection,
  createTestVariable, createTestGoal, bindVariable,
  createTestSession, setSessionVariable, setSessionCurrentNord,
  deleteTestProject, closePool, query, queryOne,
} from './helpers.js';


// Shared project for all DB-backed tests
let projectId: string;

beforeAll(async () => {
  projectId = await createTestProject('PropertySuite');
});

afterAll(async () => {
  await deleteTestProject(projectId);
  await closePool();
});

// ══════════════════════════════════════════════════════════
// 1. Property Type Registry — Shared Module Integrity
// ══════════════════════════════════════════════════════════

describe('Property Type Registry', () => {
  it('every canonical type has metadata', () => {
    for (const type of PROPERTY_TYPES) {
      const meta = PROPERTY_TYPE_META[type];
      expect(meta, `Missing metadata for type "${type}"`).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.group).toBeTruthy();
      expect(typeof meta.needsOptions).toBe('boolean');
      expect(typeof meta.supportsDefault).toBe('boolean');
      expect(meta.icon).toBeTruthy();
    }
  });

  it('UI_PROPERTY_TYPES excludes system types', () => {
    const systemTypes = PROPERTY_TYPES.filter(t => PROPERTY_TYPE_META[t].group === 'system');
    for (const sys of systemTypes) {
      expect(UI_PROPERTY_TYPES).not.toContain(sys);
    }
    expect(UI_PROPERTY_TYPES).toContain('short_text');
    expect(UI_PROPERTY_TYPES).toContain('select');
    expect(UI_PROPERTY_TYPES).toContain('boolean');
  });

  it('legacy type normalization works', () => {
    expect(normalizePropertyType('string')).toBe('short_text');
    expect(normalizePropertyType('markdown')).toBe('long_text');
    expect(normalizePropertyType('number')).toBe('number');
    expect(normalizePropertyType('select')).toBe('select');
    expect(normalizePropertyType('nonexistent')).toBe('short_text');
  });

  it('needsOptions returns true only for select types', () => {
    expect(needsOptions('select')).toBe(true);
    expect(needsOptions('multi_select')).toBe(true);
    expect(needsOptions('short_text')).toBe(false);
    expect(needsOptions('number')).toBe(false);
    expect(needsOptions('boolean')).toBe(false);
  });
});


// ══════════════════════════════════════════════════════════
// 2. Nord Type — Create Schema with Every Property Type
// ══════════════════════════════════════════════════════════

describe('Nord Type — Property Schema CRUD', () => {
  it('creates a nord type with every UI property type', async () => {
    const schema = UI_PROPERTY_TYPES.map((type, i) => ({
      name: `prop_${type}`,
      type,
      required: false,
      card_row: i < 5 ? i + 1 : null,
    }));

    const nordType = await nordTypesRepo.create({
      user_id: 'test',
      project_id: projectId,
      name: 'All-Types Node',
      properties_schema: schema as any,
    });

    expect(nordType).toBeDefined();
    expect(nordType.properties_schema.length).toBe(UI_PROPERTY_TYPES.length);

    for (const type of UI_PROPERTY_TYPES) {
      const prop = nordType.properties_schema.find((p: any) => p.name === `prop_${type}`);
      expect(prop, `Property for type "${type}" not found`).toBeDefined();
      expect((prop as any).type).toBe(type);
    }
  });

  it('creates a select property with dropdown options', async () => {
    const schema = [{
      name: 'Priority',
      type: 'select',
      required: true,
      options: ['Low', 'Medium', 'High', 'Critical'],
      defaultValue: 'Medium',
      card_row: 1,
    }];

    const nordType = await nordTypesRepo.create({
      user_id: 'test',
      project_id: projectId,
      name: 'Select Test',
      properties_schema: schema as any,
    });

    const stored = nordType.properties_schema[0] as any;
    expect(stored.type).toBe('select');
    expect(stored.options).toEqual(['Low', 'Medium', 'High', 'Critical']);
    expect(stored.defaultValue).toBe('Medium');
    expect(stored.required).toBe(true);
  });

  it('creates a multi_select property with options', async () => {
    const nordType = await nordTypesRepo.create({
      user_id: 'test',
      project_id: projectId,
      name: 'Multi-Select Test',
      properties_schema: [{
        name: 'Tags',
        type: 'multi_select',
        options: ['Frontend', 'Backend', 'DevOps', 'Design'],
        card_row: 1,
      }] as any,
    });

    const stored = nordType.properties_schema[0] as any;
    expect(stored.type).toBe('multi_select');
    expect(stored.options).toEqual(['Frontend', 'Backend', 'DevOps', 'Design']);
  });

  it('updates property options (add/remove)', async () => {
    const nordType = await nordTypesRepo.create({
      user_id: 'test',
      project_id: projectId,
      name: 'Options Update Test',
      properties_schema: [{
        name: 'Status',
        type: 'select',
        options: ['Open', 'Closed'],
        card_row: 1,
      }] as any,
    });

    const updated = await nordTypesRepo.update(nordType.id, {
      properties_schema: [{
        name: 'Status',
        type: 'select',
        options: ['Open', 'In Progress', 'Closed', 'Archived'],
        card_row: 1,
      }] as any,
    });

    expect((updated!.properties_schema[0] as any).options).toEqual(['Open', 'In Progress', 'Closed', 'Archived']);
  });

  it('updates property type from short_text to number', async () => {
    const nordType = await nordTypesRepo.create({
      user_id: 'test',
      project_id: projectId,
      name: 'Type Change Test',
      properties_schema: [{ name: 'Score', type: 'short_text', defaultValue: 'hello', card_row: 1 }] as any,
    });

    const updated = await nordTypesRepo.update(nordType.id, {
      properties_schema: [{ name: 'Score', type: 'number', defaultValue: 42, card_row: 1 }] as any,
    });

    const prop = updated!.properties_schema[0] as any;
    expect(prop.type).toBe('number');
    expect(prop.defaultValue).toBe(42);
  });

  it('removes a property from schema', async () => {
    const nordType = await nordTypesRepo.create({
      user_id: 'test',
      project_id: projectId,
      name: 'Remove Prop Test',
      properties_schema: [
        { name: 'Keep', type: 'short_text', card_row: 1 },
        { name: 'Delete', type: 'number', card_row: 2 },
      ] as any,
    });

    const updated = await nordTypesRepo.update(nordType.id, {
      properties_schema: [{ name: 'Keep', type: 'short_text', card_row: 1 }] as any,
    });

    expect(updated!.properties_schema.length).toBe(1);
    expect((updated!.properties_schema[0] as any).name).toBe('Keep');
  });
});


// ══════════════════════════════════════════════════════════
// 3. Connection Type (Category) — Same Schema Works
// ══════════════════════════════════════════════════════════

describe('Connection Type — Property Schema (Category)', () => {
  it('creates a connection type with properties', async () => {
    const connType = await connectionTypesRepo.create({
      project_id: projectId,
      name: 'Influences',
      verb: 'influences',
      properties_schema: [
        { name: 'Weight', type: 'number', required: true, card_row: 1 },
        { name: 'Notes', type: 'long_text', required: false, card_row: 2 },
        { name: 'Priority', type: 'select', options: ['Low', 'High'], card_row: 3 },
      ] as any,
    });

    expect(connType.properties_schema.length).toBe(3);
    expect((connType.properties_schema[0] as any).name).toBe('Weight');
    expect((connType.properties_schema[2] as any).options).toEqual(['Low', 'High']);
  });

  it('updates connection type properties', async () => {
    const connType = await connectionTypesRepo.create({
      project_id: projectId,
      name: 'Depends On',
      properties_schema: [{ name: 'Strength', type: 'percentage', card_row: 1 }] as any,
    });

    const updated = await connectionTypesRepo.update(connType.id, {
      properties_schema: [
        { name: 'Strength', type: 'percentage', card_row: 1 },
        { name: 'Type', type: 'select', options: ['Hard', 'Soft'], card_row: 2 },
      ] as any,
    });

    expect(updated!.properties_schema.length).toBe(2);
    expect((updated!.properties_schema[1] as any).options).toEqual(['Hard', 'Soft']);
  });
});


// ══════════════════════════════════════════════════════════
// 4. Collection Variables — Single Variable CRUD
// ══════════════════════════════════════════════════════════

// DB-accepted types for project_variables (CHECK constraint)
const DB_VARIABLE_TYPES = ['string', 'number', 'boolean', 'date', 'select', 'multi_select', 'date_range', 'email', 'url', 'phone'] as const;

describe('Collection Variable CRUD', () => {
  it('creates a collection variable with each DB-accepted type', async () => {
    for (const type of DB_VARIABLE_TYPES) {
      const v = await variablesRepo.create({
        project_id: projectId,
        name: `collection_${type}`,
        type,
        required: type === 'select',
      });
      expect(v).toBeDefined();
      expect(v.type).toBe(type);
      expect(v.required).toBe(type === 'select');
    }
  });

  it('creates a select variable with options via repo', async () => {
    const v = await variablesRepo.create({
      project_id: projectId,
      name: 'Favorite Color',
      type: 'select',
      options: ['Red', 'Green', 'Blue'],
      required: true,
      hint: 'Pick your favorite',
    });

    expect(v.type).toBe('select');
    expect(v.options).toEqual(['Red', 'Green', 'Blue']);
    expect(v.hint).toBe('Pick your favorite');
    expect(v.required).toBe(true);
  });

  it('updates variable options', async () => {
    const v = await variablesRepo.create({
      project_id: projectId,
      name: 'Size',
      type: 'select',
      options: ['S', 'M', 'L'],
    });

    const updated = await variablesRepo.update(v.id, {
      options: ['XS', 'S', 'M', 'L', 'XL'],
    });

    expect(updated!.options).toEqual(['XS', 'S', 'M', 'L', 'XL']);
  });

  it('updates variable type', async () => {
    const v = await variablesRepo.create({
      project_id: projectId,
      name: 'Score',
      type: 'string',
    });

    const updated = await variablesRepo.update(v.id, { type: 'number' });
    expect(updated!.type).toBe('number');
  });

  it('toggles required flag', async () => {
    const v = await variablesRepo.create({
      project_id: projectId,
      name: 'Optional Field',
      type: 'string',
      required: false,
    });

    expect(v.required).toBe(false);
    const updated = await variablesRepo.update(v.id, { required: true });
    expect(updated!.required).toBe(true);
  });

  it('deletes a variable', async () => {
    const v = await variablesRepo.create({
      project_id: projectId,
      name: 'Temporary',
      type: 'string',
    });

    const deleted = await variablesRepo.remove(v.id);
    expect(deleted).toBe(true);
    const found = await variablesRepo.findById(v.id);
    expect(found).toBeNull();
  });
});


// ══════════════════════════════════════════════════════════
// 5. Nord-Level Property Values — Users Set on Nords
// ══════════════════════════════════════════════════════════

describe('Nord-Level Property Values', () => {
  it('creates a nord with property values', async () => {
    const typeId = await createTestNordType(projectId, 'Person', {
      propertiesSchema: [
        { name: 'Name', type: 'short_text', required: true, card_row: 1 },
        { name: 'Age', type: 'number', required: false, card_row: 2 },
        { name: 'Email', type: 'email', required: true, card_row: 3 },
        { name: 'Role', type: 'select', options: ['Engineer', 'Designer', 'Manager'], card_row: 4 },
        { name: 'Skills', type: 'tags', card_row: 5 },
        { name: 'Active', type: 'boolean', defaultValue: true, card_row: null },
        { name: 'Internal ID', type: 'short_text', card_row: null },
      ],
    });

    const nordId = await createTestNord(projectId, typeId, 'Alice', {
      properties: {
        Name: 'Alice Smith', Age: 30, Email: 'alice@example.com',
        Role: 'Engineer', Skills: ['React', 'TypeScript'],
        Active: true, 'Internal ID': 'EMP-001',
      },
    });

    const nord = await nordsRepo.findById(nordId);
    expect(nord).toBeDefined();
    expect((nord as any).properties.Name).toBe('Alice Smith');
    expect((nord as any).properties.Age).toBe(30);
    expect((nord as any).properties.Role).toBe('Engineer');
    expect((nord as any).properties.Skills).toEqual(['React', 'TypeScript']);
    expect((nord as any).properties['Internal ID']).toBe('EMP-001');
  });

  it('updates individual property values', async () => {
    const typeId = await createTestNordType(projectId, 'UpdPerson');
    const nordId = await createTestNord(projectId, typeId, 'Bob', {
      properties: { Name: 'Bob', Age: 25 },
    });

    const updated = await nordsRepo.update(nordId, {
      properties: { Name: 'Bob', Age: 26, Role: 'Designer' },
    });

    expect((updated as any).properties.Age).toBe(26);
    expect((updated as any).properties.Role).toBe('Designer');
  });

  it('supports all text-family types', async () => {
    const typeId = await createTestNordType(projectId, 'TextTypes', {
      propertiesSchema: [
        { name: 'Short', type: 'short_text', card_row: 1 },
        { name: 'Long', type: 'long_text', card_row: 2 },
        { name: 'Website', type: 'url', card_row: 3 },
        { name: 'Contact', type: 'email', card_row: 4 },
        { name: 'Phone', type: 'phone', card_row: 5 },
      ],
    });

    const nordId = await createTestNord(projectId, typeId, 'Text Node', {
      properties: {
        Short: 'Hello', Long: 'Markdown text.',
        Website: 'https://example.com', Contact: 'user@example.com', Phone: '+1-555-0100',
      },
    });

    const nord = await nordsRepo.findById(nordId);
    expect((nord as any).properties.Short).toBe('Hello');
    expect((nord as any).properties.Website).toBe('https://example.com');
    expect((nord as any).properties.Phone).toBe('+1-555-0100');
  });

  it('supports numeric types: number, currency, percentage', async () => {
    const typeId = await createTestNordType(projectId, 'NumTypes', {
      propertiesSchema: [
        { name: 'Count', type: 'number', card_row: 1 },
        { name: 'Price', type: 'currency', card_row: 2 },
        { name: 'Rate', type: 'percentage', card_row: 3 },
      ],
    });

    const nordId = await createTestNord(projectId, typeId, 'Metrics', {
      properties: { Count: 42, Price: 99.99, Rate: 85.5 },
    });

    const nord = await nordsRepo.findById(nordId);
    expect((nord as any).properties.Count).toBe(42);
    expect((nord as any).properties.Price).toBe(99.99);
    expect((nord as any).properties.Rate).toBe(85.5);
  });

  it('supports date and boolean types', async () => {
    const typeId = await createTestNordType(projectId, 'MiscTypes', {
      propertiesSchema: [
        { name: 'StartDate', type: 'date', card_row: 1 },
        { name: 'IsActive', type: 'boolean', card_row: 2 },
      ],
    });

    const nordId = await createTestNord(projectId, typeId, 'Dated', {
      properties: { StartDate: '2026-01-15', IsActive: false },
    });

    const nord = await nordsRepo.findById(nordId);
    expect((nord as any).properties.StartDate).toBe('2026-01-15');
    expect((nord as any).properties.IsActive).toBe(false);
  });
});


// ══════════════════════════════════════════════════════════
// 6. Connection-Level Property Values
// ══════════════════════════════════════════════════════════

describe('Connection-Level Property Values', () => {
  it('creates a connection with property values', async () => {
    const nordTypeId = await createTestNordType(projectId, 'ConnNode');
    const nordAId = await createTestNord(projectId, nordTypeId, 'Node A');
    const nordBId = await createTestNord(projectId, nordTypeId, 'Node B');

    const row = await queryOne<{ id: string }>(`
      INSERT INTO connection_types (project_id, name, properties_schema)
      VALUES ($1, 'Rated Link', $2)
      RETURNING id
    `, [
      projectId,
      JSON.stringify([
        { name: 'Rating', type: 'number', required: true, card_row: 1 },
        { name: 'Comment', type: 'long_text', card_row: 2 },
        { name: 'Category', type: 'select', options: ['A', 'B', 'C'], card_row: 3 },
      ]),
    ]);

    const connId = await createTestConnection(projectId, row!.id, nordAId, nordBId, { direction: 'forward' });
    const updated = await connectionsRepo.update(connId, {
      properties: { Rating: 8, Comment: 'Strong link', Category: 'A' },
    });

    expect((updated as any).properties.Rating).toBe(8);
    expect((updated as any).properties.Comment).toBe('Strong link');
    expect((updated as any).properties.Category).toBe('A');
  });
});


// ══════════════════════════════════════════════════════════
// 7. Hidden Properties — card_row Semantics
// ══════════════════════════════════════════════════════════

describe('Hidden Property Semantics (card_row)', () => {
  it('card_row=null means hidden; card_row>0 means visible', async () => {
    const typeId = await createTestNordType(projectId, 'HiddenTest', {
      propertiesSchema: [
        { name: 'Visible1', type: 'short_text', card_row: 1 },
        { name: 'Visible2', type: 'number', card_row: 2 },
        { name: 'Hidden1', type: 'short_text', card_row: null },
        { name: 'Hidden2', type: 'boolean', card_row: null },
      ],
    });

    const nordType = await nordTypesRepo.findById(typeId);
    const schema = nordType!.properties_schema as any[];
    const visible = schema.filter(p => p.card_row != null && p.card_row > 0);
    const hidden = schema.filter(p => p.card_row == null || p.card_row === 0);

    expect(visible.length).toBe(2);
    expect(hidden.length).toBe(2);
  });

  it('hidden properties still store and retrieve values', async () => {
    const typeId = await createTestNordType(projectId, 'StoreHidden', {
      propertiesSchema: [
        { name: 'Visible', type: 'short_text', card_row: 1 },
        { name: 'SystemTag', type: 'short_text', card_row: null },
      ],
    });

    const nordId = await createTestNord(projectId, typeId, 'Tagged', {
      properties: { Visible: 'hello', SystemTag: 'auto-classified' },
    });

    const nord = await nordsRepo.findById(nordId);
    expect((nord as any).properties.SystemTag).toBe('auto-classified');
  });

  it('toggling card_row between null and positive roundtrips correctly', async () => {
    const type = await nordTypesRepo.create({
      user_id: 'test',
      project_id: projectId,
      name: 'Toggle Test',
      properties_schema: [{ name: 'Field', type: 'short_text', card_row: 1 }] as any,
    });

    const hidden = await nordTypesRepo.update(type.id, {
      properties_schema: [{ name: 'Field', type: 'short_text', card_row: null }] as any,
    });
    expect((hidden!.properties_schema[0] as any).card_row).toBeNull();

    const shown = await nordTypesRepo.update(type.id, {
      properties_schema: [{ name: 'Field', type: 'short_text', card_row: 1 }] as any,
    });
    expect((shown!.properties_schema[0] as any).card_row).toBe(1);
  });
});


// ══════════════════════════════════════════════════════════
// 8. Nord Properties as Read-Only Context in Horizon
// ══════════════════════════════════════════════════════════

describe('Nord Properties — Read-Only Context in Horizon', () => {
  let sessionId: string;
  let nordId: string;

  beforeAll(async () => {
    const typeId = await createTestNordType(projectId, 'Collectable', {
      propertiesSchema: [
        { name: 'VisibleField', type: 'short_text', card_row: 1 },
        { name: 'HiddenField', type: 'short_text', card_row: null },
        { name: 'UserSetField', type: 'short_text', card_row: 2, source: 'user' },
      ],
    });

    nordId = await createTestNord(projectId, typeId, 'Data Point', {
      properties: { VisibleField: 'hello', UserSetField: 'admin-set' },
    });
    sessionId = await createTestSession(projectId, { startNordId: nordId });
  });

  it('nord properties appear as read-only context on current_nord', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    expect(horizon.current_nord).toBeDefined();
    expect(horizon.current_nord!.properties).toBeDefined();
    expect(horizon.current_nord!.properties.VisibleField).toBe('hello');
    expect(horizon.current_nord!.properties.UserSetField).toBe('admin-set');
  });

  it('horizon current_nord does not have remaining_schema', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    expect((horizon.current_nord as any).remaining_schema).toBeUndefined();
  });

  it('properties are contextual metadata, not collection targets', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    // Properties exist as read-only context — they inform the AI but are NOT collected via session
    expect(horizon.current_nord!.type_name).toBe('Collectable');
    expect(typeof horizon.current_nord!.properties).toBe('object');
  });
});



// ══════════════════════════════════════════════════════════
// 9. Goal Completion via Collection Variables
// ══════════════════════════════════════════════════════════

describe('Goal Completion via Collection Variables', () => {
  let selectVarId: string;
  let numberVarId: string;
  let textVarId: string;
  let goalId: string;
  let sessionId: string;

  beforeAll(async () => {
    const selectVar = await variablesRepo.create({
      project_id: projectId, name: 'Fav Color Goal', type: 'select', required: true,
    });
    selectVarId = selectVar.id;
    const numberVar = await variablesRepo.create({
      project_id: projectId, name: 'Age Goal', type: 'number', required: true,
    });
    numberVarId = numberVar.id;
    const textVar = await variablesRepo.create({
      project_id: projectId, name: 'Feedback Goal', type: 'string', required: false,
    });
    textVarId = textVar.id;

    goalId = (await createTestGoal(projectId, 'Collect Demographics'));
    await bindVariable(goalId, selectVarId, true);
    await bindVariable(goalId, numberVarId, true);
    await bindVariable(goalId, textVarId, false);

    sessionId = await createTestSession(projectId);
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });

  it('goal shows all bound variables', async () => {
    const goals = await goalsRepo.findSessionGoals(sessionId, projectId);
    expect(goals.length).toBe(1);
    expect(goals[0].variables.length).toBe(3);
  });

  it('partial collection does not complete goal', async () => {
    await setSessionVariable(sessionId, selectVarId, 'Blue');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    expect(events.filter(e => e.type === 'goal_completed').length).toBe(0);
  });

  it('filling all required variables completes goal', async () => {
    await setSessionVariable(sessionId, numberVarId, 28);
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].goal_name).toBe('Collect Demographics');
  });

  it('optional variable not needed for completion', async () => {
    const goals = await goalsRepo.findSessionGoals(sessionId, projectId);
    const goal = goals.find(g => g.goal_name === 'Collect Demographics');
    const feedbackVar = goal?.variables.find(v => v.variable_name === 'Feedback Goal');
    expect(feedbackVar?.collected).toBe(false);
    expect(goal?.status).toBe('complete');
  });
});


// ══════════════════════════════════════════════════════════
// 10. Horizon Variable Tracking — Collections via AI
// ══════════════════════════════════════════════════════════

describe('Collection Variables in Horizon', () => {
  let reqVarId: string;
  let optVarId: string;
  let selectVarId: string;
  let sessionId: string;

  beforeAll(async () => {
    reqVarId = await createTestVariable(projectId, 'Full Name H', { type: 'string', required: true });
    optVarId = await createTestVariable(projectId, 'Nickname H', { type: 'string', required: false });
    selectVarId = await createTestVariable(projectId, 'Dept H', { type: 'select', required: true });

    const nordType = await createTestNordType(projectId, 'Anchor');
    const nordId = await createTestNord(projectId, nordType, 'Start');
    sessionId = await createTestSession(projectId, { startNordId: nordId });
  });

  it('unfilled variables appear in remaining_variables', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const names = horizon.remaining_variables.map(v => v.name);
    expect(names).toContain('Full Name H');
    expect(names).toContain('Nickname H');
    expect(names).toContain('Dept H');
  });

  it('filling a variable removes it from remaining', async () => {
    await setSessionVariable(sessionId, reqVarId, 'Jane Doe');
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const names = horizon.remaining_variables.map(v => v.name);
    expect(names).not.toContain('Full Name H');
    expect(names).toContain('Dept H');
  });

  it('completion percentage tracks required variables', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    // At this point, from all session variables: Full Name H filled, Dept H not
    // But completion tracks ALL required vars in the project for this session
    expect(horizon.completion.filled).toBeGreaterThanOrEqual(1);
  });

  it('filling all required reaches higher completion', async () => {
    // Get baseline before filling
    const before = await mcpRepo.getSessionHorizon(sessionId);
    const beforePct = before.completion.percentage;

    await setSessionVariable(sessionId, selectVarId, 'Engineering');
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    // Percentage should increase after filling another required var
    expect(horizon.completion.percentage).toBeGreaterThan(beforePct);
  });
});


// ══════════════════════════════════════════════════════════
// 11. E2E: Type → Nord → Properties → AI → Goal
// ══════════════════════════════════════════════════════════

describe('E2E: Property Flow — Schema → Values → AI → Goal', () => {
  let sessionId: string;
  let nordId: string;
  let nameVarId: string;
  let emailVarId: string;

  beforeAll(async () => {
    // 1. Define type with visible + hidden properties
    const typeId = await createTestNordType(projectId, 'Contact', {
      propertiesSchema: [
        { name: 'Name', type: 'short_text', required: true, card_row: 1 },
        { name: 'Email', type: 'email', required: true, card_row: 2 },
        { name: 'Phone', type: 'phone', required: false, card_row: 3 },
        { name: 'InternalScore', type: 'number', card_row: null },
      ],
    });

    // 2. Create nord instance
    nordId = await createTestNord(projectId, typeId, 'Lead', {
      properties: { InternalScore: 85 },
    });

    // 3. Create collection variables
    nameVarId = await createTestVariable(projectId, 'Contact Name E2E', { type: 'string', required: true });
    emailVarId = await createTestVariable(projectId, 'Contact Email E2E', { type: 'email', required: true });

    // 4. Create goal
    const goalId = await createTestGoal(projectId, 'Qualify Lead', {
      achieved_prompt: 'Lead qualified with contact details.',
    });
    await bindVariable(goalId, nameVarId, true);
    await bindVariable(goalId, emailVarId, true);

    // 5. Start session
    sessionId = await createTestSession(projectId, { startNordId: nordId });
    await goalsRepo.initializeSessionGoals(sessionId, projectId, 'guided');
  });

  it('horizon shows nord properties as read-only context', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    // Properties are design-time metadata — shown as context, not collection targets
    expect(horizon.current_nord!.properties).toBeDefined();
    expect(horizon.current_nord!.properties.InternalScore).toBe(85);  // pre-filled value visible
    expect((horizon.current_nord as any).remaining_schema).toBeUndefined();
  });

  it('horizon shows unfilled collection variables', async () => {
    const horizon = await mcpRepo.getSessionHorizon(sessionId);
    const varNames = horizon.remaining_variables.map(v => v.name);
    expect(varNames).toContain('Contact Name E2E');
    expect(varNames).toContain('Contact Email E2E');
  });

  it('collecting contact name → goal still incomplete', async () => {
    await setSessionVariable(sessionId, nameVarId, 'Alice Smith');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    expect(events.filter(e => e.type === 'goal_completed').length).toBe(0);
  });

  it('collecting contact email → goal completes', async () => {
    await setSessionVariable(sessionId, emailVarId, 'alice@corp.com');
    const events = await goalsRepo.evaluateGoals(sessionId, projectId);
    const completed = events.filter(e => e.type === 'goal_completed');
    expect(completed.length).toBe(1);
    expect(completed[0].goal_name).toBe('Qualify Lead');
    expect(completed[0].achieved_prompt).toBe('Lead qualified with contact details.');
  });

  it('final state — goal complete', async () => {
    const goals = await goalsRepo.findSessionGoals(sessionId, projectId);
    const goal = goals.find(g => g.goal_name === 'Qualify Lead');
    expect(goal?.status).toBe('complete');
  });
});
