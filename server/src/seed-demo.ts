/**
 * seed-demo.ts — Comprehensive seed matching the wiki demo-project-spec.md.
 *
 * Creates the **Pulse Sense CGM — Design Control** project with:
 *   • 10 Nord Types
 *   • 8 Connection Types (with stage labels)
 *   • 5 Personas (with mental models, category weights, goal weights)
 *   • 6 Goals (with prerequisite DAG and property bindings)
 *   • 64 Nords (with intentional gaps for demo)
 *   • ~85 Connections
 *   • 4 Project Variables
 *
 * Usage:  npx tsx --env-file=.env src/seed-demo.ts
 *
 * ⚠️  This DELETES all existing projects first. Dev only.
 */

import pg from 'pg';
import { randomUUID } from 'crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const id = () => randomUUID();

/* ── Type-safe IDs (pre-generated so we can cross-reference) ── */

// Project
const PROJECT_ID = id();

// Nord Types
const NT = {
  requirement:  id(),
  subsystem:    id(),
  risk:         id(),
  testCase:     id(),
  bug:          id(),
  teamMember:   id(),
  regSub:       id(),
  clinicalProto:id(),
  adr:          id(),
  milestone:    id(),
};

// Connection Types
const CT = {
  designControl: id(),
  blocks:        id(),
  mitigates:     id(),
  assignedTo:    id(),
  verifies:      id(),
  partOf:        id(),
  reportedIn:    id(),
  relatesTo:     id(),
};

// Goals
const GOAL = {
  reqLocked:      id(),
  riskComplete:   id(),
  verifComplete:  id(),
  clinApproved:   id(),
  fivetenReady:   id(),
  fdaSubmission:  id(),
};

// Persona IDs
const PERSONA = {
  priya:  id(),
  marcus: id(),
  sarah:  id(),
  james:  id(),
  elena:  id(),
};

// Nord IDs — Requirements
const REQ = {
  r001: id(), r002: id(), r003: id(), r004: id(),
  r005: id(), r006: id(), r007: id(), r008: id(),
};

// Nord IDs — Subsystems
const SUB = {
  sensor: id(), wireless: id(), mobileApp: id(), cloud: id(), applicator: id(),
};

// Nord IDs — Risks
const RISK = {
  h001: id(), h002: id(), h003: id(), h004: id(),
  h005: id(), h006: id(), h007: id(), h008: id(),
};

// Nord IDs — Test Cases
const TC = {
  t001: id(), t002: id(), t003: id(), t004: id(), t005: id(),
  t006: id(), t007: id(), t008: id(), t009: id(), t010: id(),
};

// Nord IDs — Bugs / Nonconformances
const NC = {
  nc001: id(), nc002: id(), nc003: id(), nc004: id(), nc005: id(), nc006: id(),
};

// Nord IDs — Team Members
const TEAM = {
  priya: id(), marcus: id(), sarah: id(), james: id(),
  elena: id(), aisha: id(), tom: id(),
};

// Nord IDs — Regulatory Submissions
const REGSUB = {
  fivetenk: id(), ceMark: id(),
};

// Nord IDs — Clinical Protocols
const CP = {
  cp001: id(), cp002: id(), cp003: id(),
};

// Nord IDs — ADRs
const ADR = {
  adr001: id(), adr002: id(), adr003: id(), adr004: id(), adr005: id(),
};

// Nord IDs — Milestones
const MS = {
  ms1: id(), ms2: id(), ms3: id(), ms4: id(), ms5: id(),
};


async function run() {
  console.log('🗑️  Cleaning existing data...');

  const tables = [
    'mcp_traversals', 'mcp_session_variables', 'mcp_session_goals',
    'mcp_session_goal_events', 'mcp_session_nords', 'mcp_nord_visits',
    'mcp_messages', 'mcp_sessions',
    'comments', 'share_link_prefills', 'share_links',
    'project_access_tokens', 'snapshots', 'test_runs', 'test_scenarios',
    'user_favorites', 'nord_board_positions',
    'goal_variable_bindings', 'goal_relevant_nords', 'goal_relevant_nord_types',
    'goal_edges', 'goal_properties', 'goals',
    'project_variables',
    'persona_category_weights', 'persona_goal_weights', 'persona_mental_models', 'personas',
    'connections', 'nords', 'connection_types', 'nord_types', 'projects',
  ];
  for (const t of tables) {
    await pool.query(`DELETE FROM ${t}`);
  }

  // Get the user — accepts email as CLI arg, falls back to dev user
  const targetEmail = process.argv[2]; // e.g. npx tsx src/seed-demo.ts daniel@monumental-i.com
  let userResult;
  if (targetEmail) {
    userResult = await pool.query(`
      SELECT u.id FROM users u WHERE u.email = $1
    `, [targetEmail]);
    if (userResult.rows.length === 0) {
      console.error(`❌ User ${targetEmail} not found. Log in to the app first so the user record is created.`);
      process.exit(1);
    }
  } else {
    console.error('❌ No email provided. Usage: npx tsx src/seed-demo.ts user@example.com');
    process.exit(1);
  }
  const { id: userId } = userResult.rows[0];
  console.log(`👤 User: ${targetEmail} | ID: ${userId}`);

  /* ══════════════════════════════════════════════════════════════════════
   * PROJECT
   * ══════════════════════════════════════════════════════════════════════ */
  await pool.query(`
    INSERT INTO projects (id, name, description, purpose, icon, accent_color,
      mcp_enabled, mcp_capture_data, mcp_mutable, project_mode, goals_enabled,
      graph_only, is_demo, created_by,
      mcp_system_prompt, mcp_welcome_message, end_prompt_suggestion)
    VALUES ($1,
      'Pulse Sense CGM — Design Control',
      'Design control and regulatory pathway management for the Pulse Sense continuous glucose monitor. Covers requirements traceability, risk management (ISO 14971), verification & validation, clinical protocol management, and FDA 510(k) submission.',
      'Track the complete design control lifecycle of a Class II medical device from user needs through FDA 510(k) clearance. Manage risks, test protocols, regulatory submissions, and cross-functional team assignments.',
      'Activity', '#0EA5E9',
      true, true, true, 'guided', true,
      false, true, $2,
      'You are an expert medical device regulatory and engineering assistant working on the Pulse Sense CGM project for Meridian Medical. You understand FDA 510(k) processes, ISO 14971 risk management, IEC 62304 software lifecycle, and design control requirements. Always reference specific requirements, risks, and test cases by their IDs.',
      'Welcome to the Pulse Sense CGM design control session. I can see the complete project graph including requirements, risks, test cases, and the FDA submission pathway. What would you like to work on?',
      'Would you like me to summarize the gaps remaining for FDA submission readiness?')
  `, [PROJECT_ID, userId]);

  console.log('  ✅ Project created');

  /* ══════════════════════════════════════════════════════════════════════
   * NORD TYPES (10)
   * ══════════════════════════════════════════════════════════════════════ */
  const nordTypes = [
    { id: NT.requirement, name: 'Requirement', icon: 'ClipboardCheck', color: '#3B82F6',
      desc: 'User needs, design inputs, and design outputs that define the device requirements.',
      schema: [
        { name: 'Requirement ID', type: 'short_text', required: true, card_row: 1 },
        { name: 'Category', type: 'select', options: ['User Need', 'Design Input', 'Design Output'], required: true, card_row: 2 },
        { name: 'Priority', type: 'select', options: ['Must Have', 'Should Have', 'Could Have'], required: true, card_row: 3 },
        { name: 'Verification Method', type: 'select', options: ['Test', 'Inspection', 'Analysis', 'Demonstration'], required: true, card_row: 4 },
        { name: 'Trace Status', type: 'select', options: ['Untraced', 'Partially Traced', 'Traced'], required: true, card_row: 5 },
      ]},
    { id: NT.subsystem, name: 'Subsystem', icon: 'Cpu', color: '#8B5CF6',
      desc: 'Major system components and technology modules.',
      schema: [
        { name: 'Technology Stack', type: 'short_text', card_row: 1 },
        { name: 'Supplier', type: 'short_text', card_row: 2 },
        { name: 'Risk Class', type: 'select', options: ['Class I', 'Class II', 'Class III'], required: true, card_row: 3 },
        { name: 'Interface Specification', type: 'short_text', card_row: 4 },
      ]},
    { id: NT.risk, name: 'Risk', icon: 'AlertTriangle', color: '#EF4444',
      desc: 'Identified hazards and failure modes per ISO 14971.',
      schema: [
        { name: 'Hazard ID', type: 'short_text', required: true, card_row: 1 },
        { name: 'Hazard', type: 'short_text', required: true, card_row: 2 },
        { name: 'Harm', type: 'short_text', required: true, card_row: 3 },
        { name: 'Severity', type: 'number', required: true, card_row: 4 },
        { name: 'Probability', type: 'number', required: true, card_row: 5 },
        { name: 'Risk Score', type: 'computed', card_row: 6, config: { formula: 'Severity * Probability', output_type: 'number' } },
      ]},
    { id: NT.testCase, name: 'Test Case', icon: 'FlaskConical', color: '#10B981',
      desc: 'Verification and validation test protocols.',
      schema: [
        { name: 'Test ID', type: 'short_text', required: true, card_row: 1 },
        { name: 'Test Protocol', type: 'long_text', required: true, card_row: 2 },
        { name: 'Expected Result', type: 'short_text', required: true, card_row: 3 },
        { name: 'Actual Result', type: 'short_text', required: true, card_row: 4 },
        { name: 'Pass/Fail', type: 'select', options: ['Pass', 'Fail', 'Conditional', 'Not Run'], required: true, card_row: 5 },
        { name: 'Test Date', type: 'date', card_row: 6 },
      ]},
    { id: NT.bug, name: 'Bug / Nonconformance', icon: 'Bug', color: '#F59E0B',
      desc: 'Quality issues, defects, and nonconformance reports.',
      schema: [
        { name: 'NC ID', type: 'short_text', required: true, card_row: 1 },
        { name: 'Severity', type: 'select', options: ['Critical', 'Major', 'Minor'], required: true, card_row: 2 },
        { name: 'Root Cause', type: 'long_text', required: true, card_row: 3 },
        { name: 'CAPA Required', type: 'boolean', required: true, card_row: 4 },
        { name: 'Disposition', type: 'select', options: ['Use As Is', 'Rework', 'Scrap', 'Return to Supplier'], required: true, card_row: 5 },
        { name: 'Closed Date', type: 'date', card_row: null },
      ]},
    { id: NT.teamMember, name: 'Team Member', icon: 'User', color: '#6366F1',
      desc: 'Meridian Medical team members working on the device.',
      schema: [
        { name: 'Role', type: 'short_text', required: true, card_row: 1 },
        { name: 'Department', type: 'select', options: ['Engineering', 'Regulatory', 'Clinical', 'Quality', 'Product', 'Operations'], required: true, card_row: 2 },
        { name: 'Credentials', type: 'short_text', card_row: 3 },
        { name: 'Signing Authority', type: 'boolean', card_row: 4 },
      ]},
    { id: NT.regSub, name: 'Regulatory Submission', icon: 'FileCheck', color: '#DC2626',
      desc: 'FDA and international regulatory submissions.',
      schema: [
        { name: 'Submission Type', type: 'select', options: ['510(k)', 'PMA', 'De Novo', 'CE Mark'], required: true, card_row: 1 },
        { name: 'Target Date', type: 'date', required: true, card_row: 2 },
        { name: 'Predicate Device', type: 'short_text', required: true, card_row: 3 },
        { name: 'Substantial Equivalence', type: 'long_text', required: true, card_row: 4 },
        { name: 'Status', type: 'select', options: ['Drafting', 'Internal Review', 'Submitted', 'FDA Review', 'Cleared', 'Rejected'], required: true, card_row: 5 },
        { name: 'FDA Tracking Number', type: 'short_text', card_row: null },
      ]},
    { id: NT.clinicalProto, name: 'Clinical Protocol', icon: 'Stethoscope', color: '#0EA5E9',
      desc: 'Clinical study protocols and trial management.',
      schema: [
        { name: 'Protocol ID', type: 'short_text', required: true, card_row: 1 },
        { name: 'Study Type', type: 'select', options: ['Feasibility', 'Pivotal', 'Post-Market'], required: true, card_row: 2 },
        { name: 'Sample Size', type: 'number', required: true, card_row: 3 },
        { name: 'IRB Approval Date', type: 'date', required: true, card_row: 4 },
        { name: 'Primary Endpoint', type: 'short_text', required: true, card_row: 5 },
        { name: 'Status', type: 'select', options: ['Draft', 'IRB Review', 'Active', 'Enrollment Complete', 'Closed'], required: true, card_row: 6 },
      ]},
    { id: NT.adr, name: 'Architecture Decision Record', icon: 'GitBranch', color: '#14B8A6',
      desc: 'Technical architecture decisions with rationale.',
      schema: [
        { name: 'ADR ID', type: 'short_text', required: true, card_row: 1 },
        { name: 'Context', type: 'long_text', required: true, card_row: 2 },
        { name: 'Decision', type: 'long_text', required: true, card_row: 3 },
        { name: 'Alternatives Considered', type: 'long_text', card_row: 4 },
        { name: 'Status', type: 'select', options: ['Proposed', 'Accepted', 'Superseded', 'Deprecated'], required: true, card_row: 5 },
        { name: 'Decided By', type: 'short_text', card_row: null },
      ]},
    { id: NT.milestone, name: 'Milestone', icon: 'Flag', color: '#F97316',
      desc: 'Design review gates and regulatory decision points.',
      schema: [
        { name: 'Target Date', type: 'date', required: true, card_row: 1 },
        { name: 'Gate Type', type: 'select', options: ['Design Review', 'Phase Gate', 'Submission', 'Regulatory Decision'], required: true, card_row: 2 },
        { name: 'Exit Criteria', type: 'long_text', required: true, card_row: 3 },
        { name: 'Approved By', type: 'short_text', card_row: null },
      ]},
  ];

  for (let i = 0; i < nordTypes.length; i++) {
    const t = nordTypes[i];
    await pool.query(`
      INSERT INTO nord_types (id, project_id, name, icon, accent_color, description, properties_schema, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [t.id, PROJECT_ID, t.name, t.icon, t.color, t.desc, JSON.stringify(t.schema), i + 1]);
  }
  console.log('  ✅ 10 Nord Types');

  /* ══════════════════════════════════════════════════════════════════════
   * CONNECTION TYPES (8) — with stage labels
   * ══════════════════════════════════════════════════════════════════════ */
  const connTypes = [
    { id: CT.designControl, name: 'Design Control Phase', color: '#3B82F6', icon: 'ArrowRight', style: 'solid',
      verb: 'advances through', desc: 'FDA design control waterfall phase tracking',
      xStages: ['User Need', 'Design Input', 'Design Output', 'Verification', 'Validation', 'Transfer to Production'],
      yStages: [] },
    { id: CT.blocks, name: 'Blocks', color: '#EF4444', icon: 'Ban', style: 'dashed',
      verb: 'blocks', desc: 'Dependency and blocking relationships',
      xStages: ['Soft Dependency', 'Hard Dependency', 'Critical Blocker'],
      yStages: [] },
    { id: CT.mitigates, name: 'Mitigates', color: '#10B981', icon: 'Shield', style: 'solid',
      verb: 'mitigates', desc: 'Risk mitigation and control relationships',
      xStages: ['Monitoring', 'Controls', 'Eliminates'],
      yStages: [] },
    { id: CT.assignedTo, name: 'Assigned To', color: '#6366F1', icon: 'UserCheck', style: 'dotted',
      verb: 'assigned to', desc: 'Team member work assignments',
      xStages: ['Available', 'Allocated', 'Overloaded'],
      yStages: [] },
    { id: CT.verifies, name: 'Verifies', color: '#14B8A6', icon: 'CheckCircle', style: 'solid',
      verb: 'verifies', desc: 'Test case verification of requirements',
      xStages: ['Specified', 'Protocol Ready', 'Tested', 'Accepted'],
      yStages: [] },
    { id: CT.partOf, name: 'Part Of', color: '#8B5CF6', icon: 'Layers', style: 'solid',
      verb: 'is part of', desc: 'Subsystem composition relationships',
      xStages: ['Planned', 'Integrated', 'Validated'],
      yStages: [] },
    { id: CT.reportedIn, name: 'Reported In', color: '#F59E0B', icon: 'FileWarning', style: 'dashed',
      verb: 'reported in', desc: 'Bug/NC discovered during testing',
      xStages: ['New', 'Triaged', 'Investigating', 'Resolved'],
      yStages: [] },
    { id: CT.relatesTo, name: 'Relates To', color: '#9CA3AF', icon: 'Link', style: 'dotted',
      verb: 'relates to', desc: 'General cross-cutting semantic links',
      xStages: [], yStages: [] },
  ];

  for (let i = 0; i < connTypes.length; i++) {
    const c = connTypes[i];
    await pool.query(`
      INSERT INTO connection_types (id, project_id, name, accent_color, icon, stroke_style, verb, description,
        x_stage_labels, y_stage_labels, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [c.id, PROJECT_ID, c.name, c.color, c.icon, c.style, c.verb, c.desc,
        JSON.stringify(c.xStages), JSON.stringify(c.yStages), i + 1]);
  }
  console.log('  ✅ 8 Connection Types');

  /* ══════════════════════════════════════════════════════════════════════
   * NORDS (64) — with intentional data gaps for demo
   * ══════════════════════════════════════════════════════════════════════ */

  // Helper to insert a nord
  async function insertNord(nordId: string, typeId: string, title: string, desc: string, props: Record<string, any>, px?: number, py?: number) {
    await pool.query(`
      INSERT INTO nords (id, project_id, type_id, title, description, properties, position_x, position_y, scale)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0.5)
    `, [nordId, PROJECT_ID, typeId, title, desc, JSON.stringify(props),
        px ?? (Math.random() * 0.6 + 0.2), py ?? (Math.random() * 0.6 + 0.2)]);
  }

  // ── Requirements (8) ──
  await insertNord(REQ.r001, NT.requirement, 'Continuous glucose measurement for 14 days', 'Patient needs continuous glucose data without finger pricks over a 14-day wear period.', { 'Requirement ID': 'REQ-001', 'Category': 'User Need', 'Priority': 'Must Have', 'Verification Method': 'Test', 'Trace Status': 'Traced' }, 0.1, 0.15);
  await insertNord(REQ.r002, NT.requirement, 'MARD ≤ 10% vs. laboratory reference', 'Sensor accuracy requirement: Mean Absolute Relative Difference must not exceed 10% compared to YSI laboratory reference.', { 'Requirement ID': 'REQ-002', 'Category': 'Design Input', 'Priority': 'Must Have', 'Verification Method': 'Test', 'Trace Status': 'Traced' }, 0.3, 0.15);
  await insertNord(REQ.r003, NT.requirement, 'Wireless data transmission to mobile app', 'Real-time BLE data streaming from transmitter to companion mobile application.', { 'Requirement ID': 'REQ-003', 'Category': 'Design Input', 'Priority': 'Must Have', 'Verification Method': 'Demonstration', 'Trace Status': '' }, 0.5, 0.15); // intentional gap: trace_status empty
  await insertNord(REQ.r004, NT.requirement, 'Waterproof to IP67 rating', 'Device enclosure must withstand submersion in 1m water for 30 minutes.', { 'Requirement ID': 'REQ-004', 'Category': 'Design Output', 'Priority': 'Must Have', 'Verification Method': 'Test', 'Trace Status': 'Traced' }, 0.7, 0.15);
  await insertNord(REQ.r005, NT.requirement, 'Painless sensor insertion by patient', 'Self-insertion by patient with no medical training required. Pain score ≤ 2/10.', { 'Requirement ID': 'REQ-005', 'Category': 'User Need', 'Priority': 'Must Have', 'Verification Method': '', 'Trace Status': '' }, 0.1, 0.3); // gap: verification_method + trace_status empty
  await insertNord(REQ.r006, NT.requirement, 'Alert on hypoglycemia (< 70 mg/dL)', 'Audible and visual alert when glucose reading drops below 70 mg/dL threshold.', { 'Requirement ID': 'REQ-006', 'Category': 'Design Input', 'Priority': 'Must Have', 'Verification Method': 'Test', 'Trace Status': 'Traced' }, 0.3, 0.3);
  await insertNord(REQ.r007, NT.requirement, 'Battery life ≥ 14 days continuous operation', 'Transmitter battery must last the full 14-day sensor wear period.', { 'Requirement ID': 'REQ-007', 'Category': 'Design Output', 'Priority': 'Should Have', 'Verification Method': 'Test', 'Trace Status': 'Traced' }, 0.5, 0.3);
  await insertNord(REQ.r008, NT.requirement, 'Single-use applicator for sterile deployment', 'Pre-loaded applicator for aseptic sensor insertion. EO sterilization.', { 'Requirement ID': 'REQ-008', 'Category': 'Design Output', 'Priority': 'Must Have', 'Verification Method': 'Inspection', 'Trace Status': 'Traced' }, 0.7, 0.3);

  // ── Subsystems (5) ──
  await insertNord(SUB.sensor, NT.subsystem, 'Sensor Module', 'Electrochemical enzyme electrode with glucose oxidase. Pt/AgCl reference electrode.', { 'Technology Stack': 'Electrochemical enzyme electrode, Pt/AgCl reference', 'Risk Class': 'Class II' }, 0.2, 0.5);
  await insertNord(SUB.wireless, NT.subsystem, 'Wireless Transmitter', 'BLE 5.3 SoC for continuous glucose data streaming.', { 'Technology Stack': 'BLE 5.3 SoC (Nordic nRF5340)', 'Risk Class': 'Class II' }, 0.4, 0.5);
  await insertNord(SUB.mobileApp, NT.subsystem, 'Mobile Application', 'Companion app for glucose display, alerts, and trend analysis.', { 'Technology Stack': 'React Native, HealthKit/Health Connect integration', 'Risk Class': 'Class II' }, 0.6, 0.5);
  await insertNord(SUB.cloud, NT.subsystem, 'Cloud Analytics Platform', 'Backend data pipeline for historical analysis and physician dashboards.', { 'Technology Stack': 'GCP, HIPAA-compliant data pipeline', 'Risk Class': 'Class I' }, 0.8, 0.5);
  await insertNord(SUB.applicator, NT.subsystem, 'Applicator Assembly', 'Spring-loaded insertion mechanism for sensor deployment.', { 'Technology Stack': 'Spring-loaded insertion mechanism, EO sterilization', 'Risk Class': 'Class II' }, 0.2, 0.65);

  // ── Risks (8) — Risk Score is now computed client-side from Severity × Probability ──
  await insertNord(RISK.h001, NT.risk, 'Inaccurate glucose reading', 'Sensor provides readings outside acceptable accuracy range.', { 'Hazard ID': 'HAZ-001', 'Hazard': 'Inaccurate glucose reading', 'Harm': 'Incorrect insulin dosing → hypoglycemia', 'Severity': 5, 'Probability': 2 }, 0.15, 0.75);
  await insertNord(RISK.h002, NT.risk, 'Battery thermal runaway', 'Lithium battery exceeds safe temperature during charging or operation.', { 'Hazard ID': 'HAZ-002', 'Hazard': 'Battery thermal runaway', 'Harm': 'Skin burn at application site', 'Severity': 4, 'Probability': 1 }, 0.35, 0.75);
  await insertNord(RISK.h003, NT.risk, 'BLE signal interference', 'Wireless signal interrupted by environmental RF noise.', { 'Hazard ID': 'HAZ-003', 'Hazard': 'BLE signal interference', 'Harm': 'Delayed glucose alert', 'Severity': 3, 'Probability': 3 }, 0.55, 0.75);
  await insertNord(RISK.h004, NT.risk, 'Sensor wire fracture during removal', 'Thin sensor wire breaks and remains subcutaneously.', { 'Hazard ID': 'HAZ-004', 'Hazard': 'Sensor wire fracture during removal', 'Harm': 'Retained foreign body', 'Severity': 4, 'Probability': 2 }, 0.75, 0.75);
  await insertNord(RISK.h005, NT.risk, 'Adhesive contact dermatitis', 'Skin reaction to adhesive patch material.', { 'Hazard ID': 'HAZ-005', 'Hazard': 'Adhesive contact dermatitis', 'Harm': 'Skin irritation / allergic reaction', 'Severity': 3, 'Probability': 4 }, 0.15, 0.88); // ⚠️ intentional gap
  await insertNord(RISK.h006, NT.risk, 'Data breach of glucose data', 'Unauthorized access to patient health information.', { 'Hazard ID': 'HAZ-006', 'Hazard': 'Data breach of glucose data', 'Harm': 'Patient privacy violation', 'Severity': 4, 'Probability': 2 }, 0.35, 0.88);
  await insertNord(RISK.h007, NT.risk, 'App crash during hypoglycemia alert', 'Mobile application becomes unresponsive during critical alert.', { 'Hazard ID': 'HAZ-007', 'Hazard': 'App crash during hypoglycemia alert', 'Harm': 'Missed critical alert', 'Severity': 5, 'Probability': 2 }, 0.55, 0.88);
  await insertNord(RISK.h008, NT.risk, 'Applicator misfire — incomplete insertion', 'Spring mechanism fails to fully deploy sensor.', { 'Hazard ID': 'HAZ-008', 'Hazard': 'Applicator misfire — incomplete insertion', 'Harm': 'Inaccurate readings, patient frustration', 'Severity': 3, 'Probability': 3 }, 0.75, 0.88); // ⚠️ gap

  // ── Test Cases (10) ──
  await insertNord(TC.t001, NT.testCase, 'Sensor accuracy (MARD) vs YSI reference', 'Compare CGM readings against YSI laboratory glucose analyzer across the operating range.', { 'Test ID': 'TC-001', 'Test Protocol': 'YSI comparison per CLSI POCT05', 'Expected Result': 'MARD ≤ 10%', 'Actual Result': 'MARD 8.7% across 40 subjects', 'Pass/Fail': 'Pass', 'Test Date': '2025-11-15' }, 0.15, 0.42);
  await insertNord(TC.t002, NT.testCase, '14-day continuous wear duration', 'Validate sensor survival rate across 14-day wear period.', { 'Test ID': 'TC-002', 'Test Protocol': 'N=50 subjects, daily sensor checks', 'Expected Result': '≥ 95% sensor survival at day 14', 'Actual Result': '98% sensor survival at day 14', 'Pass/Fail': 'Pass', 'Test Date': '2025-12-01' }, 0.3, 0.42);
  await insertNord(TC.t003, NT.testCase, 'IP67 waterproof immersion test', 'Submerse device at 1m depth for 30 minutes per IEC 60529.', { 'Test ID': 'TC-003', 'Test Protocol': 'IEC 60529 IP67 immersion', 'Expected Result': 'No moisture ingress', 'Actual Result': 'No moisture ingress after 30 min at 1m', 'Pass/Fail': 'Pass' }, 0.45, 0.42);
  await insertNord(TC.t004, NT.testCase, 'BLE range and reliability test', 'Validate BLE connection stability at 10m range with common interference sources.', { 'Test ID': 'TC-004', 'Test Protocol': 'BLE 5.3 range test per RF engineering SOP', 'Expected Result': '≥ 99% packet delivery at 10m' }, 0.6, 0.42); // ⚠️ gap: no actual_result, no pass_fail
  await insertNord(TC.t005, NT.testCase, 'Hypoglycemia alert latency', 'Measure time from glucose threshold crossing to alert delivery.', { 'Test ID': 'TC-005', 'Test Protocol': 'Simulated glucose ramp with threshold at 70 mg/dL', 'Expected Result': '95th percentile < 5 min', 'Actual Result': 'Mean alert time 4.2 min from threshold', 'Pass/Fail': 'Pass' }, 0.75, 0.42);
  await insertNord(TC.t006, NT.testCase, 'Battery life under continuous operation', 'Continuous BLE transmission for 14 days with hourly alert simulations.', { 'Test ID': 'TC-006', 'Test Protocol': 'Continuous discharge test per IEC 60086', 'Expected Result': '≥ 336 hours (14 days)' }, 0.15, 0.55); // ⚠️ gap: no actual_result, no pass_fail
  await insertNord(TC.t007, NT.testCase, 'Thermal safety — battery stress test', 'Battery temperature monitoring under charge/discharge cycling.', { 'Test ID': 'TC-007', 'Test Protocol': 'IEC 62133 thermal abuse test', 'Expected Result': 'Max surface temp ≤ 43°C', 'Actual Result': 'Max surface temp 38.2°C under load', 'Pass/Fail': 'Pass' }, 0.3, 0.55);
  await insertNord(TC.t008, NT.testCase, 'Sensor wire pull-force test', 'Measure force required to extract sensor wire from tissue simulant.', { 'Test ID': 'TC-008', 'Test Protocol': 'Pull-force test per internal SOP-MFG-023', 'Expected Result': 'Mean ≥ 2.0N, Min ≥ 1.5N', 'Actual Result': 'Mean pull force 2.8N, min 2.1N', 'Pass/Fail': 'Pass' }, 0.45, 0.55);
  await insertNord(TC.t009, NT.testCase, 'Applicator insertion force consistency', 'Validate spring-loaded applicator delivers consistent insertion force across lot.', { 'Test ID': 'TC-009', 'Test Protocol': 'N=100 applicators, force measurement per SOP-MFG-024', 'Expected Result': 'CV ≤ 10%, all within 2.5-4.0N' }, 0.6, 0.55); // ⚠️ gap: no actual_result, no pass_fail
  await insertNord(TC.t010, NT.testCase, 'Data encryption end-to-end verification', 'Verify AES-256-GCM encryption from transmitter through cloud pipeline.', { 'Test ID': 'TC-010', 'Test Protocol': 'Packet capture analysis, TLS inspection', 'Expected Result': 'No plaintext PHI in transit', 'Actual Result': 'AES-256-GCM verified, no plaintext in transit', 'Pass/Fail': 'Pass' }, 0.75, 0.55);

  // ── Bugs / Nonconformances (6) ──
  await insertNord(NC.nc001, NT.bug, 'Sensor drift >15% after day 10', 'Accuracy degrades significantly in final days of wear period.', { 'NC ID': 'NC-001', 'Severity': 'Critical', 'Root Cause': 'Enzyme degradation in high-humidity storage', 'CAPA Required': true, 'Disposition': 'Rework' }, 0.2, 0.18);
  await insertNord(NC.nc002, NT.bug, 'BLE disconnection on iOS 17.4', 'Intermittent BLE drops specific to iOS 17.4 background execution limits.', { 'NC ID': 'NC-002', 'Severity': 'Major', 'Root Cause': 'Apple BLE stack regression', 'CAPA Required': true }, 0.4, 0.18); // gap: no disposition
  await insertNord(NC.nc003, NT.bug, 'Adhesive residue on removal', 'Excessive adhesive remains on skin after sensor removal.', { 'NC ID': 'NC-003', 'Severity': 'Minor', 'Root Cause': 'Excess adhesive application in production', 'CAPA Required': false, 'Disposition': 'Use As Is' }, 0.6, 0.18);
  await insertNord(NC.nc004, NT.bug, 'App crash on Samsung Galaxy S24', 'React Native memory leak causes crash during extended glucose display.', { 'NC ID': 'NC-004', 'Severity': 'Major', 'Root Cause': 'Memory leak in React Native bridge', 'CAPA Required': true, 'Disposition': 'Rework' }, 0.8, 0.18);
  await insertNord(NC.nc005, NT.bug, 'Applicator spring inconsistency — lot 2024-07', 'Spring force outside specification in single production lot.', { 'NC ID': 'NC-005', 'Severity': 'Critical', 'Root Cause': 'Supplier heat treatment deviation', 'CAPA Required': true, 'Disposition': 'Scrap' }, 0.2, 0.08);
  await insertNord(NC.nc006, NT.bug, 'Cloud dashboard latency >30s', 'Web dashboard takes over 30 seconds to load historical glucose data.', { 'NC ID': 'NC-006', 'Severity': 'Minor' }, 0.4, 0.08); // ⚠️ gap: no root_cause, no capa_required, no disposition

  // ── Team Members (7) ──
  await insertNord(TEAM.priya, NT.teamMember, 'Dr. Priya Sharma', 'VP Regulatory Affairs. 15 years in regulatory strategy.', { 'Role': 'VP Regulatory Affairs', 'Department': 'Regulatory', 'Credentials': 'RAC, former FDA reviewer', 'Signing Authority': true }, 0.85, 0.1);
  await insertNord(TEAM.marcus, NT.teamMember, 'Marcus Cole', 'Lead Systems Engineer. 10 years in embedded medical devices.', { 'Role': 'Lead Systems Engineer', 'Department': 'Engineering', 'Credentials': 'BSEE, 10yr embedded medical', 'Signing Authority': true }, 0.85, 0.22);
  await insertNord(TEAM.sarah, NT.teamMember, 'Sarah Kim', 'Clinical Affairs Director. PhD in Biomedical Engineering.', { 'Role': 'Clinical Affairs Director', 'Department': 'Clinical', 'Credentials': 'PhD Biomedical Engineering', 'Signing Authority': true }, 0.85, 0.34);
  await insertNord(TEAM.james, NT.teamMember, 'James Okonkwo', 'Quality Assurance Manager. ISO 13485 Lead Auditor.', { 'Role': 'Quality Assurance Manager', 'Department': 'Quality', 'Credentials': 'ISO 13485 Lead Auditor', 'Signing Authority': true }, 0.85, 0.46);
  await insertNord(TEAM.elena, NT.teamMember, 'Elena Vasquez', 'Product Director. 9 years in medtech product management.', { 'Role': 'Product Director', 'Department': 'Product', 'Credentials': 'MBA, 9yr medtech product', 'Signing Authority': false }, 0.85, 0.58);
  await insertNord(TEAM.aisha, NT.teamMember, 'Dr. Aisha Patel', 'Sensor Design Engineer. PhD Electrochemistry.', { 'Role': 'Sensor Design Engineer', 'Department': 'Engineering', 'Credentials': 'PhD Electrochemistry', 'Signing Authority': false }, 0.85, 0.7);
  await insertNord(TEAM.tom, NT.teamMember, 'Tom Nguyen', 'Software Engineer. IEC 62304 certified.', { 'Role': 'Software Engineer', 'Department': 'Engineering', 'Credentials': 'BSCS, IEC 62304 certified', 'Signing Authority': false }, 0.85, 0.82);

  // ── Regulatory Submissions (2) ──
  await insertNord(REGSUB.fivetenk, NT.regSub, '510(k) Submission', 'FDA 510(k) submission for Pulse Sense CGM — Class II medical device.', { 'Submission Type': '510(k)', 'Predicate Device': 'Dexcom G7 (K221803)', 'Status': 'Drafting' }, 0.5, 0.92); // gap: no target_date, no substantial_equivalence
  await insertNord(REGSUB.ceMark, NT.regSub, 'CE Mark Submission', 'European conformity assessment for Pulse Sense CGM.', { 'Submission Type': 'CE Mark', 'Status': 'Drafting' }, 0.65, 0.92); // gap: no target_date, no predicate_device, no substantial_equivalence

  // ── Clinical Protocols (3) ──
  await insertNord(CP.cp001, NT.clinicalProto, 'Sensor accuracy pivotal study', 'Multi-site pivotal study comparing CGM accuracy against YSI reference.', { 'Protocol ID': 'CP-001', 'Study Type': 'Pivotal', 'Sample Size': 350, 'IRB Approval Date': '2026-03-15', 'Primary Endpoint': 'MARD vs. YSI reference ≤ 10%', 'Status': 'Active' }, 0.2, 0.92);
  await insertNord(CP.cp002, NT.clinicalProto, '14-day wear feasibility study', 'Single-site feasibility study validating sensor survival over wear period.', { 'Protocol ID': 'CP-002', 'Study Type': 'Feasibility', 'Sample Size': 30, 'Primary Endpoint': 'Sensor survival rate at day 14', 'Status': 'IRB Review' }, 0.35, 0.92); // gap: no irb_approval_date
  await insertNord(CP.cp003, NT.clinicalProto, 'Real-world usability study', 'Post-market usability evaluation with Type 2 diabetes patients.', { 'Protocol ID': 'CP-003', 'Study Type': 'Post-Market', 'Sample Size': 100, 'Primary Endpoint': 'System Usability Scale (SUS) ≥ 75', 'Status': 'Draft' }, 0.5, 0.05); // gap: no irb_approval_date

  // ── Architecture Decision Records (5) ──
  await insertNord(ADR.adr001, NT.adr, 'BLE vs. NFC for data transfer', 'Evaluated wireless data transfer protocol options.', { 'ADR ID': 'ADR-001', 'Context': 'Need real-time glucose streaming to mobile device. NFC requires proximity; BLE allows continuous connection.', 'Decision': 'BLE 5.3 — continuous streaming required for real-time alerts', 'Alternatives Considered': 'NFC, WiFi Direct, proprietary RF', 'Status': 'Accepted', 'Decided By': 'Marcus Cole' }, 0.1, 0.6);
  await insertNord(ADR.adr002, NT.adr, 'React Native vs. native iOS/Android', 'Evaluated mobile development framework.', { 'ADR ID': 'ADR-002', 'Context': 'Need to support both iOS and Android with limited development resources.', 'Decision': 'React Native — faster iteration, acceptable performance for CGM use case', 'Alternatives Considered': 'Native Swift + Kotlin, Flutter, Xamarin', 'Status': 'Accepted', 'Decided By': 'Tom Nguyen' }, 0.3, 0.6);
  await insertNord(ADR.adr003, NT.adr, 'Factory calibration vs. finger-prick calibration', 'Evaluated calibration approach for production CGM.', { 'ADR ID': 'ADR-003', 'Context': 'Traditional CGMs require finger-prick calibration. Factory calibration eliminates this but requires tighter manufacturing controls.', 'Decision': 'Factory calibration — critical for user experience, requires tighter manufacturing controls', 'Alternatives Considered': 'Daily finger-prick calibration, hybrid approach', 'Status': 'Accepted', 'Decided By': 'Dr. Aisha Patel' }, 0.5, 0.6);
  await insertNord(ADR.adr004, NT.adr, 'Cloud platform: GCP vs. AWS for HIPAA workloads', 'Evaluated cloud provider for healthcare data.', { 'ADR ID': 'ADR-004', 'Context': 'Patient glucose data requires HIPAA-compliant cloud infrastructure with BAA.', 'Decision': 'GCP — team expertise, Assured Workloads for HIPAA, competitive pricing', 'Alternatives Considered': 'AWS (GovCloud), Azure (Healthcare API)', 'Status': 'Accepted', 'Decided By': 'Tom Nguyen' }, 0.7, 0.6);
  await insertNord(ADR.adr005, NT.adr, 'Sensor wire material: Platinum vs. gold', 'Evaluate sensing electrode material for accuracy and biocompatibility.', { 'ADR ID': 'ADR-005', 'Context': 'Platinum offers better enzymatic response but higher cost. Gold is cheaper with adequate performance for 14-day wear.', 'Status': 'Proposed' }, 0.9, 0.6); // ⚠️ gap: no decision, no alternatives

  // ── Milestones (5) ──
  await insertNord(MS.ms1, NT.milestone, 'Design Input Review', 'Formal design review gate for requirements documentation.', { 'Target Date': '2026-02-01', 'Gate Type': 'Design Review', 'Exit Criteria': 'All user needs documented, design inputs derived, traceability matrix complete' }, 0.15, 0.05);
  await insertNord(MS.ms2, NT.milestone, 'Risk Management Review', 'Phase gate for ISO 14971 risk analysis completion.', { 'Target Date': '2026-04-15', 'Gate Type': 'Phase Gate', 'Exit Criteria': 'ISO 14971 risk analysis complete, all residual risks acceptable' }, 0.35, 0.05);
  await insertNord(MS.ms3, NT.milestone, 'Design Verification Complete', 'Phase gate for all verification protocols executed.', { 'Target Date': '2026-07-01', 'Gate Type': 'Phase Gate', 'Exit Criteria': 'All test protocols executed, results documented, no open Critical NCs' }, 0.55, 0.05);
  await insertNord(MS.ms4, NT.milestone, 'Clinical Study Completion', 'Phase gate for pivotal study enrollment and results.', { 'Target Date': '2026-11-01', 'Gate Type': 'Phase Gate', 'Exit Criteria': 'Pivotal study enrollment complete, primary endpoint met' }, 0.75, 0.05);
  await insertNord(MS.ms5, NT.milestone, '510(k) Submission', 'FDA submission gate.', { 'Gate Type': 'Submission' }, 0.9, 0.05); // ⚠️ gap: no target_date, no exit_criteria

  console.log('  ✅ 59 Nords');

  /* ══════════════════════════════════════════════════════════════════════
   * CONNECTIONS (~85)
   * ══════════════════════════════════════════════════════════════════════ */

  async function insertConn(typeId: string, srcId: string, tgtId: string, dir: string, dx: number, dy = 0.5) {
    await pool.query(`
      INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [PROJECT_ID, typeId, srcId, tgtId, dir, dx, dy]);
  }

  // ── Design Control Phase (12) ──
  await insertConn(CT.designControl, REQ.r001, SUB.sensor, 'forward', 0.0);      // User Need → 0.0
  await insertConn(CT.designControl, REQ.r005, SUB.applicator, 'forward', 0.0);   // User Need → 0.0
  await insertConn(CT.designControl, REQ.r002, SUB.sensor, 'forward', 0.25);      // Design Input → 0.25
  await insertConn(CT.designControl, REQ.r003, SUB.wireless, 'forward', 0.25);    // Design Input → 0.25
  await insertConn(CT.designControl, REQ.r006, SUB.mobileApp, 'forward', 0.25);   // Design Input → 0.25
  await insertConn(CT.designControl, REQ.r004, SUB.sensor, 'forward', 0.42);      // Design Output → 0.42
  await insertConn(CT.designControl, REQ.r007, SUB.wireless, 'forward', 0.42);    // Design Output → 0.42
  await insertConn(CT.designControl, REQ.r008, SUB.applicator, 'forward', 0.42);  // Design Output → 0.42
  await insertConn(CT.designControl, TC.t001, REQ.r002, 'forward', 0.58);         // Verification → 0.58
  await insertConn(CT.designControl, TC.t002, REQ.r001, 'forward', 0.58);
  await insertConn(CT.designControl, TC.t003, REQ.r004, 'forward', 0.58);
  await insertConn(CT.designControl, TC.t005, REQ.r006, 'forward', 0.58);

  // ── Blocks (10) ──
  await insertConn(CT.blocks, RISK.h001, REQ.r002, 'forward', 0.85);  // Critical Blocker
  await insertConn(CT.blocks, RISK.h005, REQ.r005, 'forward', 0.55);  // Hard Dependency
  await insertConn(CT.blocks, RISK.h008, REQ.r008, 'forward', 0.55);  // Hard Dependency
  await insertConn(CT.blocks, NC.nc001, TC.t002, 'forward', 0.85);    // Critical Blocker
  await insertConn(CT.blocks, NC.nc002, TC.t004, 'forward', 0.55);    // Hard Dependency
  await insertConn(CT.blocks, NC.nc005, TC.t009, 'forward', 0.85);    // Critical Blocker
  await insertConn(CT.blocks, MS.ms3, MS.ms5, 'forward', 0.55);       // Hard Dependency — verification before submission
  await insertConn(CT.blocks, CP.cp001, MS.ms4, 'forward', 0.55);     // Hard Dependency
  await insertConn(CT.blocks, REQ.r003, REQ.r006, 'forward', 0.2);    // Soft Dependency — wireless needed for alerts
  await insertConn(CT.blocks, ADR.adr005, TC.t001, 'forward', 0.2);   // Soft Dependency — material affects accuracy

  // ── Mitigates (8) ──
  await insertConn(CT.mitigates, RISK.h001, REQ.r002, 'forward', 0.55);  // Controls
  await insertConn(CT.mitigates, RISK.h002, SUB.wireless, 'forward', 0.85); // Eliminates
  await insertConn(CT.mitigates, RISK.h003, SUB.wireless, 'forward', 0.55); // Controls
  await insertConn(CT.mitigates, RISK.h004, SUB.sensor, 'forward', 0.55);   // Controls
  await insertConn(CT.mitigates, RISK.h006, SUB.cloud, 'forward', 0.85);    // Eliminates
  await insertConn(CT.mitigates, RISK.h007, SUB.mobileApp, 'forward', 0.55); // Controls
  await insertConn(CT.mitigates, RISK.h005, REQ.r005, 'forward', 0.15);     // Monitoring (no mitigation yet)
  await insertConn(CT.mitigates, RISK.h008, SUB.applicator, 'forward', 0.15); // Monitoring (no mitigation yet)

  // ── Assigned To (12) — Marcus has 7 (overloaded!) ──
  await insertConn(CT.assignedTo, REQ.r002, TEAM.marcus, 'forward', 0.75);  // Overloaded
  await insertConn(CT.assignedTo, REQ.r003, TEAM.marcus, 'forward', 0.75);
  await insertConn(CT.assignedTo, SUB.sensor, TEAM.marcus, 'forward', 0.75);
  await insertConn(CT.assignedTo, SUB.wireless, TEAM.marcus, 'forward', 0.75);
  await insertConn(CT.assignedTo, TC.t001, TEAM.marcus, 'forward', 0.75);
  await insertConn(CT.assignedTo, TC.t004, TEAM.marcus, 'forward', 0.75);
  await insertConn(CT.assignedTo, ADR.adr005, TEAM.marcus, 'forward', 0.75);
  await insertConn(CT.assignedTo, SUB.mobileApp, TEAM.tom, 'forward', 0.5);  // Allocated
  await insertConn(CT.assignedTo, NC.nc004, TEAM.tom, 'forward', 0.5);
  await insertConn(CT.assignedTo, CP.cp001, TEAM.sarah, 'forward', 0.5);
  await insertConn(CT.assignedTo, REGSUB.fivetenk, TEAM.priya, 'forward', 0.5);
  await insertConn(CT.assignedTo, RISK.h001, TEAM.aisha, 'forward', 0.5);

  // ── Verifies (10) ──
  await insertConn(CT.verifies, TC.t001, REQ.r002, 'forward', 0.85); // Accepted
  await insertConn(CT.verifies, TC.t002, REQ.r001, 'forward', 0.85);
  await insertConn(CT.verifies, TC.t003, REQ.r004, 'forward', 0.85);
  await insertConn(CT.verifies, TC.t004, REQ.r003, 'forward', 0.3);  // Specified only
  await insertConn(CT.verifies, TC.t005, REQ.r006, 'forward', 0.85);
  await insertConn(CT.verifies, TC.t006, REQ.r007, 'forward', 0.3);  // Specified
  await insertConn(CT.verifies, TC.t007, RISK.h002, 'forward', 0.85);
  await insertConn(CT.verifies, TC.t008, RISK.h004, 'forward', 0.85);
  await insertConn(CT.verifies, TC.t009, REQ.r008, 'forward', 0.3);  // Specified
  await insertConn(CT.verifies, TC.t010, RISK.h006, 'forward', 0.85);

  // ── Part Of (7) ──
  await insertConn(CT.partOf, REQ.r001, SUB.sensor, 'forward', 0.55);
  await insertConn(CT.partOf, REQ.r002, SUB.sensor, 'forward', 0.55);
  await insertConn(CT.partOf, REQ.r003, SUB.wireless, 'forward', 0.55);
  await insertConn(CT.partOf, REQ.r006, SUB.mobileApp, 'forward', 0.55);
  await insertConn(CT.partOf, REQ.r007, SUB.wireless, 'forward', 0.55);
  await insertConn(CT.partOf, ADR.adr001, SUB.wireless, 'forward', 0.35);
  await insertConn(CT.partOf, ADR.adr002, SUB.mobileApp, 'forward', 0.35);

  // ── Reported In (6) ──
  await insertConn(CT.reportedIn, NC.nc001, TC.t002, 'forward', 0.55);  // Investigating
  await insertConn(CT.reportedIn, NC.nc002, TC.t004, 'forward', 0.35);  // Triaged
  await insertConn(CT.reportedIn, NC.nc003, TC.t003, 'forward', 0.85);  // Resolved
  await insertConn(CT.reportedIn, NC.nc004, TC.t010, 'forward', 0.55);  // Investigating
  await insertConn(CT.reportedIn, NC.nc005, TC.t009, 'forward', 0.35);  // Triaged
  await insertConn(CT.reportedIn, NC.nc006, SUB.cloud, 'forward', 0.15); // New

  // ── Relates To (20) — cross-cutting semantic links ──
  await insertConn(CT.relatesTo, ADR.adr001, SUB.wireless, 'none', 0.5);
  await insertConn(CT.relatesTo, ADR.adr002, SUB.mobileApp, 'none', 0.5);
  await insertConn(CT.relatesTo, ADR.adr003, SUB.sensor, 'none', 0.5);
  await insertConn(CT.relatesTo, ADR.adr004, SUB.cloud, 'none', 0.5);
  await insertConn(CT.relatesTo, ADR.adr005, SUB.sensor, 'none', 0.5);
  await insertConn(CT.relatesTo, CP.cp001, MS.ms4, 'none', 0.5);
  await insertConn(CT.relatesTo, CP.cp002, REQ.r001, 'none', 0.5);
  await insertConn(CT.relatesTo, CP.cp003, REQ.r005, 'none', 0.5);
  await insertConn(CT.relatesTo, REGSUB.fivetenk, MS.ms5, 'none', 0.5);
  await insertConn(CT.relatesTo, REGSUB.ceMark, REGSUB.fivetenk, 'none', 0.5);
  await insertConn(CT.relatesTo, MS.ms1, REQ.r001, 'none', 0.5);
  await insertConn(CT.relatesTo, MS.ms1, REQ.r008, 'none', 0.5);
  await insertConn(CT.relatesTo, MS.ms2, RISK.h001, 'none', 0.5);
  await insertConn(CT.relatesTo, MS.ms2, RISK.h005, 'none', 0.5);
  await insertConn(CT.relatesTo, MS.ms3, TC.t001, 'none', 0.5);
  await insertConn(CT.relatesTo, MS.ms3, TC.t009, 'none', 0.5);
  await insertConn(CT.relatesTo, RISK.h003, ADR.adr001, 'none', 0.5);
  await insertConn(CT.relatesTo, RISK.h007, ADR.adr002, 'none', 0.5);
  await insertConn(CT.relatesTo, NC.nc001, RISK.h001, 'none', 0.5);
  await insertConn(CT.relatesTo, NC.nc002, RISK.h003, 'none', 0.5);

  console.log('  ✅ ~85 Connections');

  /* ══════════════════════════════════════════════════════════════════════
   * GOALS (6) — with prerequisite DAG (must be inserted before Personas)
   * ══════════════════════════════════════════════════════════════════════ */

  const goals = [
    { id: GOAL.reqLocked, name: 'Requirements Locked', icon: 'Lock', color: '#3B82F6',
      desc: 'All user needs, design inputs, and design outputs are documented with priority, verification method, and traceability status.',
      endType: null },
    { id: GOAL.riskComplete, name: 'Risk Analysis Complete', icon: 'ShieldCheck', color: '#EF4444',
      desc: 'All identified hazards have severity, probability, mitigation strategy, and residual risk documented per ISO 14971.',
      endType: null },
    { id: GOAL.verifComplete, name: 'Verification Complete', icon: 'CheckCircle', color: '#10B981',
      desc: 'All verification test cases have been executed with pass/fail results and actual results documented.',
      endType: null },
    { id: GOAL.clinApproved, name: 'Clinical Protocol Approved', icon: 'Stethoscope', color: '#0EA5E9',
      desc: 'All clinical study protocols have IRB approval and are actively enrolling.',
      endType: null },
    { id: GOAL.fivetenReady, name: '510(k) Ready', icon: 'FileCheck', color: '#DC2626',
      desc: 'The 510(k) submission document has a predicate device identified and substantial equivalence argument drafted.',
      endType: null },
    { id: GOAL.fdaSubmission, name: 'FDA Submission', icon: 'Send', color: '#F97316',
      desc: 'The 510(k) has been submitted to FDA with a tracking number and target date.',
      endType: 'continue' },
  ];

  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    await pool.query(`
      INSERT INTO goals (id, project_id, name, description, icon, accent_color, sort_order, end_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [g.id, PROJECT_ID, g.name, g.desc, g.icon, g.color, i + 1, g.endType]);
  }

  // Goal DAG edges (prerequisite chains)
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.reqLocked, GOAL.verifComplete]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.riskComplete, GOAL.verifComplete]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.verifComplete, GOAL.clinApproved]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.verifComplete, GOAL.fivetenReady]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.clinApproved, GOAL.fivetenReady]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.fivetenReady, GOAL.fdaSubmission]);

  // Goal property bindings
  for (const reqId of Object.values(REQ)) {
    for (const prop of ['Priority', 'Verification Method', 'Trace Status']) {
      await pool.query(`INSERT INTO goal_properties (id, goal_id, nord_id, property_name) VALUES ($1, $2, $3, $4)`, [id(), GOAL.reqLocked, reqId, prop]);
    }
  }
  for (const riskId of Object.values(RISK)) {
    for (const prop of ['Severity', 'Probability', 'Hazard', 'Harm']) {
      await pool.query(`INSERT INTO goal_properties (id, goal_id, nord_id, property_name) VALUES ($1, $2, $3, $4)`, [id(), GOAL.riskComplete, riskId, prop]);
    }
  }
  for (const tcId of Object.values(TC)) {
    for (const prop of ['Pass/Fail', 'Actual Result']) {
      await pool.query(`INSERT INTO goal_properties (id, goal_id, nord_id, property_name) VALUES ($1, $2, $3, $4)`, [id(), GOAL.verifComplete, tcId, prop]);
    }
  }
  for (const cpId of Object.values(CP)) {
    for (const prop of ['IRB Approval Date', 'Status']) {
      await pool.query(`INSERT INTO goal_properties (id, goal_id, nord_id, property_name) VALUES ($1, $2, $3, $4)`, [id(), GOAL.clinApproved, cpId, prop]);
    }
  }
  for (const prop of ['Predicate Device', 'Substantial Equivalence']) {
    await pool.query(`INSERT INTO goal_properties (id, goal_id, nord_id, property_name) VALUES ($1, $2, $3, $4)`, [id(), GOAL.fivetenReady, REGSUB.fivetenk, prop]);
  }
  for (const prop of ['Status', 'Target Date']) {
    await pool.query(`INSERT INTO goal_properties (id, goal_id, nord_id, property_name) VALUES ($1, $2, $3, $4)`, [id(), GOAL.fdaSubmission, REGSUB.fivetenk, prop]);
  }

  // Goal relevant nord types
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.reqLocked, NT.requirement]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.riskComplete, NT.risk]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.verifComplete, NT.testCase]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.clinApproved, NT.clinicalProto]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.fivetenReady, NT.regSub]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.fdaSubmission, NT.regSub]);

  console.log('  ✅ 6 Goals (with DAG + property bindings)');

  /* ══════════════════════════════════════════════════════════════════════
   * PERSONAS (5) — with mental models + category weights + goal weights
   * ══════════════════════════════════════════════════════════════════════ */

  const personas = [
    { id: PERSONA.priya, name: 'Dr. Priya Sharma', color: '#DC2626', temp: 0.3,
      bg: '15 years in regulatory strategy. Former FDA reviewer. Led 12 successful 510(k) submissions across Class II diagnostics.',
      motivation: 'Ensure every design decision has a clear regulatory rationale and traceability chain.',
      voice: 'Precise, citation-heavy, risk-averse. References specific FDA guidance documents and ISO standards.',
      mentalModels: [
        'FDA speaks in predicates — every claim needs a comparator',
        'Risk is the universal language between engineering and regulation',
        'Traceability is not optional — it IS the product documentation',
        'Design controls aren\'t bureaucracy — they\'re the engineering method with receipts',
        'Substantial equivalence is a legal argument, not a technical one',
      ],
      catWeights: { [CT.designControl]: 25, [CT.blocks]: 30, [CT.mitigates]: 20, [CT.verifies]: 15, [CT.assignedTo]: -10, [CT.partOf]: 0, [CT.reportedIn]: 5, [CT.relatesTo]: -5 },
      goalWeights: { [GOAL.reqLocked]: 15, [GOAL.riskComplete]: 25, [GOAL.verifComplete]: 20, [GOAL.clinApproved]: 10, [GOAL.fivetenReady]: 30, [GOAL.fdaSubmission]: 25 },
    },
    { id: PERSONA.marcus, name: 'Marcus Cole', color: '#3B82F6', temp: 0.4,
      bg: '10 years in embedded medical devices. Previously at Medtronic on insulin pump firmware. Expert in IEC 62304 software lifecycle.',
      motivation: 'Ship a reliable, maintainable system architecture that passes verification on the first attempt.',
      voice: 'Direct, technical, skeptical of shortcuts. Uses engineering precision.',
      mentalModels: [
        'Architecture absorbs requirements or requirements absorb architecture',
        'Every interface is a failure surface',
        'Test what kills, then test what annoys',
        'Technical debt in a medical device ships with the patient',
        'IEC 62304 Class C means every line of code is a liability',
      ],
      catWeights: { [CT.partOf]: 25, [CT.verifies]: 20, [CT.blocks]: 15, [CT.mitigates]: 10, [CT.designControl]: 5, [CT.assignedTo]: 10, [CT.reportedIn]: 5, [CT.relatesTo]: 0 },
      goalWeights: { [GOAL.reqLocked]: 20, [GOAL.riskComplete]: 15, [GOAL.verifComplete]: 30, [GOAL.clinApproved]: 0, [GOAL.fivetenReady]: 5, [GOAL.fdaSubmission]: 5 },
    },
    { id: PERSONA.sarah, name: 'Sarah Kim', color: '#0EA5E9', temp: 0.6,
      bg: 'PhD in Biomedical Engineering. 8 years in clinical trials for continuous monitoring devices. Managed 5 pivotal studies.',
      motivation: 'Design clinically meaningful studies that generate the evidence FDA needs while protecting patient safety.',
      voice: 'Empathetic, evidence-focused, methodical. Balances scientific rigor with patient advocacy.',
      mentalModels: [
        'The patient is the stakeholder we never meet',
        'Endpoints must be clinically meaningful, not just statistically significant',
        'IRBs protect patients from us — not from the device',
        'Post-market surveillance is where the real data lives',
        'A well-designed study answers questions we haven\'t thought to ask yet',
      ],
      catWeights: { [CT.reportedIn]: 25, [CT.verifies]: 15, [CT.relatesTo]: 10, [CT.designControl]: 5, [CT.mitigates]: 10, [CT.blocks]: 0, [CT.assignedTo]: -5, [CT.partOf]: -10 },
      goalWeights: { [GOAL.reqLocked]: 5, [GOAL.riskComplete]: 10, [GOAL.verifComplete]: 10, [GOAL.clinApproved]: 30, [GOAL.fivetenReady]: 15, [GOAL.fdaSubmission]: 10 },
    },
    { id: PERSONA.james, name: 'James Okonkwo', color: '#F59E0B', temp: 0.3,
      bg: '12 years in medical device QMS. ISO 13485 Lead Auditor. Built the quality system at two startups from scratch.',
      motivation: 'Ensure every process is documented, every nonconformance is closed, and the design history file is audit-ready.',
      voice: 'Methodical, thorough, documentation-obsessive. Phrases things as audit findings.',
      mentalModels: [
        'If it\'s not documented, it didn\'t happen',
        'CAPAs close — root causes don\'t hide',
        'Design history is the product\'s autobiography',
        'ISO 13485 is not a checklist — it\'s a philosophy of controlled chaos',
        'An audit finding is a gift — it tells you where your system is weak',
      ],
      catWeights: { [CT.verifies]: 30, [CT.assignedTo]: 15, [CT.blocks]: 10, [CT.reportedIn]: 10, [CT.designControl]: 10, [CT.mitigates]: 5, [CT.partOf]: 0, [CT.relatesTo]: -5 },
      goalWeights: { [GOAL.reqLocked]: 20, [GOAL.riskComplete]: 20, [GOAL.verifComplete]: 30, [GOAL.clinApproved]: 5, [GOAL.fivetenReady]: 15, [GOAL.fdaSubmission]: 10 },
    },
    { id: PERSONA.elena, name: 'Elena Vasquez', color: '#8B5CF6', temp: 0.7,
      bg: '9 years in medtech product management. Previously led consumer health products at Abbott. Expert in translating clinical requirements into user experiences.',
      motivation: 'Ship a device that Type 2 patients actually want to wear — not just one that passes regulatory review.',
      voice: 'Strategic, user-centric, impatient with unnecessary complexity. Uses market language.',
      mentalModels: [
        'Patients choose simplicity over precision every time',
        'Time to market is a feature — every month is a month patients don\'t have this',
        'Every regulation we exceed is a competitive moat',
        'The best medical device is one patients forget they\'re wearing',
        'Market access is the last mile — clearance means nothing without reimbursement',
      ],
      catWeights: { [CT.designControl]: 20, [CT.assignedTo]: 15, [CT.blocks]: 10, [CT.relatesTo]: 5, [CT.mitigates]: 5, [CT.verifies]: 0, [CT.partOf]: -5, [CT.reportedIn]: -5 },
      goalWeights: { [GOAL.reqLocked]: 10, [GOAL.riskComplete]: 5, [GOAL.verifComplete]: 10, [GOAL.clinApproved]: 10, [GOAL.fivetenReady]: 20, [GOAL.fdaSubmission]: 30 },
    },
  ];

  for (let i = 0; i < personas.length; i++) {
    const p = personas[i];
    await pool.query(`
      INSERT INTO personas (id, project_id, name, accent_color, background, primary_motivation, voice_and_tone, temperature, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [p.id, PROJECT_ID, p.name, p.color, p.bg, p.motivation, p.voice, p.temp, i + 1]);

    // Mental Models
    for (let j = 0; j < p.mentalModels.length; j++) {
      await pool.query(`
        INSERT INTO persona_mental_models (id, persona_id, name, body, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `, [id(), p.id, `Mental Model ${j + 1}`, p.mentalModels[j], j + 1]);
    }

    // Category Weights
    for (const [ctId, weight] of Object.entries(p.catWeights)) {
      await pool.query(`
        INSERT INTO persona_category_weights (id, persona_id, connection_type_id, weight)
        VALUES ($1, $2, $3, $4)
      `, [id(), p.id, ctId, weight]);
    }

    // Goal Weights
    for (const [goalId, weight] of Object.entries(p.goalWeights)) {
      await pool.query(`
        INSERT INTO persona_goal_weights (id, persona_id, goal_id, weight)
        VALUES ($1, $2, $3, $4)
      `, [id(), p.id, goalId, weight]);
    }
  }

  console.log('  ✅ 5 Personas (with mental models, category weights, goal weights)');

  /* ══════════════════════════════════════════════════════════════════════
   * PROJECT VARIABLES (4) — for interview/capture context
   * ══════════════════════════════════════════════════════════════════════ */
  const variables = [
    { name: 'regulatory_pathway', desc: 'Which regulatory pathway is being pursued?', type: 'select', options: ['510(k)', 'PMA', 'De Novo', 'CE Mark'], required: true },
    { name: 'target_population', desc: 'Primary patient population for the device', type: 'select', options: ['Type 1 Diabetes', 'Type 2 Diabetes', 'Gestational Diabetes', 'General Wellness'], required: true },
    { name: 'risk_tolerance', desc: 'Organizational risk appetite for regulatory timeline', type: 'select', options: ['Conservative', 'Moderate', 'Aggressive'], required: false },
    { name: 'submission_quarter', desc: 'Target quarter for FDA submission', type: 'select', options: ['Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027'], required: false },
  ];
  for (let i = 0; i < variables.length; i++) {
    const v = variables[i];
    await pool.query(`
      INSERT INTO project_variables (id, project_id, name, description, type, options, required, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [id(), PROJECT_ID, v.name, v.desc, v.type, JSON.stringify(v.options), v.required, i + 1]);
  }
  console.log('  ✅ 4 Project Variables');

  /* ══════════════════════════════════════════════════════════════════════
   * SET DEFAULT PERSONA + STAR THE PROJECT
   * ══════════════════════════════════════════════════════════════════════ */
  await pool.query(`UPDATE projects SET default_persona_id = $1 WHERE id = $2`, [PERSONA.priya, PROJECT_ID]);
  await pool.query(`INSERT INTO user_favorites (user_id, project_id) VALUES ($1, $2)`, [userId, PROJECT_ID]);

  console.log('\n⭐ Default persona: Dr. Priya Sharma');
  console.log('⭐ Project starred for dev user');

  /* ══════════════════════════════════════════════════════════════════════
   * SUMMARY
   * ══════════════════════════════════════════════════════════════════════ */
  console.log(`
╔══════════════════════════════════════════════╗
║  🎉  Pulse Sense CGM — Design Control       ║
╠══════════════════════════════════════════════╣
║  10 Nord Types                               ║
║   8 Connection Types (with stage labels)     ║
║  59 Nords (with intentional data gaps)       ║
║  ~85 Connections                             ║
║   5 Personas (mental models + weights)       ║
║   6 Goals (DAG + property bindings)          ║
║   4 Project Variables                        ║
║                                              ║
║  Mode: Guided | Goals: Enabled               ║
║  Default Persona: Dr. Priya Sharma           ║
╚══════════════════════════════════════════════╝
`);

  await pool.end();
}

run().catch(err => {
  console.error('💥 Seed failed:', err);
  process.exit(1);
});
