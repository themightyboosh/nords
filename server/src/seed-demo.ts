/**
 * seed-demo.ts — Comprehensive seed matching the wiki demo-project-spec.md.
 *
 * Creates the **Pulse Sense CGM — Design Control** project with:
 *   • 10 Nord Types (with hidden props + defaultValues)
 *   • 8 Connection Types (with stage labels + properties_schema + verbs)
 *   • 5 Personas (with mental models, category weights, goal weights)
 *   • 12 Goals (with complex prerequisite DAG, AND/OR gates, exclusive forks, achieved prompts, variable bindings, relevant nords)
 *   • 59 Nords (with intentional gaps for demo)
 *   • ~85 Connections (with typed properties)
 *   • 15 Project Variables (3 boolean, 5 select, 3 number, 2 string)
 *   • 5 Test Scenarios (persona-aligned, story-driven)
 *
 * Usage:  npx tsx --env-file=.env src/seed-demo.ts user@example.com
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

// Goals (13 — complex DAG with 4 roots + 1 independent intake goal)
const GOAL = {
  userIntake:        id(),
  reqLocked:         id(),
  riskComplete:      id(),
  bioCompatCleared:  id(),
  archDecided:       id(),
  verifComplete:     id(),
  supplyChainQual:   id(),
  clinApproved:      id(),
  designTransfer:    id(),
  fivetenReady:      id(),
  mfgValidation:     id(),
  regFiling:         id(),
  fdaSubmission:     id(),
};

// Persona IDs
const PERSONA = {
  priya:  id(),
  marcus: id(),
  sarah:  id(),
  james:  id(),
  elena:  id(),
};

// Variable IDs (pre-generated for goal bindings)
const VAR = {
  regulatoryPathway:          id(),
  targetPopulation:           id(),
  predicateDevice:            id(),
  submissionQuarter:          id(),
  riskTolerance:              id(),
  highestRiskSubsystem:       id(),
  biocompatibilityConfirmed:  id(),
  irbStatus:                  id(),
  primaryEndpointMet:         id(),
  enrollmentTarget:           id(),
  softwareClassification:     id(),
  allTestsExecuted:           id(),
  openCriticalNcs:            id(),
  marketLaunchRegion:         id(),
  reimbursementStrategy:      id(),
  userName:                   id(),
  userEmail:                  id(),
};

// Nord IDs — Requirements
const REQ = {
  r001: id(), r002: id(), r003: id(), r004: id(),
  r005: id(), r006: id(), r007: id(), r008: id(),
};

// Nord IDs — Subsystems
const SUB = {
  sensor: id(), wireless: id(), mobileApp: id(), cloud: id(), applicator: id(), firmware: id(),
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
  adr001: id(), adr002: id(), adr003: id(), adr004: id(), adr005: id(), adr006: id(),
};

// Collection Group IDs
const CG = {
  intake: id(), regulatory: id(), risk: id(), clinical: id(), engineering: id(), business: id(),
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
    'goal_edges', 'goals',
    'project_variables', 'collection_groups',
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
      'You are an expert medical device regulatory and engineering assistant working on the Pulse Sense CGM project for Meridian Medical. You understand FDA 510(k) processes, ISO 14971 risk management, IEC 62304 software lifecycle, and design control requirements. Always reference specific requirements, risks, and test cases by their IDs.\\n\\nNAVIGATE organically — follow persona-weighted connections and verbs to explore the graph. The topology tells you where to go.\\nCOLLECT aggressively — at each stop, actively drive conversation to collect remaining collection variables. Use the description field on each variable to phrase your questions naturally. Nord properties are read-only context — do NOT try to fill or update them.\\nSAVE immediately — call save tools as soon as you learn a value. Do not wait.\\nGoals are milestones you notice in the rearview mirror, not destinations on your GPS. When the current nord is goal-relevant, you have permission to probe harder.',
      'Welcome to the Pulse Sense CGM design control session. I have the full graph loaded — 8 requirements, 8 risks, 10 test cases, 6 subsystems, 3 clinical protocols, and your 510(k) submission docs. I can trace any requirement to its tests, assess risk mitigations, check verification status, or identify submission gaps. What are you working on today?',
      'Should I walk through the remaining gaps for FDA submission readiness?')
  `, [PROJECT_ID, userId]);

  console.log('  ✅ Project created');

  /* ══════════════════════════════════════════════════════════════════════
   * NORD TYPES (10) — with hidden props + defaultValues
   * ══════════════════════════════════════════════════════════════════════ */
  const nordTypes = [
    { id: NT.requirement, name: 'Requirement', icon: 'ClipboardCheck', color: '#3B82F6',
      desc: 'User needs, design inputs, and design outputs that define the device requirements.',
      schema: [
        { name: 'Requirement ID', type: 'short_text', required: true, card_row: 1, description: 'Unique identifier for the requirement (e.g., REQ-001). Used to trace requirements through design control phases.' },
        { name: 'Category', type: 'select', options: ['User Need', 'Design Input', 'Design Output'], required: true, card_row: 2, description: 'Classification of the requirement in the design control waterfall: User Need (what the user wants), Design Input (engineering specification), or Design Output (verifiable deliverable).' },
        { name: 'Priority', type: 'select', options: ['Must Have', 'Should Have', 'Could Have'], required: true, defaultValue: 'Should Have', card_row: 3, description: 'MoSCoW priority level. Must Have requirements are non-negotiable for regulatory clearance. Should Have items are expected for launch. Could Have items are stretch goals.' },
        { name: 'Verification Method', type: 'select', options: ['Test', 'Inspection', 'Analysis', 'Demonstration'], required: true, card_row: 4, description: 'How this requirement will be verified per FDA design controls: physical testing, visual inspection, engineering analysis, or functional demonstration.' },
        { name: 'Trace Status', type: 'select', options: ['Untraced', 'Partially Traced', 'Traced'], required: true, defaultValue: 'Untraced', card_row: 5, description: 'How far along is requirements traceability — untraced means no links to test cases exist, partially traced means some links, traced means fully linked to verification evidence.' },
        { name: 'DHR Reference', type: 'short_text', hidden: true, card_row: null, description: 'Design History Record cross-reference for audit trail purposes.' },
      ]},
    { id: NT.subsystem, name: 'Subsystem', icon: 'Cpu', color: '#8B5CF6',
      desc: 'Major system components and technology modules.',
      schema: [
        { name: 'Technology Stack', type: 'short_text', card_row: 1, description: 'The core technology platform or framework used in this subsystem (e.g., BLE 5.3, ARM Cortex-M4, React Native).' },
        { name: 'Supplier', type: 'short_text', card_row: 2, description: 'The vendor or manufacturer supplying the key components for this subsystem.' },
        { name: 'Risk Class', type: 'select', options: ['Class I', 'Class II', 'Class III'], required: true, defaultValue: 'Class II', card_row: 3, description: 'FDA device classification for this subsystem based on its risk profile. Class II requires 510(k) clearance.' },
        { name: 'Interface Specification', type: 'short_text', card_row: 4, description: 'Reference to the interface control document that defines how this subsystem communicates with others.' },
      ]},
    { id: NT.risk, name: 'Risk', icon: 'AlertTriangle', color: '#EF4444',
      desc: 'Identified hazards and failure modes per ISO 14971.',
      schema: [
        { name: 'Hazard ID', type: 'short_text', required: true, card_row: 1, description: 'Unique hazard identifier from the risk management file (e.g., HAZ-001). Used to trace risk through the mitigation chain.' },
        { name: 'Hazard', type: 'short_text', required: true, card_row: 2, description: 'Brief description of the hazardous situation — what can go wrong (e.g., sensor drift causing inaccurate glucose reading).' },
        { name: 'Harm', type: 'short_text', required: true, card_row: 3, description: 'The potential injury or damage to the patient if the hazard occurs (e.g., insulin overdose, hypoglycemia).' },
        { name: 'Severity', type: 'number', required: true, defaultValue: 3, card_row: 4, description: 'Severity rating per ISO 14971 (1=negligible, 2=minor, 3=serious, 4=critical, 5=catastrophic). Higher numbers mean more serious potential harm.' },
        { name: 'Probability', type: 'number', required: true, defaultValue: 2, card_row: 5, description: 'Probability of occurrence (1=improbable, 2=remote, 3=occasional, 4=probable, 5=frequent). Combined with severity to calculate risk score.' },
        { name: 'Risk Score', type: 'computed', card_row: 6, config: { formula: 'Severity * Probability', output_type: 'number' }, description: 'Calculated risk priority number (Severity × Probability). Scores ≥12 are unacceptable and require mitigation.' },
        { name: 'FMEA Reference', type: 'short_text', hidden: true, card_row: null, description: 'Cross-reference to the Failure Mode and Effects Analysis document.' },
      ]},
    { id: NT.testCase, name: 'Test Case', icon: 'FlaskConical', color: '#10B981',
      desc: 'Verification and validation test protocols.',
      schema: [
        { name: 'Test ID', type: 'short_text', required: true, card_row: 1, description: 'Unique test identifier (e.g., TC-001). Links back to the requirement being verified.' },
        { name: 'Test Protocol', type: 'long_text', required: true, card_row: 2, description: 'Step-by-step procedure for executing the test, including setup conditions, equipment needed, and measurement methods.' },
        { name: 'Expected Result', type: 'short_text', required: true, card_row: 3, description: 'The acceptance criteria — what result constitutes a pass (e.g., MARD ≤10% across reference range).' },
        { name: 'Actual Result', type: 'short_text', required: true, card_row: 4, description: 'The measured result from test execution. Compare against Expected Result to determine pass/fail.' },
        { name: 'Pass/Fail', type: 'select', options: ['Pass', 'Fail', 'Conditional', 'Not Run'], required: true, defaultValue: 'Not Run', card_row: 5, description: 'Overall test verdict. Pass=met acceptance criteria, Fail=did not meet criteria, Conditional=passed with deviations, Not Run=test not yet executed.' },
        { name: 'Test Date', type: 'date', card_row: 6, description: 'Date the test was last executed. Required for the design history file timeline.' },
        { name: 'LIMS Sample ID', type: 'short_text', hidden: true, card_row: null, description: 'Laboratory Information Management System sample tracking number.' },
      ]},
    { id: NT.bug, name: 'Bug / Nonconformance', icon: 'Bug', color: '#F59E0B',
      desc: 'Quality issues, defects, and nonconformance reports.',
      schema: [
        { name: 'NC ID', type: 'short_text', required: true, card_row: 1, description: 'Nonconformance report number (e.g., NC-001). Used to track quality issues through investigation and closure.' },
        { name: 'Severity', type: 'select', options: ['Critical', 'Major', 'Minor'], required: true, defaultValue: 'Major', card_row: 2, description: 'Impact classification. Critical=patient safety risk or regulatory block, Major=significant quality impact, Minor=cosmetic or documentation issue.' },
        { name: 'Root Cause', type: 'long_text', required: true, card_row: 3, description: 'The fundamental reason the nonconformance occurred, identified through investigation (e.g., 5 Whys, Ishikawa). Required for CAPA.' },
        { name: 'CAPA Required', type: 'boolean', required: true, card_row: 4, description: 'Whether this NC requires a formal Corrective and Preventive Action. All Critical NCs require CAPA. Major NCs require review.' },
        { name: 'Disposition', type: 'select', options: ['Use As Is', 'Rework', 'Scrap', 'Return to Supplier'], required: true, defaultValue: 'Rework', card_row: 5, description: 'Material review board decision for the affected items: use as is, rework to specification, scrap, or return to supplier.' },
        { name: 'Closed Date', type: 'date', card_row: null, description: 'Date the NC investigation was completed and the disposition was executed.' },
        { name: 'CAPA Tracking ID', type: 'short_text', hidden: true, card_row: null, description: 'Link to the CAPA record in the quality management system.' },
      ]},
    { id: NT.teamMember, name: 'Team Member', icon: 'User', color: '#6366F1',
      desc: 'Meridian Medical team members working on the device.',
      schema: [
        { name: 'Role', type: 'short_text', required: true, card_row: 1, description: 'The person\'s functional role on the project (e.g., Lead Systems Engineer, Regulatory Specialist, Clinical Monitor).' },
        { name: 'Department', type: 'select', options: ['Engineering', 'Regulatory', 'Clinical', 'Quality', 'Product', 'Operations'], required: true, card_row: 2, description: 'Organizational department the team member belongs to. Determines signing authority scope.' },
        { name: 'Credentials', type: 'short_text', card_row: 3, description: 'Professional credentials and certifications (e.g., PhD, PE, RAC, CQA) relevant to their signing authority.' },
        { name: 'Signing Authority', type: 'boolean', card_row: 4, description: 'Whether this person has authority to sign design control documents (design reviews, test reports, risk assessments).' },
      ]},
    { id: NT.regSub, name: 'Regulatory Submission', icon: 'FileCheck', color: '#DC2626',
      desc: 'FDA and international regulatory submissions.',
      schema: [
        { name: 'Submission Type', type: 'select', options: ['510(k)', 'PMA', 'De Novo', 'CE Mark'], required: true, card_row: 1, description: 'The regulatory pathway being pursued. 510(k) for substantial equivalence, PMA for novel devices, De Novo for new low-risk categories, CE Mark for EU market.' },
        { name: 'Target Date', type: 'date', required: true, card_row: 2, description: 'Planned submission date to the regulatory body. Drives the project timeline backwards.' },
        { name: 'Predicate Device', type: 'short_text', required: true, card_row: 3, description: 'The legally marketed device used as the basis for substantial equivalence (e.g., Dexcom G7 — K221803). Critical for 510(k) strategy.' },
        { name: 'Substantial Equivalence', type: 'long_text', required: true, card_row: 4, description: 'The argument for why this device is substantially equivalent to the predicate — covering intended use, technological characteristics, and performance data.' },
        { name: 'Status', type: 'select', options: ['Drafting', 'Internal Review', 'Submitted', 'FDA Review', 'Cleared', 'Rejected'], required: true, defaultValue: 'Drafting', card_row: 5, description: 'Current status in the submission lifecycle. Tracks from initial drafting through FDA review to final clearance decision.' },
        { name: 'FDA Tracking Number', type: 'short_text', card_row: null, description: 'FDA-assigned tracking number received after submission (e.g., K240XXX).' },
        { name: 'eCTD Module Reference', type: 'short_text', hidden: true, card_row: null, description: 'Electronic Common Technical Document module reference for structured submissions.' },
      ]},
    { id: NT.clinicalProto, name: 'Clinical Protocol', icon: 'Stethoscope', color: '#0EA5E9',
      desc: 'Clinical study protocols and trial management.',
      schema: [
        { name: 'Protocol ID', type: 'short_text', required: true, card_row: 1, description: 'Unique clinical protocol identifier (e.g., CP-001). Used for IRB tracking and regulatory cross-reference.' },
        { name: 'Study Type', type: 'select', options: ['Feasibility', 'Pivotal', 'Post-Market'], required: true, card_row: 2, description: 'Study phase: Feasibility for early-stage evidence, Pivotal for the registration study submitted to FDA, Post-Market for surveillance after clearance.' },
        { name: 'Sample Size', type: 'number', required: true, card_row: 3, description: 'Target number of enrolled subjects. Must be statistically powered for the primary endpoint.' },
        { name: 'IRB Approval Date', type: 'date', required: true, card_row: 4, description: 'Date the Institutional Review Board approved the protocol. Enrollment cannot begin without IRB approval.' },
        { name: 'Primary Endpoint', type: 'short_text', required: true, card_row: 5, description: 'The main clinical outcome measure (e.g., MARD ≤10% across 40-400 mg/dL). FDA evaluates the device primarily on this metric.' },
        { name: 'Status', type: 'select', options: ['Draft', 'IRB Review', 'Active', 'Enrollment Complete', 'Closed'], required: true, defaultValue: 'Draft', card_row: 6, description: 'Current study status. Draft=being written, IRB Review=submitted for ethics review, Active=enrolling/collecting data, Enrollment Complete=target met, Closed=study finalized.' },
      ]},
    { id: NT.adr, name: 'Architecture Decision Record', icon: 'GitBranch', color: '#14B8A6',
      desc: 'Technical architecture decisions with rationale.',
      schema: [
        { name: 'ADR ID', type: 'short_text', required: true, card_row: 1, description: 'Unique identifier for the architecture decision (e.g., ADR-001). Used to trace technical decisions to their rationale.' },
        { name: 'Context', type: 'long_text', required: true, card_row: 2, description: 'The forces and constraints that led to this decision — what problem needed solving and what factors influenced the choice.' },
        { name: 'Decision', type: 'long_text', required: true, card_row: 3, description: 'The specific technical decision made. Should be unambiguous and actionable (e.g., "Use BLE 5.3 over ANT+ for sensor-to-transmitter communication").' },
        { name: 'Alternatives Considered', type: 'long_text', card_row: 4, description: 'Other options that were evaluated and rejected, with brief rationale for why each was not chosen.' },
        { name: 'Status', type: 'select', options: ['Proposed', 'Accepted', 'Superseded', 'Deprecated'], required: true, defaultValue: 'Proposed', card_row: 5, description: 'Lifecycle state: Proposed=under review, Accepted=approved and active, Superseded=replaced by a newer decision, Deprecated=no longer relevant.' },
        { name: 'Decided By', type: 'short_text', card_row: null, description: 'The person or committee who made the final decision, for accountability and audit purposes.' },
      ]},
    { id: NT.milestone, name: 'Milestone', icon: 'Flag', color: '#F97316',
      desc: 'Design review gates and regulatory decision points.',
      schema: [
        { name: 'Target Date', type: 'date', required: true, card_row: 1, description: 'Planned date for the milestone review or gate decision. Drives upstream task scheduling.' },
        { name: 'Gate Type', type: 'select', options: ['Design Review', 'Phase Gate', 'Submission', 'Regulatory Decision'], required: true, card_row: 2, description: 'Type of milestone: Design Review for technical assessments, Phase Gate for stage-gate decisions, Submission for regulatory filings, Regulatory Decision for FDA responses.' },
        { name: 'Exit Criteria', type: 'long_text', required: true, card_row: 3, description: 'Specific conditions that must be met to pass through this gate. All criteria must be satisfied before proceeding to the next phase.' },
        { name: 'Approved By', type: 'short_text', card_row: null, description: 'Name of the person who signed off on the gate review, confirming all exit criteria were met.' },
      ]},
  ];

  for (let i = 0; i < nordTypes.length; i++) {
    const t = nordTypes[i];
    await pool.query(`
      INSERT INTO nord_types (id, project_id, name, icon, accent_color, description, properties_schema, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [t.id, PROJECT_ID, t.name, t.icon, t.color, t.desc, JSON.stringify(t.schema), i + 1]);
  }
  console.log('  ✅ 10 Nord Types (with hidden props + defaultValues)');

  /* ══════════════════════════════════════════════════════════════════════
   * CONNECTION TYPES (8) — with stage labels, verbs, properties_schema
   * ══════════════════════════════════════════════════════════════════════ */
  const connTypes = [
    { id: CT.designControl, name: 'Design Control Phase', color: '#3B82F6', icon: 'ArrowRight', style: 'solid',
      verb: 'advances through', desc: 'FDA design control waterfall phase tracking',
      defaultDir: 'forward', measurementMode: 'spectrum',
      xStages: ['User Need', 'Design Input', 'Design Output', 'Verification', 'Validation', 'Transfer to Production'],
      yStages: [],
      propSchema: [
        { name: 'Review Status', type: 'select', options: ['Not Reviewed', 'Pending Review', 'Approved', 'Rejected'], defaultValue: 'Not Reviewed', description: 'Current review state of this design control phase transition. Approved means the gate review passed.' },
        { name: 'Reviewer', type: 'short_text', defaultValue: 'Unassigned', description: 'Person responsible for reviewing and approving this phase transition.' },
        { name: 'Review Date', type: 'short_text', description: 'Date the phase transition review was completed or is scheduled.' },
        { name: 'DHR Trace ID', type: 'short_text', hidden: true, description: 'Design History Record trace identifier for audit trail.' },
      ] },
    { id: CT.blocks, name: 'Blocks', color: '#EF4444', icon: 'Ban', style: 'dashed',
      verb: 'blocks', desc: 'Dependency and blocking relationships',
      defaultDir: 'forward', measurementMode: 'spectrum',
      xStages: ['Soft Dependency', 'Hard Dependency', 'Critical Blocker'],
      yStages: [],
      propSchema: [
        { name: 'Severity', type: 'select', options: ['Informational', 'Schedule Impact', 'Critical Path'], defaultValue: 'Schedule Impact', description: 'How severely this blocker impacts the project. Critical Path means the project timeline cannot advance until resolved.' },
        { name: 'Estimated Resolution', type: 'short_text', description: 'Target date or timeframe for resolving this blocker (e.g., "2 weeks", "Q3 2026").' },
        { name: 'Workaround Available', type: 'select', options: ['Yes', 'No', 'Partial'], defaultValue: 'No', description: 'Whether a temporary workaround exists to proceed despite the blocker.' },
        { name: 'Jira Reference', type: 'short_text', hidden: true, description: 'Link to the Jira ticket tracking this blocker.' },
      ] },
    { id: CT.mitigates, name: 'Mitigates', color: '#10B981', icon: 'Shield', style: 'solid',
      verb: 'mitigates', desc: 'Risk mitigation and control relationships',
      defaultDir: 'forward', measurementMode: 'spectrum',
      xStages: ['Monitoring', 'Controls', 'Eliminates'],
      yStages: [],
      propSchema: [
        { name: 'Mitigation Type', type: 'select', options: ['Elimination', 'Substitution', 'Engineering Control', 'Administrative Control', 'PPE'], defaultValue: 'Engineering Control', description: 'Type of risk control per ISO 14971 hierarchy of controls. Elimination is preferred; PPE is last resort.' },
        { name: 'Residual Risk Acceptable', type: 'select', options: ['Yes', 'No', 'Under Review'], defaultValue: 'Under Review', description: 'Whether the remaining risk after mitigation is acceptable per the risk management plan.' },
        { name: 'Verification Method', type: 'short_text', defaultValue: 'Test', description: 'How the effectiveness of this mitigation will be verified (e.g., test, analysis, inspection).' },
        { name: 'ISO 14971 Section', type: 'short_text', hidden: true, description: 'Applicable section of ISO 14971 risk management standard.' },
      ] },
    { id: CT.assignedTo, name: 'Assigned To', color: '#6366F1', icon: 'UserCheck', style: 'dotted',
      verb: 'assigned to', desc: 'Team member work assignments',
      defaultDir: 'forward', measurementMode: 'spectrum',
      xStages: ['Available', 'Allocated', 'Overloaded'],
      yStages: [],
      propSchema: [
        { name: 'Allocation %', type: 'number', defaultValue: 50, description: 'Percentage of the team member\'s capacity allocated to this work item. Over 100% total indicates overload.' },
        { name: 'Role in Task', type: 'select', options: ['Lead', 'Reviewer', 'Contributor', 'Approver'], defaultValue: 'Contributor', description: 'The team member\'s responsibility level: Lead drives the work, Reviewer checks it, Contributor supports, Approver signs off.' },
        { name: 'Start Date', type: 'short_text', description: 'When the team member was assigned to or started working on this item.' },
        { name: 'HR System Ref', type: 'short_text', hidden: true, description: 'Human resources system cross-reference for capacity tracking.' },
      ] },
    { id: CT.verifies, name: 'Verifies', color: '#14B8A6', icon: 'CheckCircle', style: 'solid',
      verb: 'verifies', desc: 'Test case verification of requirements',
      defaultDir: 'forward', measurementMode: 'spectrum',
      xStages: ['Specified', 'Protocol Ready', 'Tested', 'Accepted'],
      yStages: [],
      propSchema: [
        { name: 'Verification Status', type: 'select', options: ['Not Started', 'In Progress', 'Complete', 'Failed'], defaultValue: 'Not Started', description: 'Current state of the verification activity linking this test case to its requirement.' },
        { name: 'Test Evidence Summary', type: 'long_text', defaultValue: 'See attached test report', description: 'Brief summary of the test evidence or reference to the full test report document.' },
        { name: 'Retest Required', type: 'select', options: ['Yes', 'No'], defaultValue: 'No', description: 'Whether a retest is needed due to protocol deviations, equipment calibration issues, or failed results.' },
        { name: 'LIMS Reference', type: 'short_text', hidden: true, description: 'Laboratory Information Management System reference for the test samples.' },
      ] },
    { id: CT.partOf, name: 'Part Of', color: '#8B5CF6', icon: 'Layers', style: 'solid',
      verb: 'is part of', desc: 'Subsystem composition relationships',
      defaultDir: 'forward', measurementMode: 'spectrum',
      xStages: ['Planned', 'Integrated', 'Validated'],
      yStages: [],
      propSchema: [
        { name: 'Integration Status', type: 'select', options: ['Planned', 'In Progress', 'Integrated', 'Validated'], defaultValue: 'Planned', description: 'How far along is the integration of this component into the parent subsystem.' },
        { name: 'Interface Doc Ref', type: 'short_text', description: 'Reference to the interface control document governing this integration.' },
        { name: 'BOM Line Item', type: 'short_text', hidden: true, description: 'Bill of Materials line item number for procurement tracking.' },
      ] },
    { id: CT.reportedIn, name: 'Reported In', color: '#F59E0B', icon: 'FileWarning', style: 'dashed',
      verb: 'reported in', desc: 'Bug/NC discovered during testing',
      defaultDir: 'forward', measurementMode: 'spectrum',
      xStages: ['New', 'Triaged', 'Investigating', 'Resolved'],
      yStages: [],
      propSchema: [
        { name: 'Discovery Method', type: 'select', options: ['Automated Test', 'Manual Test', 'Field Report', 'Code Review'], defaultValue: 'Manual Test', description: 'How the bug or nonconformance was discovered. Field Reports indicate post-market issues.' },
        { name: 'Reproducibility', type: 'select', options: ['Always', 'Intermittent', 'Rare', 'Cannot Reproduce'], defaultValue: 'Always', description: 'How reliably the issue can be reproduced in a controlled environment.' },
        { name: 'Environment', type: 'short_text', defaultValue: 'Lab bench', description: 'The test environment where the issue was observed (e.g., lab bench, clinical site, field).' },
        { name: 'Bugzilla Reference', type: 'short_text', hidden: true, description: 'Bug tracking system cross-reference number.' },
      ] },
    { id: CT.relatesTo, name: 'Relates To', color: '#9CA3AF', icon: 'Link', style: 'dotted',
      verb: 'relates to', desc: 'General cross-cutting semantic links',
      defaultDir: 'none', measurementMode: 'none',
      xStages: [], yStages: [],
      propSchema: [
        { name: 'Relationship Type', type: 'select', options: ['Informs', 'Constrains', 'Duplicates', 'Supersedes'], defaultValue: 'Informs', description: 'Nature of the semantic relationship: Informs=provides context, Constrains=limits options, Duplicates=same issue, Supersedes=replaces.' },
        { name: 'Notes', type: 'long_text', description: 'Free-text explanation of why these items are related and what the relationship means for the project.' },
      ] },
  ];

  for (let i = 0; i < connTypes.length; i++) {
    const c = connTypes[i];
    await pool.query(`
      INSERT INTO connection_types (id, project_id, name, accent_color, icon, stroke_style, verb, description,
        default_direction, measurement_mode, x_stage_labels, y_stage_labels, properties_schema, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [c.id, PROJECT_ID, c.name, c.color, c.icon, c.style, c.verb, c.desc,
        c.defaultDir, c.measurementMode,
        JSON.stringify(c.xStages), JSON.stringify(c.yStages),
        JSON.stringify(c.propSchema), i + 1]);
  }
  console.log('  ✅ 8 Connection Types (with properties_schema + verbs)');

  /* ══════════════════════════════════════════════════════════════════════
   * NORDS (59) — with intentional data gaps for demo
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
  await insertNord(SUB.firmware, NT.subsystem, 'Firmware', 'Embedded firmware running on the wireless transmitter MCU. Controls sensor sampling, BLE data packaging, power management, and local alarm logic.', { 'Technology Stack': 'C/C++ on Nordic nRF5340, Zephyr RTOS, IEC 62304 Class C', 'Risk Class': 'Class II' }, 0.4, 0.65);

  // ── Risks (8) — Risk Score is now computed client-side from Severity × Probability ──
  await insertNord(RISK.h001, NT.risk, 'Inaccurate glucose reading', 'Sensor provides readings outside acceptable accuracy range.', { 'Hazard ID': 'HAZ-001', 'Hazard': 'Inaccurate glucose reading', 'Harm': 'Incorrect insulin dosing → hypoglycemia', 'Severity': 5, 'Probability': 2 }, 0.15, 0.75);
  await insertNord(RISK.h002, NT.risk, 'Battery thermal runaway', 'Lithium battery overheats during continuous operation.', { 'Hazard ID': 'HAZ-002', 'Hazard': 'Battery thermal runaway', 'Harm': 'Skin burn at application site', 'Severity': 4, 'Probability': 1 }, 0.35, 0.75);
  await insertNord(RISK.h003, NT.risk, 'BLE signal interference', 'Wireless connection drops in high-interference environments.', { 'Hazard ID': 'HAZ-003', 'Hazard': 'BLE signal interference', 'Harm': 'Delayed glucose alert', 'Severity': 3, 'Probability': 3 }, 0.55, 0.75);
  await insertNord(RISK.h004, NT.risk, 'Sensor wire fracture during removal', 'Thin sensor wire breaks during device removal from skin.', { 'Hazard ID': 'HAZ-004', 'Hazard': 'Sensor wire fracture during removal', 'Harm': 'Retained foreign body', 'Severity': 4, 'Probability': 2 }, 0.75, 0.75);
  await insertNord(RISK.h005, NT.risk, 'Adhesive contact dermatitis', 'Skin adhesive causes allergic reaction in sensitive patients.', { 'Hazard ID': 'HAZ-005', 'Hazard': 'Adhesive contact dermatitis', 'Harm': 'Skin irritation / allergic reaction', 'Severity': 3, 'Probability': 4 }, 0.15, 0.88); // ⚠️ gap: no mitigation
  await insertNord(RISK.h006, NT.risk, 'Data breach of glucose data', 'Unauthorized access to patient health information.', { 'Hazard ID': 'HAZ-006', 'Hazard': 'Data breach of glucose data', 'Harm': 'Patient privacy violation', 'Severity': 4, 'Probability': 2 }, 0.35, 0.88);
  await insertNord(RISK.h007, NT.risk, 'App crash during hypoglycemia alert', 'Mobile application becomes unresponsive during critical alert.', { 'Hazard ID': 'HAZ-007', 'Hazard': 'App crash during hypoglycemia alert', 'Harm': 'Missed critical alert', 'Severity': 5, 'Probability': 2 }, 0.55, 0.88);
  await insertNord(RISK.h008, NT.risk, 'Applicator misfire — incomplete insertion', 'Spring mechanism fails to fully deploy sensor.', { 'Hazard ID': 'HAZ-008', 'Hazard': 'Applicator misfire — incomplete insertion', 'Harm': 'Inaccurate readings, patient frustration', 'Severity': 3, 'Probability': 3 }, 0.75, 0.88); // ⚠️ gap: no mitigation

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
  await insertNord(ADR.adr006, NT.adr, 'Substantial Equivalence Rationale', 'Documents the substantial equivalence argument comparing Pulse Sense CGM to the predicate device (Dexcom G7, K221803) across intended use, technological characteristics, and performance data.', { 'ADR ID': 'ADR-006', 'Context': 'FDA 510(k) submission requires a documented substantial equivalence argument. Key comparison areas: intended use (CGM for diabetes management), sensor technology (electrochemical enzyme electrode), wear duration (14 days vs 10), warmup time (60 min vs 30 min), wireless protocol (BLE 5.3 vs BLE 5.0), and alert thresholds.', 'Status': 'Proposed' }, 0.1, 0.68); // ⚠️ gap: no decision — intentional, needs regulatory team input

  // ── Milestones (5) ──
  await insertNord(MS.ms1, NT.milestone, 'Design Input Review', 'Formal design review gate for requirements documentation.', { 'Target Date': '2026-02-01', 'Gate Type': 'Design Review', 'Exit Criteria': 'All user needs documented, design inputs derived, traceability matrix complete' }, 0.15, 0.05);
  await insertNord(MS.ms2, NT.milestone, 'Risk Management Review', 'Phase gate for ISO 14971 risk analysis completion.', { 'Target Date': '2026-04-15', 'Gate Type': 'Phase Gate', 'Exit Criteria': 'ISO 14971 risk analysis complete, all residual risks acceptable' }, 0.35, 0.05);
  await insertNord(MS.ms3, NT.milestone, 'Design Verification Complete', 'Phase gate for all verification protocols executed.', { 'Target Date': '2026-07-01', 'Gate Type': 'Phase Gate', 'Exit Criteria': 'All test protocols executed, results documented, no open Critical NCs' }, 0.55, 0.05);
  await insertNord(MS.ms4, NT.milestone, 'Clinical Study Completion', 'Phase gate for pivotal study enrollment and results.', { 'Target Date': '2026-11-01', 'Gate Type': 'Phase Gate', 'Exit Criteria': 'Pivotal study enrollment complete, primary endpoint met' }, 0.75, 0.05);
  await insertNord(MS.ms5, NT.milestone, '510(k) Submission', 'FDA submission gate.', { 'Gate Type': 'Submission' }, 0.9, 0.05); // ⚠️ gap: no target_date, no exit_criteria

  console.log('  ✅ 59 Nords');

  // Set default start nord to REQ-001 so sessions begin with connected neighbors
  await pool.query(
    'UPDATE projects SET default_start_nord_id = $1 WHERE id = $2',
    [REQ.r001, PROJECT_ID]
  );
  console.log('  ✅ Default start nord → REQ-001');

  /* ══════════════════════════════════════════════════════════════════════
   * CONNECTIONS (~85) — with typed properties
   * ══════════════════════════════════════════════════════════════════════ */

  async function insertConn(typeId: string, srcId: string, tgtId: string, dir: string, dx: number, dy = 0.5, props: Record<string, any> = {}) {
    await pool.query(`
      INSERT INTO connections (project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y, properties)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [PROJECT_ID, typeId, srcId, tgtId, dir, dx, dy, JSON.stringify(props)]);
  }

  // ── Design Control Phase (12) ──
  await insertConn(CT.designControl, REQ.r001, SUB.sensor, 'forward', 0.0, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'Dr. Priya Sharma', 'Review Date': '2025-09-15' });
  await insertConn(CT.designControl, REQ.r005, SUB.applicator, 'forward', 0.0, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'Elena Vasquez', 'Review Date': '2025-09-15' });
  await insertConn(CT.designControl, REQ.r002, SUB.sensor, 'forward', 0.25, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'Dr. Priya Sharma', 'Review Date': '2025-10-01' });
  await insertConn(CT.designControl, REQ.r003, SUB.wireless, 'forward', 0.25, 0.5,
    { 'Review Status': 'Pending Review', 'Reviewer': 'Unassigned' });
  await insertConn(CT.designControl, REQ.r006, SUB.mobileApp, 'forward', 0.25, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'Marcus Cole', 'Review Date': '2025-10-01' });
  await insertConn(CT.designControl, REQ.r004, SUB.sensor, 'forward', 0.42, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'James Okonkwo', 'Review Date': '2025-10-15' });
  await insertConn(CT.designControl, REQ.r007, SUB.wireless, 'forward', 0.42, 0.5,
    { 'Review Status': 'Pending Review', 'Reviewer': 'Marcus Cole' });
  await insertConn(CT.designControl, REQ.r008, SUB.applicator, 'forward', 0.42, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'Dr. Priya Sharma', 'Review Date': '2025-10-15' });
  await insertConn(CT.designControl, TC.t001, REQ.r002, 'forward', 0.58, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'Dr. Aisha Patel', 'Review Date': '2025-11-20' });
  await insertConn(CT.designControl, TC.t002, REQ.r001, 'forward', 0.58, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'Marcus Cole', 'Review Date': '2025-12-05' });
  await insertConn(CT.designControl, TC.t003, REQ.r004, 'forward', 0.58, 0.5,
    { 'Review Status': 'Approved', 'Reviewer': 'James Okonkwo', 'Review Date': '2025-11-10' });
  await insertConn(CT.designControl, TC.t005, REQ.r006, 'forward', 0.58, 0.5,
    { 'Review Status': 'Not Reviewed' });

  // ── Blocks (10) ──
  await insertConn(CT.blocks, RISK.h001, REQ.r002, 'forward', 0.85, 0.5,
    { 'Severity': 'Critical Path', 'Workaround Available': 'Partial', 'Estimated Resolution': '2026-04-01' });
  await insertConn(CT.blocks, RISK.h005, REQ.r005, 'forward', 0.55, 0.5,
    { 'Severity': 'Schedule Impact', 'Workaround Available': 'No', 'Estimated Resolution': '2026-05-15' });
  await insertConn(CT.blocks, RISK.h008, REQ.r008, 'forward', 0.55, 0.5,
    { 'Severity': 'Schedule Impact', 'Workaround Available': 'No', 'Estimated Resolution': '2026-06-01' });
  await insertConn(CT.blocks, NC.nc001, TC.t002, 'forward', 0.85, 0.5,
    { 'Severity': 'Critical Path', 'Workaround Available': 'No', 'Estimated Resolution': '2026-03-15' });
  await insertConn(CT.blocks, NC.nc002, TC.t004, 'forward', 0.55, 0.5,
    { 'Severity': 'Schedule Impact', 'Workaround Available': 'Partial', 'Estimated Resolution': '2026-04-01' });
  await insertConn(CT.blocks, NC.nc005, TC.t009, 'forward', 0.85, 0.5,
    { 'Severity': 'Critical Path', 'Workaround Available': 'No', 'Estimated Resolution': '2026-03-01' });
  await insertConn(CT.blocks, MS.ms3, MS.ms5, 'forward', 0.55, 0.5,
    { 'Severity': 'Critical Path', 'Workaround Available': 'No' });
  await insertConn(CT.blocks, CP.cp001, MS.ms4, 'forward', 0.55, 0.5,
    { 'Severity': 'Schedule Impact', 'Workaround Available': 'No' });
  await insertConn(CT.blocks, REQ.r003, REQ.r006, 'forward', 0.2, 0.5,
    { 'Severity': 'Informational', 'Workaround Available': 'Yes' });
  await insertConn(CT.blocks, ADR.adr005, TC.t001, 'forward', 0.2, 0.5,
    { 'Severity': 'Informational', 'Workaround Available': 'Yes' });

  // ── Mitigates (8) ──
  await insertConn(CT.mitigates, RISK.h001, REQ.r002, 'forward', 0.55, 0.5,
    { 'Mitigation Type': 'Engineering Control', 'Residual Risk Acceptable': 'Yes', 'Verification Method': 'Test — YSI comparison' });
  await insertConn(CT.mitigates, RISK.h002, SUB.wireless, 'forward', 0.85, 0.5,
    { 'Mitigation Type': 'Elimination', 'Residual Risk Acceptable': 'Yes', 'Verification Method': 'Test — IEC 62133 thermal abuse' });
  await insertConn(CT.mitigates, RISK.h003, SUB.wireless, 'forward', 0.55, 0.5,
    { 'Mitigation Type': 'Engineering Control', 'Residual Risk Acceptable': 'Yes', 'Verification Method': 'Demonstration — redundant local alarm' });
  await insertConn(CT.mitigates, RISK.h004, SUB.sensor, 'forward', 0.55, 0.5,
    { 'Mitigation Type': 'Substitution', 'Residual Risk Acceptable': 'Yes', 'Verification Method': 'Test — pull-force testing' });
  await insertConn(CT.mitigates, RISK.h006, SUB.cloud, 'forward', 0.85, 0.5,
    { 'Mitigation Type': 'Elimination', 'Residual Risk Acceptable': 'Yes', 'Verification Method': 'Test — encryption E2E' });
  await insertConn(CT.mitigates, RISK.h007, SUB.mobileApp, 'forward', 0.55, 0.5,
    { 'Mitigation Type': 'Engineering Control', 'Residual Risk Acceptable': 'Under Review', 'Verification Method': 'Test — independent hardware alarm' });
  await insertConn(CT.mitigates, RISK.h005, REQ.r005, 'forward', 0.15, 0.5,
    { 'Mitigation Type': 'Administrative Control', 'Residual Risk Acceptable': 'No', 'Verification Method': '' }); // Monitoring only — no effective mitigation yet
  await insertConn(CT.mitigates, RISK.h008, SUB.applicator, 'forward', 0.15, 0.5,
    { 'Mitigation Type': 'Administrative Control', 'Residual Risk Acceptable': 'No', 'Verification Method': '' }); // Monitoring only

  // ── Assigned To (12) — Marcus has 7 (overloaded!) ──
  await insertConn(CT.assignedTo, REQ.r002, TEAM.marcus, 'forward', 0.75, 0.5,
    { 'Allocation %': 15, 'Role in Task': 'Lead', 'Start Date': '2025-08-01' });
  await insertConn(CT.assignedTo, REQ.r003, TEAM.marcus, 'forward', 0.75, 0.5,
    { 'Allocation %': 10, 'Role in Task': 'Lead', 'Start Date': '2025-08-01' });
  await insertConn(CT.assignedTo, SUB.sensor, TEAM.marcus, 'forward', 0.75, 0.5,
    { 'Allocation %': 20, 'Role in Task': 'Lead', 'Start Date': '2025-06-15' });
  await insertConn(CT.assignedTo, SUB.wireless, TEAM.marcus, 'forward', 0.75, 0.5,
    { 'Allocation %': 15, 'Role in Task': 'Lead', 'Start Date': '2025-06-15' });
  await insertConn(CT.assignedTo, TC.t001, TEAM.marcus, 'forward', 0.75, 0.5,
    { 'Allocation %': 10, 'Role in Task': 'Reviewer', 'Start Date': '2025-10-01' });
  await insertConn(CT.assignedTo, TC.t004, TEAM.marcus, 'forward', 0.75, 0.5,
    { 'Allocation %': 10, 'Role in Task': 'Lead', 'Start Date': '2026-01-15' });
  await insertConn(CT.assignedTo, ADR.adr005, TEAM.marcus, 'forward', 0.75, 0.5,
    { 'Allocation %': 5, 'Role in Task': 'Reviewer', 'Start Date': '2026-02-01' });
  await insertConn(CT.assignedTo, SUB.mobileApp, TEAM.tom, 'forward', 0.5, 0.5,
    { 'Allocation %': 60, 'Role in Task': 'Lead', 'Start Date': '2025-07-01' });
  await insertConn(CT.assignedTo, NC.nc004, TEAM.tom, 'forward', 0.5, 0.5,
    { 'Allocation %': 20, 'Role in Task': 'Lead', 'Start Date': '2026-01-10' });
  await insertConn(CT.assignedTo, CP.cp001, TEAM.sarah, 'forward', 0.5, 0.5,
    { 'Allocation %': 40, 'Role in Task': 'Lead', 'Start Date': '2025-09-01' });
  await insertConn(CT.assignedTo, REGSUB.fivetenk, TEAM.priya, 'forward', 0.5, 0.5,
    { 'Allocation %': 50, 'Role in Task': 'Lead', 'Start Date': '2025-06-01' });
  await insertConn(CT.assignedTo, RISK.h001, TEAM.aisha, 'forward', 0.5, 0.5,
    { 'Allocation %': 30, 'Role in Task': 'Lead', 'Start Date': '2025-08-15' });

  // ── Verifies (10) ──
  await insertConn(CT.verifies, TC.t001, REQ.r002, 'forward', 0.85, 0.5,
    { 'Verification Status': 'Complete', 'Test Evidence Summary': 'MARD 8.7% across 40 subjects — meets ≤10% requirement per CLSI POCT05', 'Retest Required': 'No' });
  await insertConn(CT.verifies, TC.t002, REQ.r001, 'forward', 0.85, 0.5,
    { 'Verification Status': 'Complete', 'Test Evidence Summary': '98% sensor survival at day 14 — exceeds ≥95% threshold', 'Retest Required': 'No' });
  await insertConn(CT.verifies, TC.t003, REQ.r004, 'forward', 0.85, 0.5,
    { 'Verification Status': 'Complete', 'Test Evidence Summary': 'No moisture ingress after 30 min at 1m per IEC 60529', 'Retest Required': 'No' });
  await insertConn(CT.verifies, TC.t004, REQ.r003, 'forward', 0.3, 0.5,
    { 'Verification Status': 'Not Started', 'Retest Required': 'No' });  // Specified only
  await insertConn(CT.verifies, TC.t005, REQ.r006, 'forward', 0.85, 0.5,
    { 'Verification Status': 'Complete', 'Test Evidence Summary': 'Mean alert time 4.2 min from threshold crossing — meets 95th pctl < 5 min', 'Retest Required': 'No' });
  await insertConn(CT.verifies, TC.t006, REQ.r007, 'forward', 0.3, 0.5,
    { 'Verification Status': 'Not Started', 'Retest Required': 'No' });  // Specified only
  await insertConn(CT.verifies, TC.t007, RISK.h002, 'forward', 0.85, 0.5,
    { 'Verification Status': 'Complete', 'Test Evidence Summary': 'Max surface temp 38.2°C under load — well within ≤43°C limit', 'Retest Required': 'No' });
  await insertConn(CT.verifies, TC.t008, RISK.h004, 'forward', 0.85, 0.5,
    { 'Verification Status': 'Complete', 'Test Evidence Summary': 'Mean pull force 2.8N, min 2.1N — exceeds min 1.5N threshold', 'Retest Required': 'No' });
  await insertConn(CT.verifies, TC.t009, REQ.r008, 'forward', 0.3, 0.5,
    { 'Verification Status': 'Not Started', 'Retest Required': 'No' });  // Specified only
  await insertConn(CT.verifies, TC.t010, RISK.h006, 'forward', 0.85, 0.5,
    { 'Verification Status': 'Complete', 'Test Evidence Summary': 'AES-256-GCM verified end-to-end, no plaintext PHI in transit', 'Retest Required': 'No' });

  // ── Part Of (7) ──
  await insertConn(CT.partOf, REQ.r001, SUB.sensor, 'forward', 0.55, 0.5,
    { 'Integration Status': 'Integrated', 'Interface Doc Ref': 'ICD-SENS-001' });
  await insertConn(CT.partOf, REQ.r002, SUB.sensor, 'forward', 0.55, 0.5,
    { 'Integration Status': 'Integrated', 'Interface Doc Ref': 'ICD-SENS-002' });
  await insertConn(CT.partOf, REQ.r003, SUB.wireless, 'forward', 0.55, 0.5,
    { 'Integration Status': 'In Progress', 'Interface Doc Ref': 'ICD-BLE-001' });
  await insertConn(CT.partOf, REQ.r006, SUB.mobileApp, 'forward', 0.55, 0.5,
    { 'Integration Status': 'Integrated', 'Interface Doc Ref': 'ICD-APP-001' });
  await insertConn(CT.partOf, REQ.r007, SUB.wireless, 'forward', 0.55, 0.5,
    { 'Integration Status': 'In Progress', 'Interface Doc Ref': 'ICD-BLE-002' });
  await insertConn(CT.partOf, ADR.adr001, SUB.wireless, 'forward', 0.35, 0.5,
    { 'Integration Status': 'Validated' });
  await insertConn(CT.partOf, ADR.adr002, SUB.mobileApp, 'forward', 0.35, 0.5,
    { 'Integration Status': 'Validated' });

  // ── Reported In (6) ──
  await insertConn(CT.reportedIn, NC.nc001, TC.t002, 'forward', 0.55, 0.5,
    { 'Discovery Method': 'Manual Test', 'Reproducibility': 'Always', 'Environment': 'Humidity chamber, 85% RH' });
  await insertConn(CT.reportedIn, NC.nc002, TC.t004, 'forward', 0.35, 0.5,
    { 'Discovery Method': 'Manual Test', 'Reproducibility': 'Intermittent', 'Environment': 'iPhone 15 Pro, iOS 17.4.1' });
  await insertConn(CT.reportedIn, NC.nc003, TC.t003, 'forward', 0.85, 0.5,
    { 'Discovery Method': 'Manual Test', 'Reproducibility': 'Always', 'Environment': 'Lab bench — removal procedure' });
  await insertConn(CT.reportedIn, NC.nc004, TC.t010, 'forward', 0.55, 0.5,
    { 'Discovery Method': 'Automated Test', 'Reproducibility': 'Always', 'Environment': 'Samsung Galaxy S24, Android 14' });
  await insertConn(CT.reportedIn, NC.nc005, TC.t009, 'forward', 0.35, 0.5,
    { 'Discovery Method': 'Manual Test', 'Reproducibility': 'Always', 'Environment': 'Production lot 2024-07 inspection' });
  await insertConn(CT.reportedIn, NC.nc006, SUB.cloud, 'forward', 0.15, 0.5,
    { 'Discovery Method': 'Field Report', 'Reproducibility': 'Intermittent', 'Environment': 'Production web dashboard' });

  // ── Relates To (20) — cross-cutting semantic links ──
  await insertConn(CT.relatesTo, ADR.adr001, SUB.wireless, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'BLE decision directly shaped wireless transmitter architecture' });
  await insertConn(CT.relatesTo, ADR.adr002, SUB.mobileApp, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'React Native decision defines mobile app tech stack' });
  await insertConn(CT.relatesTo, ADR.adr003, SUB.sensor, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Constrains', 'Notes': 'Factory calibration requires tighter manufacturing controls for sensor module' });
  await insertConn(CT.relatesTo, ADR.adr004, SUB.cloud, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'GCP selection defines cloud platform infrastructure' });
  await insertConn(CT.relatesTo, ADR.adr005, SUB.sensor, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Constrains', 'Notes': 'Material decision (Pt vs Au) directly affects sensor accuracy and cost' });
  await insertConn(CT.relatesTo, CP.cp001, MS.ms4, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'Pivotal study completion is the primary exit criterion for Clinical Study Completion milestone' });
  await insertConn(CT.relatesTo, CP.cp002, REQ.r001, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'Feasibility study validates the 14-day wear duration user need' });
  await insertConn(CT.relatesTo, CP.cp003, REQ.r005, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'Usability study measures patient experience including insertion pain' });
  await insertConn(CT.relatesTo, REGSUB.fivetenk, MS.ms5, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': '510(k) submission document feeds directly into the submission milestone' });
  await insertConn(CT.relatesTo, REGSUB.ceMark, REGSUB.fivetenk, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'CE Mark and 510(k) share substantial equivalence arguments' });
  await insertConn(CT.relatesTo, MS.ms1, REQ.r001, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Constrains', 'Notes': 'Design Input Review gate requires all user needs documented' });
  await insertConn(CT.relatesTo, MS.ms1, REQ.r008, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Constrains', 'Notes': 'Applicator requirement must be locked before Design Input Review' });
  await insertConn(CT.relatesTo, MS.ms2, RISK.h001, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Constrains', 'Notes': 'Risk Management Review requires all high-severity risks to have mitigation' });
  await insertConn(CT.relatesTo, MS.ms2, RISK.h005, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Constrains', 'Notes': 'HAZ-005 (dermatitis) must have mitigation before Risk Management Review' });
  await insertConn(CT.relatesTo, MS.ms3, TC.t001, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Constrains', 'Notes': 'MARD accuracy test must pass before Design Verification Complete' });
  await insertConn(CT.relatesTo, MS.ms3, TC.t009, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Constrains', 'Notes': 'Applicator force test must complete before Design Verification Complete' });
  await insertConn(CT.relatesTo, RISK.h003, ADR.adr001, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'BLE interference risk informed the protocol selection decision' });
  await insertConn(CT.relatesTo, RISK.h007, ADR.adr002, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'App crash risk is partially attributable to React Native bridge memory issues' });
  await insertConn(CT.relatesTo, NC.nc001, RISK.h001, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'Sensor drift NC provides evidence for the accuracy risk assessment' });
  await insertConn(CT.relatesTo, NC.nc002, RISK.h003, 'none', 0.5, 0.5,
    { 'Relationship Type': 'Informs', 'Notes': 'iOS BLE disconnect NC provides evidence for the interference risk' });

  console.log('  ✅ ~85 Connections (with typed properties)');

  /* ══════════════════════════════════════════════════════════════════════
   * PROJECT VARIABLES (15) — must be inserted before Goals (FK dependency)
   * ══════════════════════════════════════════════════════════════════════ */
  // ── Collection Groups (5) ──
  const collectionGroups = [
    { id: CG.intake,     name: 'User Intake',            desc: 'Basic user information collected at the start of a conversation.', icon: 'UserCircle', color: '#6366F1', order: 0 },
    { id: CG.regulatory, name: 'Regulatory & Strategy', desc: 'Regulatory pathway decisions, target population, predicate device, and submission timeline.', icon: 'Scale', color: '#3B82F6', order: 1 },
    { id: CG.risk,       name: 'Risk & Safety',        desc: 'Risk tolerance, highest-risk subsystems, and biocompatibility status per ISO 14971.', icon: 'ShieldAlert', color: '#EF4444', order: 2 },
    { id: CG.clinical,   name: 'Clinical',             desc: 'IRB approval status, primary endpoint results, and clinical enrollment targets.', icon: 'Stethoscope', color: '#0EA5E9', order: 3 },
    { id: CG.engineering, name: 'Engineering & Verification', desc: 'Software classification, test execution status, and open nonconformances.', icon: 'Wrench', color: '#10B981', order: 4 },
    { id: CG.business,   name: 'Business',             desc: 'Market launch geography and payer reimbursement readiness.', icon: 'TrendingUp', color: '#F97316', order: 5 },
  ];
  for (const cg of collectionGroups) {
    await pool.query(`
      INSERT INTO collection_groups (id, project_id, name, description, icon, accent_color, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [cg.id, PROJECT_ID, cg.name, cg.desc, cg.icon, cg.color, cg.order]);
  }
  console.log('  ✅ 5 Collection Groups');

  // ── Project Variables (17) — assigned to collection groups ──
  const variables = [
    // ── User Intake ──
    { id: VAR.userName, name: 'user_name', desc: 'The user\'s name — ask casually at the start of the conversation to personalize the experience. Use it naturally throughout the session once known.', type: 'short_text', groupId: CG.intake,
      options: null, required: false, tags: ['intake'] },
    { id: VAR.userEmail, name: 'user_email', desc: 'The user\'s email address — offer to save for follow-up but make it clear it\'s completely optional. Never pressure for this.', type: 'email', groupId: CG.intake,
      options: null, required: false, tags: ['intake'] },
    // ── Regulatory & Strategy ──
    { id: VAR.regulatoryPathway, name: 'regulatory_pathway', desc: 'The FDA regulatory pathway being pursued for this device — determines the entire submission strategy, predicate device requirements, and clinical evidence needed. For a Class II CGM, 510(k) is the most common route via substantial equivalence to a predicate like the Dexcom G7.', type: 'select', groupId: CG.regulatory,
      options: ['510(k)', 'PMA', 'De Novo', 'CE Mark'], required: true, tags: ['regulatory'] },
    { id: VAR.targetPopulation, name: 'target_population', desc: 'The primary patient population defines the intended use statement for the 510(k) — this affects predicate device selection, clinical endpoint design, and labeling claims. Type 1 and Type 2 populations have different clinical evidence requirements.', type: 'select', groupId: CG.regulatory,
      options: ['Type 1 Diabetes', 'Type 2 Diabetes', 'Gestational Diabetes', 'General Wellness'], required: true, tags: ['regulatory'] },
    { id: VAR.predicateDevice, name: 'predicate_device', desc: 'The legally marketed device used as the basis for the 510(k) substantial equivalence argument. Must match intended use and technological characteristics. Common predicates for CGMs include the Dexcom G7 (K221803) and FreeStyle Libre 3 (K220326).', type: 'string', groupId: CG.regulatory,
      options: null, required: true, tags: ['regulatory'] },
    { id: VAR.submissionQuarter, name: 'submission_quarter', desc: 'The target quarter for FDA submission — drives the entire project timeline backwards. All verification tests, clinical evidence, and risk analysis must be complete before this date. Submission timing also affects competitive positioning.', type: 'select', groupId: CG.regulatory,
      options: ['Q3 2026', 'Q4 2026', 'Q1 2027', 'Q2 2027'], required: false, tags: ['regulatory'] },
    // ── Risk & Safety ──
    { id: VAR.riskTolerance, name: 'risk_tolerance', desc: 'The organization\'s appetite for regulatory timeline risk — conservative means completing all verification before submitting, moderate means parallel-tracking some activities, aggressive means submitting with known gaps and managing FDA questions reactively. This affects resource allocation and milestone scheduling.', type: 'select', groupId: CG.risk,
      options: ['Conservative', 'Moderate', 'Aggressive'], required: true, tags: ['risk'] },
    { id: VAR.highestRiskSubsystem, name: 'highest_risk_subsystem', desc: 'Which subsystem carries the most design risk — this concentrates engineering attention and determines where the most rigorous verification testing is needed. Risk factors include novel technology, supplier dependencies, and patient contact surfaces.', type: 'string', groupId: CG.risk,
      options: null, required: false, tags: ['risk'] },
    { id: VAR.biocompatibilityConfirmed, name: 'biocompatibility_confirmed', desc: 'Whether ISO 10993 biocompatibility testing has been completed for all patient-contacting materials (adhesive, sensor wire, housing). This is a hard gate for FDA submission — cannot submit without biocompatibility evidence.', type: 'boolean', groupId: CG.risk,
      options: null, required: false, tags: ['risk'] },
    // ── Clinical ──
    { id: VAR.irbStatus, name: 'irb_status', desc: 'The current Institutional Review Board approval status for clinical studies. IRB approval is required before any patient enrollment can begin. Conditional approval may allow enrollment with specific protocol modifications.', type: 'select', groupId: CG.clinical,
      options: ['Not Started', 'Submitted', 'Approved', 'Conditional'], required: true, tags: ['clinical'] },
    { id: VAR.primaryEndpointMet, name: 'primary_endpoint_met', desc: 'Whether the pivotal clinical study has met its primary endpoint — for this CGM, that means MARD ≤10% vs. laboratory reference across the operating range. Meeting the primary endpoint is the strongest evidence for the 510(k) submission.', type: 'boolean', groupId: CG.clinical,
      options: null, required: false, tags: ['clinical'] },
    { id: VAR.enrollmentTarget, name: 'enrollment_target', desc: 'The target number of subjects for the pivotal clinical study — must be statistically powered to demonstrate the primary endpoint. FDA typically expects 50-100 subjects for a CGM pivotal study. Under-enrollment risks an underpowered study.', type: 'number', groupId: CG.clinical,
      options: null, required: false, tags: ['clinical'] },
    // ── Engineering & Verification ──
    { id: VAR.softwareClassification, name: 'software_classification', desc: 'The IEC 62304 software safety classification — Class A (no injury possible), Class B (non-serious injury possible), or Class C (death or serious injury possible). Class C requires the most rigorous software development lifecycle documentation and testing. Most CGM software is Class B or C.', type: 'select', groupId: CG.engineering,
      options: ['Class A', 'Class B', 'Class C'], required: false, tags: ['engineering'] },
    { id: VAR.allTestsExecuted, name: 'all_tests_executed', desc: 'Whether all verification test protocols have been executed and documented with actual results. This is a hard gate for Design Verification Complete milestone — cannot close the milestone with unexecuted test protocols. Currently 3 of 10 tests have no results.', type: 'boolean', groupId: CG.engineering,
      options: null, required: false, tags: ['engineering'] },
    { id: VAR.openCriticalNcs, name: 'open_critical_ncs', desc: 'The number of open Critical nonconformances — FDA requires zero open Critical NCs for submission. Each Critical NC needs a completed CAPA with verified effectiveness before closure. Currently NC-001 and NC-005 are Critical.', type: 'number', groupId: CG.engineering,
      options: null, required: false, tags: ['engineering'] },
    // ── Business ──
    { id: VAR.marketLaunchRegion, name: 'market_launch_region', desc: 'The initial market launch geography — US Only requires 510(k) clearance, US + EU additionally requires CE Mark under MDR, Global adds market-specific regulatory requirements. Launch geography affects submission strategy, timeline, and resource allocation.', type: 'select', groupId: CG.business,
      options: ['US Only', 'US + EU', 'Global'], required: false, tags: ['business'] },
    { id: VAR.reimbursementStrategy, name: 'reimbursement_strategy', desc: 'Payer reimbursement readiness — determines whether patients can actually access the device after regulatory clearance. Without reimbursement, even a cleared device has limited market impact. Securing a CPT code and payer contracts is the last mile to commercial success.', type: 'select', groupId: CG.business,
      options: ['Not Started', 'In Progress', 'Secured'], required: false, tags: ['business'] },
  ];
  for (let i = 0; i < variables.length; i++) {
    const v = variables[i];
    await pool.query(`
      INSERT INTO project_variables (id, project_id, name, description, type, options, required, tags, hint, sort_order, collection_group_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [v.id, PROJECT_ID, v.name, v.desc, v.type,
        v.options ? JSON.stringify(v.options) : null, v.required, v.tags, null, i + 1, v.groupId]);
  }
  console.log('  ✅ 17 Project Variables (in 6 groups)');

  /* ══════════════════════════════════════════════════════════════════════
   * GOALS (12) — complex prerequisite DAG with 4 roots, AND/OR gates, exclusive forks
   *
   *   Layer 0 (4 roots):
   *     ReqLocked  RiskComplete  BioCompatCleared  ArchDecided
   *
   *   Layer 1 (3 goals):
   *     VerifComplete ←── AND(ReqLocked, RiskComplete)
   *     SupplyChainQual ←── AND(BioCompatCleared, ArchDecided)
   *     ClinApproved ←── ReqLocked
   *
   *   Layer 2 (2 goals):
   *     DesignTransfer ←── AND(VerifComplete, SupplyChainQual)
   *     510(k)Ready ←── OR(VerifComplete, ClinApproved)
   *
   *   Layer 3 (2 goals):
   *     MfgValidation ←── DesignTransfer  (fork: exclusive)
   *     RegFiling ←── AND(510kReady, DesignTransfer)
   *
   *   Layer 4 (1 goal):
   *     FDASubmission ←── AND(MfgValidation, RegFiling)  — ends session
   *
   * ══════════════════════════════════════════════════════════════════════ */

  const goals = [
    // ── Layer -1: Independent intake (no prerequisites, non-blocking) ──
    { id: GOAL.userIntake, name: 'User Intake', icon: 'UserCircle', color: '#6366F1',
      desc: 'Collect the user\'s name and optionally their email at the start of the session to personalize the experience.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Address the user by name ({{user_name}}) warmly — use it naturally going forward, not excessively. If they shared their email, briefly confirm you\'ve noted it but do NOT make a big deal of it. Transition immediately into the domain conversation by asking what area of the project they\'d like to explore first. Keep the intake acknowledgment to one sentence max — the user wants to get to work, not be welcomed at length. Do NOT recap what you just collected.' },
    // ── Layer 0: 4 roots ──
    { id: GOAL.reqLocked, name: 'Requirements Locked', icon: 'Lock', color: '#3B82F6',
      desc: 'All user needs, design inputs, and design outputs are documented with priority, verification method, and traceability status.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Acknowledge that the requirements foundation is solid — the {{regulatory_pathway}} pathway is defined and the {{target_population}} population is scoped. Express confidence (not congratulations) that traceability to the predicate device gives the team a strong regulatory starting point. Pivot naturally: suggest exploring either the risk analysis or architecture decisions as a next step, framing it as "now that requirements are locked, the team can confidently move into…" Do NOT list out all the things that were collected — the user already knows.' },
    { id: GOAL.riskComplete, name: 'Risk Analysis Complete', icon: 'ShieldCheck', color: '#EF4444',
      desc: 'All identified hazards have severity, probability, mitigation strategy, and residual risk documented per ISO 14971.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Reference the {{risk_tolerance}} risk posture and the {{highest_risk_subsystem}} as a natural talking point — e.g. "With the {{highest_risk_subsystem}} flagged as your highest-risk area, the ISO 14971 analysis gives the team clear mitigation priorities." Show you understand what these choices MEAN for the project, not just that they were recorded. Suggest this positions the team well for verification planning. If the user seems ready to continue, ask whether they want to look at the verification test strategy or the supply chain implications. Do NOT say "All hazards have been assessed" — that\'s generic. Be specific about THEIR risk profile.' },
    { id: GOAL.bioCompatCleared, name: 'Biocompatibility Cleared', icon: 'HeartPulse', color: '#A855F7',
      desc: 'All patient-contacting materials have passed ISO 10993 biocompatibility testing: cytotoxicity, sensitization, irritation, and systemic toxicity.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Frame biocompatibility clearance as removing a major regulatory gate — this is a significant de-risking event. Reference that {{biocompatibility_confirmed}} and explain WHY this matters for the submission timeline (it unblocks both the supply chain qualification and the clinical protocol path). Use language like "one of the longer-lead regulatory gates is now behind you." Naturally transition by asking whether the clinical or supply chain path is more top-of-mind. Do NOT say "Congratulations" — frame it as progress, not a celebration. Be matter-of-fact and expert.' },
    { id: GOAL.archDecided, name: 'Architecture Decided', icon: 'Cpu', color: '#F59E0B',
      desc: 'All Architecture Decision Records are in Accepted status. Key technology choices (BLE vs NFC, cloud platform, sensor material) are finalized.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Note that the {{software_classification}} classification under IEC 62304 sets a specific development rigor level — briefly explain what this means for their team (more documentation? more testing?). Frame architecture lock as enabling parallel workstreams: the engineering team can now build while regulatory prepares. Ask a forward-looking question: "With the architecture locked, are there any integration risks between subsystems you\'re watching?" This shows domain expertise. Do NOT just confirm what was decided — add insight about what it ENABLES.' },

    // ── Layer 1: 3 goals ──
    { id: GOAL.verifComplete, name: 'Verification Complete', icon: 'CheckCircle', color: '#10B981',
      desc: 'All verification test cases have been executed with pass/fail results and actual results documented.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'If {{open_critical_ncs}} is "0" or "none", express that this is excellent — clean verification puts the team in a strong position for design transfer. If there ARE open NCs, acknowledge them directly and suggest they\'re the priority before transfer. Reference the {{regulatory_pathway}} — frame the verification evidence as building the submission package. Suggest exploring the design transfer readiness or the 510(k) preparation next. Ask: "Are there any test results that surprised the team or changed any assumptions?" This shows you understand V&V is more than a checkbox. Do NOT just say "all tests are executed" — add analytical value.' },
    { id: GOAL.supplyChainQual, name: 'Supply Chain Qualified', icon: 'Package', color: '#06B6D4',
      desc: 'All critical suppliers are qualified per ISO 13485. Component specifications locked, incoming inspection protocols established, and backup suppliers identified for single-source components.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Connect supply chain qualification to the broader program timeline — with biocompatibility confirmed and suppliers qualified, the team can start procurement for long-lead items. Reference the {{highest_risk_subsystem}} specifically: "Since the {{highest_risk_subsystem}} carries the highest risk, having qualified suppliers for its components is especially important." Ask whether there are any single-source dependencies the team is concerned about. Frame this as operational readiness, not just compliance. Do NOT list out what was collected — focus on what\'s NOW possible.' },
    { id: GOAL.clinApproved, name: 'Clinical Protocol Approved', icon: 'Stethoscope', color: '#0EA5E9',
      desc: 'All clinical study protocols have IRB approval and are actively enrolling.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Reference the {{irb_status}} status and {{enrollment_target}} enrollment target as concrete evidence of clinical momentum. Frame this in terms of the regulatory narrative: "Clinical data from {{enrollment_target}} subjects in the {{target_population}} population gives the {{regulatory_pathway}} submission real clinical weight." Ask about enrollment timeline and any early signals from the data. If the user seems interested, suggest looking at how the clinical evidence connects to the regulatory filing. Show you understand clinical trials are EVIDENCE for the submission, not just a checkbox. Do NOT congratulate — ask smart follow-up questions.' },

    // ── Layer 2: 2 goals ──
    { id: GOAL.designTransfer, name: 'Design Transfer Ready', icon: 'ArrowRightLeft', color: '#84CC16',
      desc: 'Design outputs are frozen and transferred to manufacturing. Device Master Record (DMR) is complete, process validation protocols are approved, and pilot production has yielded conforming units.',
      endType: null, prerequisiteGate: 'all', forkType: 'exclusive',
      achievedPrompt: 'This is a major program inflection point — acknowledge that the design is moving from R&D to manufacturing. Reference {{open_critical_ncs}} to frame manufacturing readiness: if NCs are resolved, express confidence; if some remain, note them as a watch item. Ask about the pilot production experience: "How did the pilot builds go? Any yield issues or process adjustments needed?" This shows you understand design transfer isn\'t just document handoff — it\'s about manufacturability. Pivot toward manufacturing validation as the natural next step. Use a tone of informed partnership, not celebration.' },
    { id: GOAL.fivetenReady, name: '510(k) Ready', icon: 'FileCheck', color: '#DC2626',
      desc: 'The 510(k) submission document has a predicate device identified and substantial equivalence argument drafted.',
      endType: null, prerequisiteGate: 'any', forkType: 'parallel',
      achievedPrompt: 'Frame the 510(k) draft as a critical regulatory milestone. Reference {{predicate_device}} specifically: "The substantial equivalence argument anchored to {{predicate_device}} is the backbone of the {{regulatory_pathway}} submission." Ask whether there are any areas where the SE argument feels thin or where the predicate comparison might face FDA pushback. Suggest reviewing the performance data alignment between the predicate and the team\'s device. Target {{submission_quarter}} should be mentioned as a timeline anchor. Show you understand 510(k) strategy, not just that a document exists. Do NOT just confirm — probe for weaknesses.' },

    // ── Layer 3: 2 goals ──
    { id: GOAL.mfgValidation, name: 'Manufacturing Validation', icon: 'Factory', color: '#78716C',
      desc: 'Process validation (IQ/OQ/PQ) is complete. Three consecutive production lots meet all specifications. Sterilization validation is accepted.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Frame manufacturing validation as proving the design can be CONSISTENTLY produced — this is about confidence in scale, not just one good batch. Reference the {{highest_risk_subsystem}}: "The validation of the {{highest_risk_subsystem}} process is especially significant given its risk profile." Ask about any yield or process control insights from the three validation lots. Suggest this positions the team for the regulatory filing — the manufacturing evidence is a key piece of the submission. Use a technical, knowledgeable tone. Do NOT be effusive — be precise and forward-looking.' },
    { id: GOAL.regFiling, name: 'Regulatory Filing', icon: 'Stamp', color: '#E11D48',
      desc: 'All regulatory dossier components are assembled: technical summary, performance data, labeling, and risk-benefit analysis. Pre-submission feedback from FDA has been incorporated.',
      endType: null, prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'Acknowledge that the regulatory dossier assembly is a culmination of all the work streams. Reference the {{regulatory_pathway}} and {{predicate_device}} as the strategic anchors. Ask about the pre-submission feedback: "How did the pre-sub go? Were there any FDA comments that changed the filing strategy?" This shows you understand the regulatory process has iteration. Reference {{submission_quarter}} as the target. Naturally lead into the final submission step. Use an authoritative but collaborative tone — you\'re a regulatory advisor, not a cheerleader.' },

    // ── Layer 4: terminal goal ──
    { id: GOAL.fdaSubmission, name: 'FDA Submission', icon: 'Send', color: '#F97316',
      desc: 'The 510(k) has been submitted to FDA with a tracking number and target date.',
      endType: 'continue', prerequisiteGate: 'all', forkType: 'parallel',
      achievedPrompt: 'This is the culmination of the program — express genuine respect for the work. Reference the full journey: the {{regulatory_pathway}} pathway, the {{predicate_device}} predicate, the {{submission_quarter}} target. Ask what\'s next for the team: "With the filing submitted, what\'s the plan while waiting for FDA response? Is the {{market_launch_region}} launch team already ramping up the {{reimbursement_strategy}} reimbursement strategy?" Frame the conversation as forward-looking even though the session is ending. Close warmly but professionally — express that you enjoyed working through the design control landscape with them. Do NOT be overly celebratory or use exclamation marks excessively — match the tone of a senior advisor wrapping up an engagement.' },
  ];

  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    await pool.query(`
      INSERT INTO goals (id, project_id, name, description, icon, accent_color, sort_order,
        end_type, achieved_prompt, prerequisite_gate, fork_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [g.id, PROJECT_ID, g.name, g.desc, g.icon, g.color, i + 1,
        g.endType, g.achievedPrompt, g.prerequisiteGate, g.forkType]);
  }

  // Goal DAG edges (prerequisite chains) — 13 edges
  //
  //   Layer 0 → 1:
  //     ReqLocked ─────┬──► VerifComplete (AND)
  //     RiskComplete ──┘
  //     BioCompatCleared ┬──► SupplyChainQual (AND)
  //     ArchDecided ─────┘
  //     ReqLocked ──► ClinApproved
  //
  //   Layer 1 → 2:
  //     VerifComplete ────┬──► DesignTransfer (AND)
  //     SupplyChainQual ──┘
  //     VerifComplete ──┬──► 510(k)Ready (OR — any prereq)
  //     ClinApproved ───┘
  //
  //   Layer 2 → 3:
  //     DesignTransfer ──► MfgValidation  (fork: exclusive)
  //     510(k)Ready ───┬──► RegFiling (AND)
  //     DesignTransfer ┘
  //
  //   Layer 3 → 4:
  //     MfgValidation ─┬──► FDASubmission (AND)
  //     RegFiling ──────┘
  //
  // Layer 0 → 1
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.reqLocked, GOAL.verifComplete]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.riskComplete, GOAL.verifComplete]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.bioCompatCleared, GOAL.supplyChainQual]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.archDecided, GOAL.supplyChainQual]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.reqLocked, GOAL.clinApproved]);
  // Layer 1 → 2
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.verifComplete, GOAL.designTransfer]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.supplyChainQual, GOAL.designTransfer]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.verifComplete, GOAL.fivetenReady]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.clinApproved, GOAL.fivetenReady]);
  // Layer 2 → 3
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.designTransfer, GOAL.mfgValidation]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.fivetenReady, GOAL.regFiling]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.designTransfer, GOAL.regFiling]);
  // Layer 3 → 4
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.mfgValidation, GOAL.fdaSubmission]);
  await pool.query(`INSERT INTO goal_edges (id, project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3, $4)`, [id(), PROJECT_ID, GOAL.regFiling, GOAL.fdaSubmission]);

  // Goal → Variable Bindings
  const goalBindings: { goalId: string; varId: string; required: boolean }[] = [
    // Requirements Locked
    { goalId: GOAL.reqLocked, varId: VAR.regulatoryPathway, required: true },
    { goalId: GOAL.reqLocked, varId: VAR.targetPopulation, required: true },
    { goalId: GOAL.reqLocked, varId: VAR.predicateDevice, required: false },
    // Risk Analysis Complete
    { goalId: GOAL.riskComplete, varId: VAR.riskTolerance, required: true },
    { goalId: GOAL.riskComplete, varId: VAR.highestRiskSubsystem, required: false },
    // Biocompatibility Cleared
    { goalId: GOAL.bioCompatCleared, varId: VAR.biocompatibilityConfirmed, required: true },
    { goalId: GOAL.bioCompatCleared, varId: VAR.riskTolerance, required: false },
    // Architecture Decided
    { goalId: GOAL.archDecided, varId: VAR.softwareClassification, required: true },
    { goalId: GOAL.archDecided, varId: VAR.highestRiskSubsystem, required: false },
    // Verification Complete
    { goalId: GOAL.verifComplete, varId: VAR.allTestsExecuted, required: true },
    { goalId: GOAL.verifComplete, varId: VAR.openCriticalNcs, required: false },
    { goalId: GOAL.verifComplete, varId: VAR.softwareClassification, required: false },
    // Supply Chain Qualified
    { goalId: GOAL.supplyChainQual, varId: VAR.biocompatibilityConfirmed, required: false },
    { goalId: GOAL.supplyChainQual, varId: VAR.highestRiskSubsystem, required: false },
    // Clinical Protocol Approved
    { goalId: GOAL.clinApproved, varId: VAR.irbStatus, required: true },
    { goalId: GOAL.clinApproved, varId: VAR.primaryEndpointMet, required: false },
    { goalId: GOAL.clinApproved, varId: VAR.enrollmentTarget, required: false },
    // Design Transfer Ready
    { goalId: GOAL.designTransfer, varId: VAR.allTestsExecuted, required: true },
    { goalId: GOAL.designTransfer, varId: VAR.openCriticalNcs, required: true },
    // 510(k) Ready
    { goalId: GOAL.fivetenReady, varId: VAR.predicateDevice, required: true },
    { goalId: GOAL.fivetenReady, varId: VAR.submissionQuarter, required: false },
    { goalId: GOAL.fivetenReady, varId: VAR.regulatoryPathway, required: false },
    // Manufacturing Validation
    { goalId: GOAL.mfgValidation, varId: VAR.allTestsExecuted, required: false },
    // Regulatory Filing
    { goalId: GOAL.regFiling, varId: VAR.predicateDevice, required: true },
    { goalId: GOAL.regFiling, varId: VAR.regulatoryPathway, required: true },
    { goalId: GOAL.regFiling, varId: VAR.submissionQuarter, required: false },
    // FDA Submission
    { goalId: GOAL.fdaSubmission, varId: VAR.submissionQuarter, required: true },
    { goalId: GOAL.fdaSubmission, varId: VAR.marketLaunchRegion, required: false },
    { goalId: GOAL.fdaSubmission, varId: VAR.reimbursementStrategy, required: false },
    // User Intake
    { goalId: GOAL.userIntake, varId: VAR.userName, required: false },
    { goalId: GOAL.userIntake, varId: VAR.userEmail, required: false },
  ];
  for (const b of goalBindings) {
    await pool.query(`
      INSERT INTO goal_variable_bindings (id, goal_id, variable_id, required)
      VALUES ($1, $2, $3, $4)
    `, [id(), b.goalId, b.varId, b.required]);
  }

  // Goal relevant nord types
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.reqLocked, NT.requirement]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.riskComplete, NT.risk]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.bioCompatCleared, NT.risk]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.archDecided, NT.adr]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.verifComplete, NT.testCase]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.supplyChainQual, NT.subsystem]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.clinApproved, NT.clinicalProto]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.designTransfer, NT.subsystem]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.fivetenReady, NT.regSub]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.mfgValidation, NT.testCase]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.regFiling, NT.regSub]);
  await pool.query(`INSERT INTO goal_relevant_nord_types (id, goal_id, nord_type_id) VALUES ($1, $2, $3)`, [id(), GOAL.fdaSubmission, NT.regSub]);

  // Goal → Relevant Nords (specific nords linked to goals)
  const goalRelevantNords: { goalId: string; nordId: string }[] = [
    // Requirements Locked — all 8 requirements
    ...Object.values(REQ).map(nordId => ({ goalId: GOAL.reqLocked, nordId })),
    // Risk Analysis Complete — all 8 risks
    ...Object.values(RISK).map(nordId => ({ goalId: GOAL.riskComplete, nordId })),
    // Biocompatibility Cleared — dermatitis risk + sensor module
    { goalId: GOAL.bioCompatCleared, nordId: RISK.h005 },
    { goalId: GOAL.bioCompatCleared, nordId: SUB.sensor },
    { goalId: GOAL.bioCompatCleared, nordId: SUB.applicator },
    // Architecture Decided — all ADRs
    ...Object.values(ADR).map(nordId => ({ goalId: GOAL.archDecided, nordId })),
    // Verification Complete — all 10 test cases
    ...Object.values(TC).map(nordId => ({ goalId: GOAL.verifComplete, nordId })),
    // Supply Chain Qualified — all subsystems
    ...Object.values(SUB).map(nordId => ({ goalId: GOAL.supplyChainQual, nordId })),
    // Clinical Protocol Approved — all 3 clinical protocols
    ...Object.values(CP).map(nordId => ({ goalId: GOAL.clinApproved, nordId })),
    // Design Transfer Ready — subsystems + milestone
    ...Object.values(SUB).map(nordId => ({ goalId: GOAL.designTransfer, nordId })),
    { goalId: GOAL.designTransfer, nordId: MS.ms3 },
    // 510(k) Ready — both regulatory submissions
    { goalId: GOAL.fivetenReady, nordId: REGSUB.fivetenk },
    { goalId: GOAL.fivetenReady, nordId: REGSUB.ceMark },
    // Manufacturing Validation — applicator + sensor subsystems
    { goalId: GOAL.mfgValidation, nordId: SUB.applicator },
    { goalId: GOAL.mfgValidation, nordId: SUB.sensor },
    // Regulatory Filing — submissions + substantial equivalence ADR
    { goalId: GOAL.regFiling, nordId: REGSUB.fivetenk },
    { goalId: GOAL.regFiling, nordId: ADR.adr006 },
    // FDA Submission — 510(k) submission + submission milestone
    { goalId: GOAL.fdaSubmission, nordId: REGSUB.fivetenk },
    { goalId: GOAL.fdaSubmission, nordId: MS.ms5 },
  ];
  for (const grn of goalRelevantNords) {
    await pool.query(`
      INSERT INTO goal_relevant_nords (id, goal_id, nord_id)
      VALUES ($1, $2, $3)
    `, [id(), grn.goalId, grn.nordId]);
  }

  console.log('  ✅ 13 Goals (with DAG + variable bindings + relevant nords + achieved prompts)');

  /* ══════════════════════════════════════════════════════════════════════
   * PERSONAS (5) — with mental models + category weights + goal weights
   * ══════════════════════════════════════════════════════════════════════ */

  const personas = [
    { id: PERSONA.priya, name: 'Dr. Priya Sharma', color: '#DC2626', temp: 0.3, exchangeStyle: 'interrogate' as const,
      bg: '15 years in regulatory strategy. Former FDA reviewer. Led 12 successful 510(k) submissions across Class II diagnostics.',
      motivation: 'Ensure every design decision has a clear regulatory rationale and traceability chain.',
      voice: 'Precise, citation-heavy, risk-averse. References specific FDA guidance documents and ISO standards.',
      guardrails: [
        { mode: 'must', text: 'Always cite specific FDA guidance documents or ISO standards when discussing regulatory requirements.' },
        { mode: 'must', text: 'Frame every risk discussion in terms of patient safety first, then regulatory compliance.' },
        { mode: 'never', text: 'Never recommend skipping or deferring a design control milestone to save time.' },
        { mode: 'never', text: 'Never speculate about FDA review outcomes — only discuss what the guidance says.' },
        { mode: 'prefer', text: 'Prefer conservative interpretations of regulatory ambiguity.' },
      ],
      mentalModels: [
        { name: 'Predicate-Based Claims', body: 'FDA speaks in predicates — every claim needs a comparator' },
        { name: 'Risk as Lingua Franca', body: 'Risk is the universal language between engineering and regulation' },
        { name: 'Traceability First', body: 'Traceability is not optional — it IS the product documentation' },
        { name: 'Design Controls as Method', body: 'Design controls aren\'t bureaucracy — they\'re the engineering method with receipts' },
        { name: 'Substantial Equivalence', body: 'Substantial equivalence is a legal argument, not a technical one' },
      ],
      catWeights: { [CT.designControl]: 25, [CT.blocks]: 30, [CT.mitigates]: 20, [CT.verifies]: 15, [CT.assignedTo]: -10, [CT.partOf]: 0, [CT.reportedIn]: 5, [CT.relatesTo]: -5 },
      goalWeights: { [GOAL.reqLocked]: 15, [GOAL.riskComplete]: 25, [GOAL.bioCompatCleared]: 20, [GOAL.archDecided]: 5, [GOAL.verifComplete]: 20, [GOAL.supplyChainQual]: 10, [GOAL.clinApproved]: 10, [GOAL.designTransfer]: 5, [GOAL.fivetenReady]: 30, [GOAL.mfgValidation]: 5, [GOAL.regFiling]: 25, [GOAL.fdaSubmission]: 25 },
    },
    { id: PERSONA.marcus, name: 'Marcus Cole', color: '#3B82F6', temp: 0.4, exchangeStyle: 'bi_directional' as const,
      bg: '10 years in embedded medical devices. Previously at Medtronic on insulin pump firmware. Expert in IEC 62304 software lifecycle.',
      motivation: 'Ship a reliable, maintainable system architecture that passes verification on the first attempt.',
      voice: 'Direct, technical, skeptical of shortcuts. Uses engineering precision.',
      guardrails: [
        { mode: 'must', text: 'Always ask about test coverage and failure modes when discussing any subsystem.' },
        { mode: 'must', text: 'Treat every software change as a potential regression until verified.' },
        { mode: 'never', text: 'Never recommend a software architecture change without discussing its impact on verification.' },
        { mode: 'prefer', text: 'Prefer modular, testable designs over clever optimizations.' },
      ],
      mentalModels: [
        { name: 'Architecture–Requirements Duality', body: 'Architecture absorbs requirements or requirements absorb architecture' },
        { name: 'Interfaces as Failure Surfaces', body: 'Every interface is a failure surface' },
        { name: 'Risk-Ordered Testing', body: 'Test what kills, then test what annoys' },
        { name: 'Tech Debt Ships with the Patient', body: 'Technical debt in a medical device ships with the patient' },
        { name: 'Class C Code Liability', body: 'IEC 62304 Class C means every line of code is a liability' },
      ],
      catWeights: { [CT.partOf]: 25, [CT.verifies]: 20, [CT.blocks]: 15, [CT.mitigates]: 10, [CT.designControl]: 5, [CT.assignedTo]: 10, [CT.reportedIn]: 5, [CT.relatesTo]: 0 },
      goalWeights: { [GOAL.reqLocked]: 20, [GOAL.riskComplete]: 15, [GOAL.bioCompatCleared]: 10, [GOAL.archDecided]: 25, [GOAL.verifComplete]: 30, [GOAL.supplyChainQual]: 15, [GOAL.clinApproved]: 0, [GOAL.designTransfer]: 20, [GOAL.fivetenReady]: 5, [GOAL.mfgValidation]: 15, [GOAL.regFiling]: 5, [GOAL.fdaSubmission]: 5 },
    },
    { id: PERSONA.sarah, name: 'Sarah Kim', color: '#0EA5E9', temp: 0.6, exchangeStyle: 'free_form' as const,
      bg: 'PhD in Biomedical Engineering. 8 years in clinical trials for continuous monitoring devices. Managed 5 pivotal studies.',
      motivation: 'Design clinically meaningful studies that generate the evidence FDA needs while protecting patient safety.',
      voice: 'Empathetic, evidence-focused, methodical. Balances scientific rigor with patient advocacy.',
      guardrails: [
        { mode: 'must', text: 'Always consider the patient experience when discussing clinical protocols.' },
        { mode: 'must', text: 'Ground clinical claims in published evidence or study data.' },
        { mode: 'never', text: 'Never recommend a study design that compromises patient safety for speed.' },
        { mode: 'prefer', text: 'Prefer adaptive trial designs that allow early stopping for safety signals.' },
      ],
      mentalModels: [
        { name: 'The Invisible Stakeholder', body: 'The patient is the stakeholder we never meet' },
        { name: 'Clinical Meaningfulness', body: 'Endpoints must be clinically meaningful, not just statistically significant' },
        { name: 'IRB as Patient Shield', body: 'IRBs protect patients from us — not from the device' },
        { name: 'Post-Market Truth', body: 'Post-market surveillance is where the real data lives' },
        { name: 'Study Design Foresight', body: 'A well-designed study answers questions we haven\'t thought to ask yet' },
      ],
      catWeights: { [CT.reportedIn]: 25, [CT.verifies]: 15, [CT.relatesTo]: 10, [CT.designControl]: 5, [CT.mitigates]: 10, [CT.blocks]: 0, [CT.assignedTo]: -5, [CT.partOf]: -10 },
      goalWeights: { [GOAL.reqLocked]: 5, [GOAL.riskComplete]: 10, [GOAL.bioCompatCleared]: 15, [GOAL.archDecided]: 0, [GOAL.verifComplete]: 10, [GOAL.supplyChainQual]: 5, [GOAL.clinApproved]: 30, [GOAL.designTransfer]: 5, [GOAL.fivetenReady]: 15, [GOAL.mfgValidation]: 0, [GOAL.regFiling]: 10, [GOAL.fdaSubmission]: 10 },
    },
    { id: PERSONA.james, name: 'James Okonkwo', color: '#F59E0B', temp: 0.3, exchangeStyle: 'interrogate' as const,
      bg: '12 years in medical device QMS. ISO 13485 Lead Auditor. Built the quality system at two startups from scratch.',
      motivation: 'Ensure every process is documented, every nonconformance is closed, and the design history file is audit-ready.',
      voice: 'Methodical, thorough, documentation-obsessive. Phrases things as audit findings.',
      guardrails: [
        { mode: 'must', text: 'Always ask if the discussion point is documented in the design history file.' },
        { mode: 'must', text: 'Treat every nonconformance as open until a CAPA is verified effective.' },
        { mode: 'never', text: 'Never accept verbal confirmation as sufficient evidence of completion.' },
        { mode: 'prefer', text: 'Prefer traceable, objective evidence over subjective assessments.' },
      ],
      mentalModels: [
        { name: 'Documentation as Proof', body: 'If it\'s not documented, it didn\'t happen' },
        { name: 'Root Cause Persistence', body: 'CAPAs close — root causes don\'t hide' },
        { name: 'Design History as Narrative', body: 'Design history is the product\'s autobiography' },
        { name: 'QMS Philosophy', body: 'ISO 13485 is not a checklist — it\'s a philosophy of controlled chaos' },
        { name: 'Audit Findings as Gifts', body: 'An audit finding is a gift — it tells you where your system is weak' },
      ],
      catWeights: { [CT.verifies]: 30, [CT.assignedTo]: 15, [CT.blocks]: 10, [CT.reportedIn]: 10, [CT.designControl]: 10, [CT.mitigates]: 5, [CT.partOf]: 0, [CT.relatesTo]: -5 },
      goalWeights: { [GOAL.reqLocked]: 20, [GOAL.riskComplete]: 20, [GOAL.bioCompatCleared]: 15, [GOAL.archDecided]: 10, [GOAL.verifComplete]: 30, [GOAL.supplyChainQual]: 15, [GOAL.clinApproved]: 5, [GOAL.designTransfer]: 20, [GOAL.fivetenReady]: 15, [GOAL.mfgValidation]: 10, [GOAL.regFiling]: 10, [GOAL.fdaSubmission]: 10 },
    },
    { id: PERSONA.elena, name: 'Elena Vasquez', color: '#8B5CF6', temp: 0.7, exchangeStyle: 'bi_directional' as const,
      bg: '9 years in medtech product management. Previously led consumer health products at Abbott. Expert in translating clinical requirements into user experiences.',
      motivation: 'Ship a device that Type 2 patients actually want to wear — not just one that passes regulatory review.',
      voice: 'Strategic, user-centric, impatient with unnecessary complexity. Uses market language.',
      guardrails: [
        { mode: 'must', text: 'Always relate technical decisions back to patient and user impact.' },
        { mode: 'must', text: 'Consider market timing and competitive landscape in strategic discussions.' },
        { mode: 'never', text: 'Never dismiss user experience concerns as secondary to regulatory compliance.' },
        { mode: 'prefer', text: 'Prefer solutions that simplify the patient experience even if they add engineering complexity.' },
      ],
      mentalModels: [
        { name: 'Simplicity over Precision', body: 'Patients choose simplicity over precision every time' },
        { name: 'Time-to-Market as Feature', body: 'Time to market is a feature — every month is a month patients don\'t have this' },
        { name: 'Regulatory Moats', body: 'Every regulation we exceed is a competitive moat' },
        { name: 'Invisible Device', body: 'The best medical device is one patients forget they\'re wearing' },
        { name: 'Market Access as Last Mile', body: 'Market access is the last mile — clearance means nothing without reimbursement' },
      ],
      catWeights: { [CT.designControl]: 20, [CT.assignedTo]: 15, [CT.blocks]: 10, [CT.relatesTo]: 5, [CT.mitigates]: 5, [CT.verifies]: 0, [CT.partOf]: -5, [CT.reportedIn]: -5 },
      goalWeights: { [GOAL.reqLocked]: 10, [GOAL.riskComplete]: 5, [GOAL.bioCompatCleared]: 5, [GOAL.archDecided]: 5, [GOAL.verifComplete]: 10, [GOAL.supplyChainQual]: 10, [GOAL.clinApproved]: 10, [GOAL.designTransfer]: 15, [GOAL.fivetenReady]: 20, [GOAL.mfgValidation]: 15, [GOAL.regFiling]: 20, [GOAL.fdaSubmission]: 30 },
    },
  ];

  for (let i = 0; i < personas.length; i++) {
    const p = personas[i];
    await pool.query(`
      INSERT INTO personas (id, project_id, name, accent_color, background, primary_motivation, voice_and_tone, temperature, guardrails, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [p.id, PROJECT_ID, p.name, p.color, p.bg, p.motivation, p.voice, p.temp, JSON.stringify(p.guardrails || []), i + 1]);

    // Mental Models
    for (let j = 0; j < p.mentalModels.length; j++) {
      await pool.query(`
        INSERT INTO persona_mental_models (id, persona_id, name, body, sort_order)
        VALUES ($1, $2, $3, $4, $5)
      `, [id(), p.id, p.mentalModels[j].name, p.mentalModels[j].body, j + 1]);
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
   * TEST SCENARIOS (5) — one behavior profile each, same core objective
   *
   * Talk Track: "Before you ship, you test five fake users:
   *   one who cooperates, one who rambles, one who gives one-word answers,
   *   one who argues, and one who's in a rush."
   *
   * All 5 test: Can the AI figure out the regulatory strategy?
   * ══════════════════════════════════════════════════════════════════════ */

  const testScenarios = [
    {
      name: 'The Cooperative — Straightforward Reg Review',
      description: 'Cooperative user. Answers directly, provides context, and moves efficiently through the 510(k) readiness assessment. Baseline scenario — if this one fails, everything fails.',
      user_objective: `I'm Dr. Priya Sharma, VP Regulatory Affairs. I need to assess our 510(k) submission readiness — walk me through the gaps. We're pursuing a 510(k) pathway with substantial equivalence to the Dexcom G7 (K221803), targeting Type 2 Diabetes patients. I'll fill in whatever's missing. Let's get through the requirements, risks, and test data gaps so we can lock down the readiness assessment.`,
      user_profile: 'cooperative',
      persona_id: PERSONA.priya,
      stop_on_goal_id: GOAL.fivetenReady,
      max_rounds: 18,
      stop_on_session_end: true,
    },
    {
      name: 'The Rambler — Stories & Tangents',
      description: 'Tangential user. Wanders off topic and buries answers in stories. The test: can the AI still figure out the regulatory strategy? This user has all the same information as the cooperative — they just take the scenic route sharing it.',
      user_objective: `I'm Dr. Priya Sharma, VP Regulatory Affairs. I need to talk through our 510(k) readiness but honestly I have a LOT on my mind right now. We're doing 510(k), substantial equivalence to the G7 — actually that reminds me of a conversation I had at RAPS last year about predicate device selection strategy. Anyway, target population is Type 2 Diabetes. I tend to go off on tangents but I always come back to the point eventually. I have opinions about everything and I like to share context and backstory. The AI needs to figure out what matters from what I say.`,
      user_profile: 'tangential',
      persona_id: PERSONA.priya,
      stop_on_goal_id: GOAL.fivetenReady,
      max_rounds: 20,
      stop_on_session_end: true,
    },
    {
      name: 'The Quiet One — One-Word Answers',
      description: 'Reluctant user. Gives one-word answers, doesn\'t volunteer information, and makes the AI work for every data point. The test: can the AI still extract the regulatory strategy from someone who barely talks?',
      user_objective: `I'm Dr. Priya Sharma, VP Regulatory Affairs. I know the answers to the regulatory questions but I'm not going to volunteer them. The pathway is 510(k). Predicate is Dexcom G7. Population is Type 2 Diabetes. I'll confirm things if asked directly, but I'm not going to elaborate unless pressed. Short answers only.`,
      user_profile: 'reluctant',
      persona_id: PERSONA.priya,
      stop_on_goal_id: GOAL.fivetenReady,
      max_rounds: 22,
      stop_on_session_end: true,
    },
    {
      name: 'The Challenger — Argues Everything',
      description: 'Adversarial user. Pushes back on the AI\'s questions, challenges assumptions, and plays devil\'s advocate. The test: can the AI still figure out the regulatory strategy when the user argues about everything? The user respects competence — if the AI demonstrates knowledge, they\'ll eventually share the information.',
      user_objective: `I'm Dr. Priya Sharma, VP Regulatory Affairs. I'm not convinced we've thought through the 510(k) strategy carefully enough. Sure, the official plan is 510(k) with the G7 predicate and Type 2 Diabetes population, but I want to pressure-test that. Why not PMA? What if the predicate argument falls apart? I'm going to challenge the AI on everything — not because I'm being difficult, but because I need to know it actually understands our regulatory landscape before I trust it with our submission strategy.`,
      user_profile: 'adversarial',
      persona_id: PERSONA.priya,
      stop_on_goal_id: GOAL.fivetenReady,
      max_rounds: 20,
      stop_on_session_end: true,
    },
    {
      name: 'The Speedrunner — No Time, Just Data',
      description: 'Rushed user. Texting from their phone between meetings. Ultra-short messages, abbreviations, no patience. The test: can the AI still figure out the regulatory strategy when the user has 5 minutes and zero tolerance for small talk?',
      user_objective: `I'm Priya, VP Reg Affairs. 510k pathway, G7 predicate, Type 2 population. I have like 5 minutes before my next meeting. Just need to knock out the readiness assessment, tell me what's missing and I'll confirm. No time for long discussions.`,
      user_profile: 'rushed',
      persona_id: PERSONA.priya,
      stop_on_goal_id: GOAL.fivetenReady,
      max_rounds: 15,
      stop_on_session_end: true,
    },
  ];

  for (const ts of testScenarios) {
    await pool.query(`
      INSERT INTO test_scenarios (project_id, name, description, user_objective, user_profile,
        persona_id, stop_on_goal_id, max_rounds,
        agent_model, user_model, stop_on_session_end)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [PROJECT_ID, ts.name, ts.description, ts.user_objective, ts.user_profile,
        ts.persona_id, ts.stop_on_goal_id, ts.max_rounds,
        'gemini-2.5-flash', 'gemini-2.5-flash-lite', ts.stop_on_session_end]);
  }
  console.log('  ✅ 5 Test Scenarios (one per behavior profile)');

  /* ══════════════════════════════════════════════════════════════════════
   * SET DEFAULT PERSONA + STAR THE PROJECT
   * ══════════════════════════════════════════════════════════════════════ */
  await pool.query(`UPDATE projects SET default_persona_id = $1 WHERE id = $2`, [PERSONA.priya, PROJECT_ID]);
  await pool.query(`INSERT INTO user_favorites (user_id, project_id) VALUES ($1, $2)`, [userId, PROJECT_ID]);

  console.log('\n⭐ Default persona: Dr. Priya Sharma');
  console.log('⭐ Project starred for dev user');

  /* ══════════════════════════════════════════════════════════════════════
   * SHOWCASE PROJECTS (smoke-test — dashboard filler for demos)
   * ══════════════════════════════════════════════════════════════════════ */
  const showcaseProjects = [
    {
      name: 'Meridian Wealth — Chen Family Office',
      description: 'Ultra-high-net-worth estate and portfolio planning for a $47M multi-generational wealth transfer across three jurisdictions. Coordinates tax strategy, asset allocation, regulatory compliance, and family governance through four specialist lenses.',
      purpose: 'Orchestrate the complete wealth transfer lifecycle — from entity structuring and tax optimization through beneficiary planning and client approval — for a multi-entity, multi-jurisdiction family office.',
      icon: 'Landmark',
      accent_color: '#10B981',
      project_mode: 'guided',
    },
    {
      name: 'Puma Canyon Complex — Incident Command',
      description: 'Type 1 wildfire incident command for a 47,000-acre fire threatening Pine Ridge (pop. 12,400). Manages real-time resource allocation, fire behavior analysis, evacuation sequencing, and multi-agency coordination across three divisions.',
      purpose: 'Coordinate wildfire suppression operations, evacuation planning, and resource deployment across 14 agencies — with AI personas that think like an Incident Commander, Fire Behavior Analyst, Evacuation Coordinator, and Operations Chief.',
      icon: 'Flame',
      accent_color: '#F97316',
      project_mode: 'guided',
    },
    {
      name: 'Ironclad Partners — Cascade Precision Turnaround',
      description: 'Private equity value creation playbook for a $280M precision machining acquisition. EBITDA bridge from 11.2% to 18% across pricing optimization, procurement consolidation, aftermarket launch, and organizational restructuring over a 24-month hold.',
      purpose: 'Execute a PE portfolio company turnaround — from commercial and operational diagnostics through pricing optimization, talent restructuring, and EBITDA bridge validation — coordinating operating partner, CFO, commercial lead, and talent strategist perspectives.',
      icon: 'TrendingUp',
      accent_color: '#6366F1',
      project_mode: 'guided',
    },
    {
      name: 'Artemis VII — Crewed Mars Orbit Mission',
      description: 'Interplanetary mission architecture for a 4-crew, 847-day Mars orbit reconnaissance. Balances mass budgets, trajectory design, nuclear thermal propulsion, closed-loop life support, and technology readiness across a conjunction-class flight profile.',
      purpose: 'Close the mission architecture — from mass budget allocation and trajectory baselining through technology maturation and crew certification — navigating the tradeoffs between propulsion, life support, and programmatic risk that define deep-space exploration.',
      icon: 'Rocket',
      accent_color: '#0EA5E9',
      project_mode: 'guided',
    },
    {
      name: 'Apex Autonomy — Haul-1 L4 Certification',
      description: 'Level 4 autonomous truck safety certification program for I-10 hub-to-hub freight. 340 perception tickets, 12 unresolved hazard scenarios, 900M simulation miles, and three field test campaigns flowing into FMVSS exemption and commercial launch authority.',
      purpose: 'Drive an autonomous vehicle program from engineering backlog through safety case submission — coordinating perception engineering, safety certification, simulation validation, and field operations into a single regulatory-ready deployment argument.',
      icon: 'Truck',
      accent_color: '#8B5CF6',
      project_mode: 'guided',
    },
  ];

  for (const sp of showcaseProjects) {
    await pool.query(`
      INSERT INTO projects (id, name, description, purpose, icon, accent_color,
        mcp_enabled, mcp_capture_data, mcp_mutable, project_mode, goals_enabled,
        graph_only, is_demo, created_by)
      VALUES ($1, $2, $3, $4, $5, $6,
        false, false, false, $7, false,
        false, false, $8)
    `, [id(), sp.name, sp.description, sp.purpose, sp.icon, sp.accent_color,
        sp.project_mode, userId]);
  }
  console.log('  ✅ 5 showcase projects (dashboard filler)');

  /* ══════════════════════════════════════════════════════════════════════
   * SUMMARY
   * ══════════════════════════════════════════════════════════════════════ */
  console.log(`
╔══════════════════════════════════════════════════╗
║  🎉  Pulse Sense CGM — Design Control           ║
╠══════════════════════════════════════════════════╣
║  10 Nord Types (hidden props + defaultValues)    ║
║   8 Connection Types (props + verbs + stages)    ║
║  59 Nords (with intentional data gaps)           ║
║  ~85 Connections (with typed properties)         ║
║   5 Personas (mental models + weights)           ║
║  13 Goals (complex DAG + bindings + intake)     ║
║  17 Project Variables (6 groups, 3 boolean)      ║
║   3 Test Scenarios (persona-aligned)             ║
║   5 Showcase Projects (dashboard filler)         ║
║                                                  ║
║  Mode: Guided | Goals: Enabled                   ║
║  Default Persona: Dr. Priya Sharma               ║
╚══════════════════════════════════════════════════╝
`);

  await pool.end();
}

run().catch(err => {
  console.error('💥 Seed failed:', err);
  process.exit(1);
});
