#!/usr/bin/env node
/**
 * seed-meridian.ts — Idempotent seed for the Meridian Medical / Pulse Sense CGM demo project.
 *
 * Creates a fully populated project with:
 *   - 10 nord types, 8 connection types
 *   - 64 nords, ~85 connections
 *   - 5 personas with category weights, mental models, goal weights
 *   - 6 goals with DAG edges and variable bindings
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/seed-meridian.ts
 *
 * Prints the project ID when done — pass it to Playwright:
 *   DEMO_PROJECT_ID=<id> npx playwright test --config=../client/playwright-demo.config.ts
 */

import pg from 'pg';
import crypto from 'crypto';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Deterministic IDs for idempotent re-runs
function did(prefix: string, name: string): string {
  const hash = crypto.createHash('md5').update(`meridian:${prefix}:${name}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

async function q<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}

async function qOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] || null;
}

const PROJECT_ID = did('project', 'pulse-sense-cgm');

// ════════════════════════════════════════
// SCHEMA DEFINITIONS
// ════════════════════════════════════════

const NORD_TYPES = [
  {
    name: 'Requirement', icon: 'ClipboardCheck', color: '#3B82F6',
    description: 'Design control requirements per 21 CFR 820.30 — User Needs (what patients and clinicians need), Design Inputs (measurable engineering specs), and Design Outputs (verified deliverables). Each requirement must have a verification method and traceability link.',
    schema: [
      { name: 'req_id', type: 'text', required: true, source: 'user', card_row: 1 },
      { name: 'title', type: 'text', required: true, source: 'user' },
      { name: 'description', type: 'textarea', required: true, source: 'mcp' },
      { name: 'category', type: 'select', required: true, source: 'user', options: ['User Need', 'Design Input', 'Design Output'], card_row: 2 },
      { name: 'priority', type: 'select', required: true, source: 'mcp', options: ['Must Have', 'Should Have', 'Could Have'], card_row: 3 },
      { name: 'verification_method', type: 'select', required: true, source: 'mcp', options: ['Test', 'Inspection', 'Analysis', 'Demonstration'] },
      { name: 'trace_status', type: 'select', required: true, source: 'mcp', options: ['Untraced', 'Partially Traced', 'Traced'] },
    ],
  },
  {
    name: 'Subsystem', icon: 'Cpu', color: '#8B5CF6',
    description: 'Major hardware, software, or platform components that make up the CGM system architecture. Each subsystem has a technology stack, risk classification, and interface specifications.',
    schema: [
      { name: 'title', type: 'text', required: true, source: 'user' },
      { name: 'description', type: 'textarea', required: true, source: 'mcp' },
      { name: 'technology_stack', type: 'text', required: false, source: 'mcp', card_row: 1 },
      { name: 'supplier', type: 'text', required: false, source: 'mcp', card_row: 2 },
      { name: 'risk_class', type: 'select', required: true, source: 'mcp', options: ['Class I', 'Class II', 'Class III'], card_row: 3 },
      { name: 'interface_spec', type: 'textarea', required: false, source: 'mcp' },
    ],
  },
  {
    name: 'Risk', icon: 'AlertTriangle', color: '#EF4444',
    description: 'Hazards and risk items per ISO 14971 — each with severity, probability, and a risk score. Risks must have mitigation strategies and residual risk assessments. Unmitigated risks are critical gaps.',
    schema: [
      { name: 'hazard_id', type: 'text', required: true, source: 'user', card_row: 1 },
      { name: 'hazard', type: 'text', required: true, source: 'user' },
      { name: 'harm', type: 'textarea', required: true, source: 'mcp' },
      { name: 'severity', type: 'number', required: true, source: 'mcp', card_row: 2 },
      { name: 'probability', type: 'number', required: true, source: 'mcp', card_row: 3 },
      { name: 'risk_score', type: 'number', required: false, source: 'mcp' },
      { name: 'mitigation', type: 'textarea', required: true, source: 'mcp' },
      { name: 'residual_risk', type: 'number', required: true, source: 'mcp' },
      { name: 'iso_14971_ref', type: 'text', required: false, source: 'mcp' },
    ],
  },
  {
    name: 'Test Case', icon: 'FlaskConical', color: '#10B981',
    description: 'Verification and validation test protocols that prove requirements are met. Each test case has a protocol, expected result, actual result, and pass/fail disposition. Linked to requirements via the Verifies category.',
    schema: [
      { name: 'test_id', type: 'text', required: true, source: 'user', card_row: 1 },
      { name: 'title', type: 'text', required: true, source: 'user' },
      { name: 'protocol', type: 'textarea', required: true, source: 'mcp' },
      { name: 'expected_result', type: 'textarea', required: true, source: 'mcp' },
      { name: 'actual_result', type: 'textarea', required: true, source: 'mcp' },
      { name: 'pass_fail', type: 'select', required: true, source: 'mcp', options: ['Pass', 'Fail', 'Conditional', 'Not Run'], card_row: 2 },
      { name: 'test_date', type: 'date', required: false, source: 'mcp' },
      { name: 'tester', type: 'text', required: false, source: 'mcp', card_row: 3 },
    ],
  },
  {
    name: 'Bug / Nonconformance', icon: 'Bug', color: '#F59E0B',
    description: 'Defects, deviations, and nonconformances found during testing or production. Tracked with severity, root cause analysis, CAPA requirements, and disposition (Use As Is, Rework, Scrap, Return to Supplier).',
    schema: [
      { name: 'nc_id', type: 'text', required: true, source: 'user', card_row: 1 },
      { name: 'title', type: 'text', required: true, source: 'user' },
      { name: 'description', type: 'textarea', required: true, source: 'mcp' },
      { name: 'severity', type: 'select', required: true, source: 'mcp', options: ['Critical', 'Major', 'Minor'], card_row: 2 },
      { name: 'root_cause', type: 'textarea', required: true, source: 'mcp' },
      { name: 'capa_required', type: 'boolean', required: true, source: 'mcp' },
      { name: 'disposition', type: 'select', required: true, source: 'mcp', options: ['Use As Is', 'Rework', 'Scrap', 'Return to Supplier'], card_row: 3 },
      { name: 'closed_date', type: 'date', required: false, source: 'mcp' },
    ],
  },
  {
    name: 'Team Member', icon: 'User', color: '#6366F1',
    description: 'People involved in the design control process — engineers, regulatory specialists, clinicians, and quality professionals. Tracks role, department, credentials, and signing authority for design reviews.',
    schema: [
      { name: 'name', type: 'text', required: true, source: 'user' },
      { name: 'role', type: 'text', required: true, source: 'user', card_row: 1 },
      { name: 'department', type: 'select', required: true, source: 'user', options: ['Engineering', 'Regulatory', 'Clinical', 'Quality', 'Product', 'Operations'], card_row: 2 },
      { name: 'credentials', type: 'text', required: false, source: 'mcp', card_row: 3 },
      { name: 'signing_authority', type: 'boolean', required: false, source: 'mcp' },
    ],
  },
  {
    name: 'Regulatory Submission', icon: 'FileCheck', color: '#DC2626',
    description: 'FDA and international regulatory filings — 510(k), PMA, De Novo, CE Mark. Tracks submission status, predicate devices, substantial equivalence arguments, and FDA tracking numbers.',
    schema: [
      { name: 'submission_type', type: 'select', required: true, source: 'user', options: ['510(k)', 'PMA', 'De Novo', 'CE Mark'], card_row: 1 },
      { name: 'target_date', type: 'date', required: true, source: 'mcp' },
      { name: 'predicate_device', type: 'text', required: true, source: 'mcp', card_row: 2 },
      { name: 'substantial_equivalence', type: 'textarea', required: true, source: 'mcp' },
      { name: 'status', type: 'select', required: true, source: 'mcp', options: ['Drafting', 'Internal Review', 'Submitted', 'FDA Review', 'Cleared', 'Rejected'], card_row: 3 },
      { name: 'fda_tracking_number', type: 'text', required: false, source: 'mcp' },
    ],
  },
  {
    name: 'Clinical Protocol', icon: 'Stethoscope', color: '#0EA5E9',
    description: 'Clinical study protocols for device validation — feasibility, pivotal, and post-market studies. Tracks IRB approval, sample size, primary endpoints, and enrollment status.',
    schema: [
      { name: 'protocol_id', type: 'text', required: true, source: 'user', card_row: 1 },
      { name: 'title', type: 'text', required: true, source: 'user' },
      { name: 'study_type', type: 'select', required: true, source: 'mcp', options: ['Feasibility', 'Pivotal', 'Post-Market'], card_row: 2 },
      { name: 'sample_size', type: 'number', required: true, source: 'mcp' },
      { name: 'irb_approval_date', type: 'date', required: true, source: 'mcp' },
      { name: 'primary_endpoint', type: 'textarea', required: true, source: 'mcp' },
      { name: 'status', type: 'select', required: true, source: 'mcp', options: ['Draft', 'IRB Review', 'Active', 'Enrollment Complete', 'Closed'], card_row: 3 },
      { name: 'site_count', type: 'number', required: false, source: 'mcp' },
    ],
  },
  {
    name: 'Architecture Decision Record', icon: 'GitBranch', color: '#14B8A6',
    description: 'Documented technical decisions with context, rationale, and alternatives considered. ADRs capture why a particular technology, design pattern, or approach was chosen — essential for design history.',
    schema: [
      { name: 'adr_id', type: 'text', required: true, source: 'user', card_row: 1 },
      { name: 'title', type: 'text', required: true, source: 'user' },
      { name: 'context', type: 'textarea', required: true, source: 'mcp' },
      { name: 'decision', type: 'textarea', required: true, source: 'mcp' },
      { name: 'alternatives', type: 'textarea', required: false, source: 'mcp' },
      { name: 'status', type: 'select', required: true, source: 'mcp', options: ['Proposed', 'Accepted', 'Superseded', 'Deprecated'], card_row: 2 },
      { name: 'decided_by', type: 'text', required: false, source: 'mcp', card_row: 3 },
      { name: 'date', type: 'date', required: false, source: 'mcp' },
    ],
  },
  {
    name: 'Milestone', icon: 'Flag', color: '#F97316',
    description: 'Design review gates, phase gates, and submission deadlines in the product development timeline. Each milestone has exit criteria that must be met before proceeding to the next phase.',
    schema: [
      { name: 'name', type: 'text', required: true, source: 'user' },
      { name: 'target_date', type: 'date', required: true, source: 'mcp', card_row: 1 },
      { name: 'gate_type', type: 'select', required: true, source: 'mcp', options: ['Design Review', 'Phase Gate', 'Submission', 'Regulatory Decision'], card_row: 2 },
      { name: 'exit_criteria', type: 'textarea', required: true, source: 'mcp' },
      { name: 'approved_by', type: 'text', required: false, source: 'mcp', card_row: 3 },
    ],
  },
];

const CONN_TYPES = [
  { name: 'Design Control Phase', direction: 'forward', color: '#3B82F6', style: 'solid', verb: 'advances through',
    description: 'Tracks where an item sits in the FDA design control waterfall — from User Need through Design Input, Design Output, Verification, Validation, and Transfer to Production. The backbone of 21 CFR 820.30 compliance.',
    stages: [
      { label: 'User Need', position: 0.08 }, { label: 'Design Input', position: 0.25 },
      { label: 'Design Output', position: 0.42 }, { label: 'Verification', position: 0.59 },
      { label: 'Validation', position: 0.76 }, { label: 'Transfer to Production', position: 0.92 },
    ],
    prepositions: { forward: 'is in phase', reverse: 'contains', both: 'relates in phase' },
  },
  { name: 'Blocks', direction: 'forward', color: '#EF4444', style: 'dashed', verb: 'blocks',
    description: 'Captures dependency and blocking relationships between items. A blocked item cannot proceed until its blocker is resolved. Critical for identifying bottlenecks in the design control timeline.',
    stages: [
      { label: 'Soft Dependency', position: 0.17 }, { label: 'Hard Dependency', position: 0.5 },
      { label: 'Critical Blocker', position: 0.83 },
    ],
    prepositions: { forward: 'blocks', reverse: 'is blocked by', both: 'blocks' },
  },
  { name: 'Mitigates', direction: 'forward', color: '#10B981', style: 'solid', verb: 'mitigates',
    description: 'Links risk controls and mitigations to the hazards they address. Aligns with ISO 14971 risk management — tracking whether a control monitors, reduces, or eliminates the risk.',
    stages: [
      { label: 'Monitoring', position: 0.17 }, { label: 'Controls', position: 0.5 },
      { label: 'Eliminates', position: 0.83 },
    ],
    prepositions: { forward: 'mitigates', reverse: 'is mitigated by', both: 'mitigates' },
  },
  { name: 'Assigned To', direction: 'forward', color: '#6366F1', style: 'dotted', verb: 'is assigned to',
    description: 'Links items to responsible team members. Tracks workload allocation and ownership — a team member can be Available, Allocated, or Overloaded based on their assignment count.',
    stages: [
      { label: 'Available', position: 0.17 }, { label: 'Allocated', position: 0.5 },
      { label: 'Overloaded', position: 0.83 },
    ],
    prepositions: { forward: 'is assigned to', reverse: 'is responsible for', both: 'is assigned to' },
  },
  { name: 'Verifies', direction: 'forward', color: '#14B8A6', style: 'solid', verb: 'verifies',
    description: 'Links test cases and verification activities to the requirements they validate. Tracks the verification lifecycle from Specified through Protocol Ready, Tested, and Accepted.',
    stages: [
      { label: 'Specified', position: 0.125 }, { label: 'Protocol Ready', position: 0.375 },
      { label: 'Tested', position: 0.625 }, { label: 'Accepted', position: 0.875 },
    ],
    prepositions: { forward: 'verifies', reverse: 'is verified by', both: 'verifies' },
  },
  { name: 'Part Of', direction: 'forward', color: '#8B5CF6', style: 'solid', verb: 'is part of',
    description: 'Defines containment and composition relationships — subsystems containing components, requirements grouped under parent requirements, or items belonging to a regulatory submission.',
    stages: [
      { label: 'Planned', position: 0.17 }, { label: 'Integrated', position: 0.5 },
      { label: 'Validated', position: 0.83 },
    ],
    prepositions: { forward: 'is part of', reverse: 'contains', both: 'is part of' },
  },
  { name: 'Reported In', direction: 'forward', color: '#F59E0B', style: 'dashed', verb: 'was reported in',
    description: 'Links bugs, nonconformances, and issues to the subsystem or component where they were found. Tracks triage and resolution status from New through Resolved.',
    stages: [
      { label: 'New', position: 0.125 }, { label: 'Triaged', position: 0.375 },
      { label: 'Investigating', position: 0.625 }, { label: 'Resolved', position: 0.875 },
    ],
    prepositions: { forward: 'was reported in', reverse: 'has reported', both: 'reported in' },
  },
  { name: 'Relates To', direction: 'both', color: '#9CA3AF', style: 'dotted', verb: 'relates to',
    description: 'A general-purpose association for items that are related but don\'t fit a specific directional category. Use sparingly — prefer a more specific category when one exists.',
    stages: [],
    prepositions: { forward: 'relates to', reverse: 'relates to', both: 'relates to' },
  },
];

// ════════════════════════════════════════
// NORD DATA
// ════════════════════════════════════════

const REQUIREMENTS = [
  { title: 'Continuous glucose measurement for 14 days', props: { req_id: 'REQ-001', title: 'Continuous glucose measurement for 14 days', description: 'The device shall continuously measure interstitial glucose levels for a minimum of 14 days per sensor.', category: 'User Need', priority: 'Must Have', verification_method: 'Test', trace_status: 'Traced' }},
  { title: 'MARD ≤ 10% vs. laboratory reference', props: { req_id: 'REQ-002', title: 'MARD ≤ 10% vs. laboratory reference', description: 'Mean Absolute Relative Difference shall not exceed 10% when compared to YSI laboratory glucose analyzer.', category: 'Design Input', priority: 'Must Have', verification_method: 'Test', trace_status: 'Traced' }},
  { title: 'Wireless data transmission to mobile app', props: { req_id: 'REQ-003', title: 'Wireless data transmission to mobile app', description: 'The transmitter shall wirelessly transmit glucose data to the companion mobile application in real-time.', category: 'Design Input', priority: 'Must Have', verification_method: 'Demonstration', trace_status: 'Partially Traced' }},
  { title: 'Waterproof to IP67 rating', props: { req_id: 'REQ-004', title: 'Waterproof to IP67 rating', description: 'The sensor and transmitter assembly shall meet IP67 ingress protection requirements.', category: 'Design Output', priority: 'Must Have', verification_method: 'Test', trace_status: 'Traced' }},
  { title: 'Painless sensor insertion by patient', props: { req_id: 'REQ-005', title: 'Painless sensor insertion by patient', description: 'Sensor insertion shall be painless enough for daily use by patients unfamiliar with CGM.', category: 'User Need', priority: 'Must Have', verification_method: '', trace_status: '' }},
  { title: 'Alert on hypoglycemia (< 70 mg/dL)', props: { req_id: 'REQ-006', title: 'Alert on hypoglycemia (< 70 mg/dL)', description: 'The system shall generate an alert when glucose readings fall below 70 mg/dL.', category: 'Design Input', priority: 'Must Have', verification_method: 'Test', trace_status: 'Traced' }},
  { title: 'Battery life ≥ 14 days continuous operation', props: { req_id: 'REQ-007', title: 'Battery life ≥ 14 days continuous operation', description: 'The transmitter battery shall support a minimum of 14 days of continuous operation.', category: 'Design Output', priority: 'Should Have', verification_method: 'Test', trace_status: 'Traced' }},
  { title: 'Single-use applicator for sterile deployment', props: { req_id: 'REQ-008', title: 'Single-use applicator for sterile deployment', description: 'A single-use, sterile applicator shall deploy the sensor subcutaneously in a single press.', category: 'Design Output', priority: 'Must Have', verification_method: 'Inspection', trace_status: 'Traced' }},
];

const SUBSYSTEMS = [
  { title: 'Sensor Module', props: { title: 'Sensor Module', description: 'Electrochemical enzyme electrode with glucose oxidase coating and Pt/AgCl reference electrode.', technology_stack: 'Electrochemical enzyme electrode, Pt/AgCl reference', supplier: 'Sensirion AG (Switzerland)', risk_class: 'Class II', interface_spec: 'Analog signal output → ADC on transmitter SoC. 3-electrode configuration: working (Pt), reference (Ag/AgCl), counter (Pt). Signal range: 0.5–50 nA.' }},
  { title: 'Wireless Transmitter', props: { title: 'Wireless Transmitter', description: 'BLE 5.3 System-on-Chip for continuous real-time glucose data transmission.', technology_stack: 'BLE 5.3 SoC (Nordic nRF5340)', supplier: 'Nordic Semiconductor (Norway)', risk_class: 'Class II', interface_spec: 'BLE 5.3 GATT profile. Glucose Measurement characteristic (UUID 0x2A18). 5-minute sampling, 1-minute transmission. AES-128 link-layer encryption.' }},
  { title: 'Mobile Application', props: { title: 'Mobile Application', description: 'Companion mobile app for glucose visualization, alerts, and health data integration.', technology_stack: 'React Native, HealthKit/Health Connect integration', supplier: 'Internal development', risk_class: 'Class II', interface_spec: 'REST API → Cloud Analytics. BLE GATT client. Push notifications via FCM/APNs. HealthKit/Health Connect data export.' }},
  { title: 'Cloud Analytics Platform', props: { title: 'Cloud Analytics Platform', description: 'HIPAA-compliant cloud pipeline for data aggregation, trend analysis, and clinician dashboards.', technology_stack: 'GCP, HIPAA-compliant data pipeline', supplier: 'Google Cloud Platform', risk_class: 'Class I', interface_spec: 'REST API (TLS 1.3). FHIR R4 export for EHR integration. OAuth 2.0 + SMART on FHIR for clinician access. Data retention: 7 years per HIPAA.' }},
  { title: 'Applicator Assembly', props: { title: 'Applicator Assembly', description: 'Spring-loaded single-use applicator for subcutaneous sensor insertion with EO sterilization.', technology_stack: 'Spring-loaded insertion mechanism, EO sterilization', supplier: 'Flex Medical Solutions (Ireland)', risk_class: 'Class II', interface_spec: 'Mechanical interface: snap-fit to sensor module. Spring force: 2.5N ± 0.3N. Insertion depth: 5mm ± 0.5mm. Single-use lockout mechanism.' }},
];

const RISKS = [
  { title: 'Inaccurate glucose reading', props: { hazard_id: 'HAZ-001', hazard: 'Inaccurate glucose reading', harm: 'Incorrect insulin dosing → hypoglycemia', severity: 5, probability: 2, risk_score: 10, mitigation: 'Factory calibration with lot-specific calibration codes', residual_risk: 2, iso_14971_ref: 'ISO 14971:2019 §7.4, Annex C.4.1' }},
  { title: 'Battery thermal runaway', props: { hazard_id: 'HAZ-002', hazard: 'Battery thermal runaway', harm: 'Skin burn at application site', severity: 4, probability: 1, risk_score: 4, mitigation: 'Thermal cutoff circuit, biocompatible encapsulation', residual_risk: 1, iso_14971_ref: 'ISO 14971:2019 §7.4, IEC 62133-2' }},
  { title: 'BLE signal interference', props: { hazard_id: 'HAZ-003', hazard: 'BLE signal interference', harm: 'Delayed glucose alert', severity: 3, probability: 3, risk_score: 9, mitigation: 'Redundant local alarm on transmitter, store-and-forward', residual_risk: 2, iso_14971_ref: 'ISO 14971:2019 §7.4, IEC 60601-1-2 EMC' }},
  { title: 'Sensor wire fracture during removal', props: { hazard_id: 'HAZ-004', hazard: 'Sensor wire fracture during removal', harm: 'Retained foreign body', severity: 4, probability: 2, risk_score: 8, mitigation: 'Reinforced sensor wire (316L stainless), pull-force testing', residual_risk: 1, iso_14971_ref: 'ISO 14971:2019 §7.4, ISO 10993-1 biocompatibility' }},
  { title: 'Adhesive contact dermatitis', props: { hazard_id: 'HAZ-005', hazard: 'Adhesive contact dermatitis', harm: 'Skin irritation / allergic reaction', severity: 3, probability: 4, risk_score: 12, mitigation: '', residual_risk: '', iso_14971_ref: 'ISO 14971:2019 §7.4, ISO 10993-10 skin sensitization' }},
  { title: 'Data breach of glucose data', props: { hazard_id: 'HAZ-006', hazard: 'Data breach of glucose data', harm: 'Patient privacy violation', severity: 4, probability: 2, risk_score: 8, mitigation: 'AES-256 encryption, HIPAA-compliant cloud', residual_risk: 1, iso_14971_ref: 'ISO 14971:2019 §7.4, IEC 62443 cybersecurity' }},
  { title: 'App crash during hypoglycemia alert', props: { hazard_id: 'HAZ-007', hazard: 'App crash during hypoglycemia alert', harm: 'Missed critical alert', severity: 5, probability: 2, risk_score: 10, mitigation: 'Independent hardware alarm on transmitter', residual_risk: 1, iso_14971_ref: 'ISO 14971:2019 §7.4, IEC 62304 §5.2' }},
  { title: 'Applicator misfire — incomplete insertion', props: { hazard_id: 'HAZ-008', hazard: 'Applicator misfire — incomplete insertion', harm: 'Inaccurate readings, patient frustration', severity: 3, probability: 3, risk_score: 9, mitigation: '', residual_risk: '', iso_14971_ref: 'ISO 14971:2019 §7.4, IEC 62366-1 usability' }},
];

const TEST_CASES = [
  { title: 'Sensor accuracy (MARD) vs YSI reference', props: { test_id: 'TC-001', title: 'Sensor accuracy (MARD) vs YSI reference', protocol: 'Compare CGM readings against YSI 2900D analyzer at 15-minute intervals over 14 days in 40 subjects.', expected_result: 'MARD ≤ 10% across all glucose ranges', actual_result: 'MARD 8.7% across 40 subjects', pass_fail: 'Pass', test_date: '2026-04-20', tester: 'Sarah Kim' }},
  { title: '14-day continuous wear duration', props: { test_id: 'TC-002', title: '14-day continuous wear duration', protocol: 'Apply sensor to 50 subjects, monitor sensor signal quality and survival rate through day 14.', expected_result: '≥ 95% sensor survival at day 14', actual_result: '98% sensor survival at day 14', pass_fail: 'Pass', test_date: '2026-04-22', tester: 'Dr. Aisha Patel' }},
  { title: 'IP67 waterproof immersion test', props: { test_id: 'TC-003', title: 'IP67 waterproof immersion test', protocol: 'Immerse sealed transmitter assembly at 1m depth for 30 minutes per IEC 60529.', expected_result: 'No moisture ingress', actual_result: 'No moisture ingress after 30 min at 1m', pass_fail: 'Pass', test_date: '2026-03-15', tester: 'Marcus Cole' }},
  { title: 'BLE range and reliability test', props: { test_id: 'TC-004', title: 'BLE range and reliability test', protocol: 'Measure BLE signal quality at 1m, 5m, and 10m distances across multiple environments.', expected_result: '≥ 99% packet delivery at 5m', actual_result: '', pass_fail: 'Not Run', test_date: '', tester: '' }},
  { title: 'Hypoglycemia alert latency', props: { test_id: 'TC-005', title: 'Hypoglycemia alert latency', protocol: 'Induce controlled glucose drop below 70 mg/dL and measure time from threshold crossing to alert delivery.', expected_result: 'Alert within 5 minutes of threshold', actual_result: 'Mean alert time 4.2 min from threshold', pass_fail: 'Pass', test_date: '2026-05-01', tester: 'Tom Nguyen' }},
  { title: 'Battery life under continuous operation', props: { test_id: 'TC-006', title: 'Battery life under continuous operation', protocol: 'Run transmitter at max BLE duty cycle with continuous glucose simulation. Measure time to battery depletion.', expected_result: '≥ 14 days continuous operation', actual_result: '', pass_fail: 'Not Run', test_date: '', tester: '' }},
  { title: 'Thermal safety — battery stress test', props: { test_id: 'TC-007', title: 'Thermal safety — battery stress test', protocol: 'Subject transmitter to 45°C ambient for 72 hours while operating. Monitor surface temperature continuously.', expected_result: 'Max surface temp ≤ 41°C', actual_result: 'Max surface temp 38.2°C under load', pass_fail: 'Pass', test_date: '2026-04-10', tester: 'Marcus Cole' }},
  { title: 'Sensor wire pull-force test', props: { test_id: 'TC-008', title: 'Sensor wire pull-force test', protocol: 'Apply axial tensile force to sensor wire at insertion angle. Record force at wire failure point.', expected_result: 'Pull force ≥ 2.0N', actual_result: 'Mean pull force 2.8N, min 2.1N', pass_fail: 'Pass', test_date: '2026-03-28', tester: 'Dr. Aisha Patel' }},
  { title: 'Applicator insertion force consistency', props: { test_id: 'TC-009', title: 'Applicator insertion force consistency', protocol: 'Deploy 100 applicators into tissue simulant. Measure insertion depth and force consistency.', expected_result: 'Insertion depth within ±0.5mm, force CV < 10%', actual_result: '', pass_fail: 'Not Run', test_date: '', tester: '' }},
  { title: 'Data encryption end-to-end verification', props: { test_id: 'TC-010', title: 'Data encryption end-to-end verification', protocol: 'Capture BLE and cloud traffic. Verify no plaintext glucose data in transit.', expected_result: 'Zero plaintext glucose values detected', actual_result: 'AES-256-GCM verified, no plaintext in transit', pass_fail: 'Pass', test_date: '2026-05-05', tester: 'Tom Nguyen' }},
];

const BUGS = [
  { title: 'Sensor drift >15% after day 10', props: { nc_id: 'NC-001', title: 'Sensor drift >15% after day 10', description: 'CGM readings drifted beyond 15% MARD after day 10 in humid storage conditions.', severity: 'Critical', root_cause: 'Enzyme degradation in high-humidity storage', capa_required: true, disposition: 'Rework', closed_date: '' }},
  { title: 'BLE disconnection on iOS 17.4', props: { nc_id: 'NC-002', title: 'BLE disconnection on iOS 17.4', description: 'Frequent BLE disconnections observed on iOS 17.4 devices during glucose streaming.', severity: 'Major', root_cause: 'Apple BLE stack regression', capa_required: true, disposition: 'Rework', closed_date: '' }},
  { title: 'Adhesive residue on removal', props: { nc_id: 'NC-003', title: 'Adhesive residue on removal', description: 'Adhesive residue remained on skin after sensor removal in approximately 30% of applications.', severity: 'Minor', root_cause: 'Excess adhesive application in production', capa_required: false, disposition: 'Use As Is', closed_date: '2026-04-18' }},
  { title: 'App crash on Samsung Galaxy S24', props: { nc_id: 'NC-004', title: 'App crash on Samsung Galaxy S24', description: 'Application crashes during glucose chart rendering on Samsung Galaxy S24 devices.', severity: 'Major', root_cause: 'Memory leak in React Native bridge', capa_required: true, disposition: 'Rework', closed_date: '' }},
  { title: 'Applicator spring inconsistency — lot 2024-07', props: { nc_id: 'NC-005', title: 'Applicator spring inconsistency — lot 2024-07', description: 'Spring force varied by 25% across lot 2024-07, causing inconsistent insertion depth.', severity: 'Critical', root_cause: 'Supplier heat treatment deviation', capa_required: true, disposition: 'Scrap', closed_date: '' }},
  { title: 'Cloud dashboard latency >30s', props: { nc_id: 'NC-006', title: 'Cloud dashboard latency >30s', description: 'Cloud dashboard takes >30 seconds to render for patients with >90 days of data history.', severity: 'Minor', root_cause: 'Unindexed time-series queries on large patient datasets', capa_required: false, disposition: 'Rework', closed_date: '' }},
];

const TEAM = [
  { title: 'Dr. Priya Sharma', props: { name: 'Dr. Priya Sharma', role: 'VP Regulatory Affairs', department: 'Regulatory', credentials: 'RAC, former FDA reviewer', signing_authority: true }},
  { title: 'Marcus Cole', props: { name: 'Marcus Cole', role: 'Lead Systems Engineer', department: 'Engineering', credentials: 'BSEE, 10yr embedded medical', signing_authority: true }},
  { title: 'Sarah Kim', props: { name: 'Sarah Kim', role: 'Clinical Affairs Director', department: 'Clinical', credentials: 'PhD Biomedical Engineering', signing_authority: true }},
  { title: 'James Okonkwo', props: { name: 'James Okonkwo', role: 'Quality Assurance Manager', department: 'Quality', credentials: 'ISO 13485 Lead Auditor', signing_authority: true }},
  { title: 'Elena Vasquez', props: { name: 'Elena Vasquez', role: 'Product Director', department: 'Product', credentials: 'MBA, 9yr medtech product', signing_authority: false }},
  { title: 'Dr. Aisha Patel', props: { name: 'Dr. Aisha Patel', role: 'Sensor Design Engineer', department: 'Engineering', credentials: 'PhD Electrochemistry', signing_authority: false }},
  { title: 'Tom Nguyen', props: { name: 'Tom Nguyen', role: 'Software Engineer', department: 'Engineering', credentials: 'BSCS, IEC 62304 certified', signing_authority: false }},
];

const REG_SUBMISSIONS = [
  { title: '510(k) Submission', props: { submission_type: '510(k)', target_date: '2027-01-15', predicate_device: 'Dexcom G7 (K221803)', substantial_equivalence: 'Same intended use (continuous glucose monitoring), same technology (electrochemical enzyme electrode), similar performance characteristics (MARD ≤ 10%), same patient population (Type 1 and Type 2 diabetes).', status: 'Drafting', fda_tracking_number: '' }},
  { title: 'CE Mark Submission', props: { submission_type: 'CE Mark', target_date: '2027-06-01', predicate_device: 'Abbott FreeStyle Libre 3', substantial_equivalence: 'Equivalent intended purpose under MDR 2017/745, Class IIb rule 11. Similar electrochemical sensing, continuous monitoring, and mobile app interface.', status: 'Drafting', fda_tracking_number: '' }},
];

const CLINICAL_PROTOCOLS = [
  { title: 'Sensor accuracy pivotal study', props: { protocol_id: 'CP-001', title: 'Sensor accuracy pivotal study', study_type: 'Pivotal', sample_size: 350, irb_approval_date: '2026-03-15', primary_endpoint: 'MARD vs. YSI reference ≤ 10%', status: 'Active', site_count: 8 }},
  { title: '14-day wear feasibility study', props: { protocol_id: 'CP-002', title: '14-day wear feasibility study', study_type: 'Feasibility', sample_size: 30, irb_approval_date: '2026-05-20', primary_endpoint: 'Sensor survival rate at day 14', status: 'IRB Review', site_count: 2 }},
  { title: 'Real-world usability study', props: { protocol_id: 'CP-003', title: 'Real-world usability study', study_type: 'Post-Market', sample_size: 100, irb_approval_date: '', primary_endpoint: 'System Usability Scale (SUS) ≥ 75', status: 'Draft', site_count: 5 }},
];

const ADRS = [
  { title: 'BLE vs. NFC for data transfer', props: { adr_id: 'ADR-001', title: 'BLE vs. NFC for data transfer', context: 'Need to transmit continuous glucose data from wearable to mobile app. NFC requires proximity tap; BLE enables streaming.', decision: 'BLE 5.3 — continuous streaming required for real-time alerts', alternatives: 'NFC (ISO 15693): lower power but requires tap to read; no real-time alerting. Wi-Fi Direct: excessive power draw for a 14-day wearable.', status: 'Accepted', decided_by: 'Marcus Cole', date: '2025-11-10' }},
  { title: 'React Native vs. native iOS/Android', props: { adr_id: 'ADR-002', title: 'React Native vs. native iOS/Android', context: 'Need to ship companion mobile app on both iOS and Android within 6 months. Team has web-first engineering.', decision: 'React Native — faster iteration, acceptable performance for CGM use case', alternatives: 'Native iOS (Swift) + Android (Kotlin): best performance but doubles development effort. Flutter: less mature BLE plugin ecosystem for medical devices.', status: 'Accepted', decided_by: 'Tom Nguyen', date: '2025-12-05' }},
  { title: 'Factory calibration vs. finger-prick calibration', props: { adr_id: 'ADR-003', title: 'Factory calibration vs. finger-prick calibration', context: 'Traditional CGMs require finger-prick calibration. Factory-cal eliminates patient burden but requires tighter manufacturing.', decision: 'Factory calibration — critical for user experience, requires tighter manufacturing controls', alternatives: 'Finger-prick calibration (2x daily): proven but reduces patient compliance. Hybrid calibration: factory-cal with optional finger-prick override for accuracy concerns.', status: 'Accepted', decided_by: 'Dr. Aisha Patel', date: '2025-10-22' }},
  { title: 'Cloud platform: GCP vs. AWS for HIPAA workloads', props: { adr_id: 'ADR-004', title: 'Cloud platform: GCP vs. AWS for HIPAA workloads', context: 'Evaluating cloud providers for HIPAA-compliant glucose data storage and analytics.', decision: 'GCP — team expertise, Assured Workloads for HIPAA, competitive pricing', alternatives: 'AWS (GovCloud): mature HIPAA tooling but higher cost and team unfamiliarity. Azure: strong healthcare APIs (FHIR) but lacks team experience.', status: 'Accepted', decided_by: 'Tom Nguyen', date: '2026-01-15' }},
  { title: 'Sensor wire material: Platinum vs. gold', props: { adr_id: 'ADR-005', title: 'Sensor wire material: Platinum vs. gold', context: 'Evaluating electrode materials for biocompatibility, signal stability, and manufacturing cost.', decision: '', alternatives: 'Platinum: superior catalytic properties, FDA precedent with Dexcom/Abbott. Gold: lower cost, good conductivity but less catalytic activity for glucose oxidation. Carbon: cheapest but signal drift concerns.', status: 'Proposed', decided_by: '', date: '' }},
  { title: 'Adhesive formulation selection', props: { adr_id: 'ADR-006', title: 'Adhesive formulation selection', context: 'NC-003 and HAZ-005 both relate to adhesive issues. Need to select a medical-grade adhesive that balances 14-day wear adhesion with skin-friendly removal.', decision: '', alternatives: 'Acrylate-based (3M 2477P): strong adhesion, known skin sensitization risk. Silicone-based (Dow Corning MG7-9900): gentler on skin but lower adhesion strength. Hybrid: acrylate perimeter with silicone center.', status: 'Proposed', decided_by: '', date: '' }},
  { title: 'Alert escalation strategy', props: { adr_id: 'ADR-007', title: 'Alert escalation strategy', context: 'HAZ-007 identified risk of missed hypoglycemia alerts if app crashes. Need to decide on multi-layer alert architecture.', decision: 'Three-tier alerting: (1) transmitter buzzer, (2) mobile push notification, (3) emergency contact SMS via cloud', alternatives: 'App-only alerts: simplest but single point of failure. Transmitter + app: two layers but no cloud fallback. Cloud-only: requires connectivity, not suitable for real-time.', status: 'Accepted', decided_by: 'Marcus Cole', date: '2026-02-28' }},
];

const MILESTONES = [
  { title: 'Design Input Review', props: { name: 'Design Input Review', target_date: '2026-02-01', gate_type: 'Design Review', exit_criteria: 'All user needs documented, design inputs derived, traceability matrix complete', approved_by: 'Dr. Priya Sharma' }},
  { title: 'Risk Management Review', props: { name: 'Risk Management Review', target_date: '2026-04-15', gate_type: 'Phase Gate', exit_criteria: 'ISO 14971 risk analysis complete, all residual risks acceptable', approved_by: 'James Okonkwo' }},
  { title: 'Design Verification Complete', props: { name: 'Design Verification Complete', target_date: '2026-07-01', gate_type: 'Phase Gate', exit_criteria: 'All test protocols executed, results documented, no open Critical NCs', approved_by: 'Marcus Cole' }},
  { title: 'Clinical Study Completion', props: { name: 'Clinical Study Completion', target_date: '2026-11-01', gate_type: 'Phase Gate', exit_criteria: 'Pivotal study enrollment complete, primary endpoint met', approved_by: 'Sarah Kim' }},
  { title: '510(k) Submission', props: { name: '510(k) Submission', target_date: '2027-01-15', gate_type: 'Submission', exit_criteria: 'All DHF sections complete, predicate comparison finalized, eSTAR package assembled', approved_by: '' }},
];

// ════════════════════════════════════════
// MAIN SEED FUNCTION
// ════════════════════════════════════════

async function main() {
  console.log('\n🏥 Seeding Meridian Medical — Pulse Sense CGM Demo\n');

  // ── 1. Create / update project ──

  // Resolve the dev user ID — needed for project ownership
  const devUser = await qOne<{ id: string }>(`SELECT id FROM users WHERE email = 'daniel@monumental-i.com' LIMIT 1`);
  const DEV_USER_ID = devUser?.id || null;

  await q(`
    INSERT INTO projects (id, name, description, purpose, project_mode, mcp_enabled, mcp_capture_data, mcp_mutable, goals_enabled, is_demo, created_by, agent_name, agent_icon, mcp_welcome_message)
    VALUES ($1, $2, $3, $4, 'guided', true, true, true, true, true, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, description = EXCLUDED.description, purpose = EXCLUDED.purpose,
      project_mode = 'guided', mcp_enabled = true, mcp_capture_data = true, mcp_mutable = true, goals_enabled = true,
      created_by = COALESCE(EXCLUDED.created_by, projects.created_by),
      agent_name = EXCLUDED.agent_name, agent_icon = EXCLUDED.agent_icon, mcp_welcome_message = EXCLUDED.mcp_welcome_message
  `, [
    PROJECT_ID,
    'Pulse Sense CGM — Design Control',
    'Design control and regulatory pathway management for the Pulse Sense continuous glucose monitor.',
    'Track the complete design control lifecycle of a Class II medical device from user needs through FDA 510(k) clearance.',
    DEV_USER_ID,
    'Meridian',
    'Activity',
    "Hello! I'm Meridian, your CGM design control assistant. I can help you navigate requirements, risks, test results, and regulatory submissions for the Pulse Sense CGM project. What would you like to explore?",
  ]);
  console.log(`  📁 Project: ${PROJECT_ID}`);

  // ── 2. Nord Types ──
  const typeIds: Record<string, string> = {};
  for (const nt of NORD_TYPES) {
    const id = did('type', nt.name);
    typeIds[nt.name] = id;
    await q(`
      INSERT INTO nord_types (id, project_id, name, description, icon, accent_color, properties_schema)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, accent_color = EXCLUDED.accent_color,
        properties_schema = EXCLUDED.properties_schema
    `, [id, PROJECT_ID, nt.name, nt.description, nt.icon, nt.color, JSON.stringify(nt.schema)]);
  }
  console.log(`  ✅ ${NORD_TYPES.length} nord types`);

  // ── 3. Connection Types ──
  const connTypeIds: Record<string, string> = {};
  for (const ct of CONN_TYPES) {
    const id = did('conntype', ct.name);
    connTypeIds[ct.name] = id;
    await q(`
      INSERT INTO connection_types (id, project_id, name, description, default_direction, accent_color, stroke_style, verb, measurement_mode, x_stage_labels, direction_prepositions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'spectrum', $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, default_direction = EXCLUDED.default_direction, accent_color = EXCLUDED.accent_color,
        stroke_style = EXCLUDED.stroke_style, verb = EXCLUDED.verb, x_stage_labels = EXCLUDED.x_stage_labels,
        direction_prepositions = EXCLUDED.direction_prepositions
    `, [id, PROJECT_ID, ct.name, ct.description, ct.direction, ct.color, ct.style, ct.verb, JSON.stringify(ct.stages), JSON.stringify(ct.prepositions)]);
  }
  console.log(`  ✅ ${CONN_TYPES.length} connection types`);

  // ── 4. Nords ──
  const nordIds: Record<string, string> = {};
  const allNords: Array<{ typeName: string; title: string; props: Record<string, any> }> = [
    ...REQUIREMENTS.map(n => ({ typeName: 'Requirement', ...n })),
    ...SUBSYSTEMS.map(n => ({ typeName: 'Subsystem', ...n })),
    ...RISKS.map(n => ({ typeName: 'Risk', ...n })),
    ...TEST_CASES.map(n => ({ typeName: 'Test Case', ...n })),
    ...BUGS.map(n => ({ typeName: 'Bug / Nonconformance', ...n })),
    ...TEAM.map(n => ({ typeName: 'Team Member', ...n })),
    ...REG_SUBMISSIONS.map(n => ({ typeName: 'Regulatory Submission', ...n })),
    ...CLINICAL_PROTOCOLS.map(n => ({ typeName: 'Clinical Protocol', ...n })),
    ...ADRS.map(n => ({ typeName: 'Architecture Decision Record', ...n })),
    ...MILESTONES.map(n => ({ typeName: 'Milestone', ...n })),
  ];

  // Arrange nords on a grid-like layout for the canvas
  // DB stores NORMALIZED 0-1 positions. graphToReactFlow maps: canvasX = position_x * 2000 - 1000
  // So position_x = (canvasX + 1000) / 2000  →  for canvasX in [-900, 900] → position_x in [0.05, 0.95]
  let col = 0, row = 0;
  const COLS = 8;
  for (const n of allNords) {
    const id = did('nord', n.title);
    nordIds[n.title] = id;
    const px = 0.05 + (col / (COLS - 1)) * 0.9;  // 0.05 to 0.95
    const py = 0.05 + (row * 0.12);               // 0.05, 0.17, 0.29, ...
    await q(`
      INSERT INTO nords (id, project_id, type_id, title, properties, position_x, position_y)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, properties = EXCLUDED.properties,
        type_id = EXCLUDED.type_id, position_x = EXCLUDED.position_x, position_y = EXCLUDED.position_y
    `, [id, PROJECT_ID, typeIds[n.typeName], n.title, JSON.stringify(n.props), px, py]);
    col++;
    if (col >= COLS) { col = 0; row++; }
  }
  console.log(`  ✅ ${allNords.length} nords`);

  // ── 5. Connections ──
  const connections: Array<{ src: string; tgt: string; type: string; dx: number }> = [
    // Design Control Phase
    ...REQUIREMENTS.map((r, i) => ({ src: r.title, tgt: r.title, type: 'Design Control Phase', dx: r.props.category === 'User Need' ? 0.08 : r.props.category === 'Design Input' ? 0.25 : 0.42 })),
    // We need actual source→target pairs. Let's create meaningful connections:

    // Verifies: Test Case → Requirement
    { src: 'Sensor accuracy (MARD) vs YSI reference', tgt: 'MARD ≤ 10% vs. laboratory reference', type: 'Verifies', dx: 0.875 },
    { src: '14-day continuous wear duration', tgt: 'Continuous glucose measurement for 14 days', type: 'Verifies', dx: 0.875 },
    { src: 'IP67 waterproof immersion test', tgt: 'Waterproof to IP67 rating', type: 'Verifies', dx: 0.875 },
    { src: 'BLE range and reliability test', tgt: 'Wireless data transmission to mobile app', type: 'Verifies', dx: 0.375 },
    { src: 'Hypoglycemia alert latency', tgt: 'Alert on hypoglycemia (< 70 mg/dL)', type: 'Verifies', dx: 0.875 },
    { src: 'Battery life under continuous operation', tgt: 'Battery life ≥ 14 days continuous operation', type: 'Verifies', dx: 0.375 },
    { src: 'Thermal safety — battery stress test', tgt: 'Battery thermal runaway', type: 'Verifies', dx: 0.875 },
    { src: 'Sensor wire pull-force test', tgt: 'Sensor wire fracture during removal', type: 'Verifies', dx: 0.875 },
    { src: 'Applicator insertion force consistency', tgt: 'Single-use applicator for sterile deployment', type: 'Verifies', dx: 0.375 },
    { src: 'Data encryption end-to-end verification', tgt: 'Data breach of glucose data', type: 'Verifies', dx: 0.875 },

    // Blocks
    { src: 'Inaccurate glucose reading', tgt: 'MARD ≤ 10% vs. laboratory reference', type: 'Blocks', dx: 0.83 },
    { src: 'Adhesive contact dermatitis', tgt: 'Painless sensor insertion by patient', type: 'Blocks', dx: 0.5 },
    { src: 'Applicator misfire — incomplete insertion', tgt: 'Single-use applicator for sterile deployment', type: 'Blocks', dx: 0.5 },
    { src: 'Sensor drift >15% after day 10', tgt: '14-day continuous wear duration', type: 'Blocks', dx: 0.83 },
    { src: 'BLE disconnection on iOS 17.4', tgt: 'BLE range and reliability test', type: 'Blocks', dx: 0.5 },
    { src: 'Applicator spring inconsistency — lot 2024-07', tgt: 'Applicator insertion force consistency', type: 'Blocks', dx: 0.83 },
    { src: 'Design Verification Complete', tgt: '510(k) Submission', type: 'Blocks', dx: 0.5 },
    { src: 'Sensor accuracy pivotal study', tgt: 'Clinical Study Completion', type: 'Blocks', dx: 0.5 },
    { src: 'Wireless data transmission to mobile app', tgt: 'Alert on hypoglycemia (< 70 mg/dL)', type: 'Blocks', dx: 0.17 },
    { src: 'Sensor wire material: Platinum vs. gold', tgt: 'Sensor accuracy (MARD) vs YSI reference', type: 'Blocks', dx: 0.17 },

    // Mitigates
    { src: 'Inaccurate glucose reading', tgt: 'MARD ≤ 10% vs. laboratory reference', type: 'Mitigates', dx: 0.5 },
    { src: 'Battery thermal runaway', tgt: 'Sensor Module', type: 'Mitigates', dx: 0.83 },
    { src: 'BLE signal interference', tgt: 'Wireless Transmitter', type: 'Mitigates', dx: 0.5 },
    { src: 'Sensor wire fracture during removal', tgt: 'Sensor Module', type: 'Mitigates', dx: 0.5 },
    { src: 'Data breach of glucose data', tgt: 'Cloud Analytics Platform', type: 'Mitigates', dx: 0.5 },
    { src: 'App crash during hypoglycemia alert', tgt: 'Mobile Application', type: 'Mitigates', dx: 0.5 },
    { src: 'Applicator misfire — incomplete insertion', tgt: 'Applicator Assembly', type: 'Mitigates', dx: 0.17 },
    { src: 'Adhesive contact dermatitis', tgt: 'Sensor Module', type: 'Mitigates', dx: 0.17 },

    // Assigned To (Marcus overloaded with 7!)
    { src: 'MARD ≤ 10% vs. laboratory reference', tgt: 'Marcus Cole', type: 'Assigned To', dx: 0.83 },
    { src: 'Wireless data transmission to mobile app', tgt: 'Marcus Cole', type: 'Assigned To', dx: 0.83 },
    { src: 'Waterproof to IP67 rating', tgt: 'Marcus Cole', type: 'Assigned To', dx: 0.83 },
    { src: 'Battery life ≥ 14 days continuous operation', tgt: 'Marcus Cole', type: 'Assigned To', dx: 0.83 },
    { src: 'BLE signal interference', tgt: 'Marcus Cole', type: 'Assigned To', dx: 0.83 },
    { src: 'Battery thermal runaway', tgt: 'Marcus Cole', type: 'Assigned To', dx: 0.83 },
    { src: 'Sensor wire fracture during removal', tgt: 'Marcus Cole', type: 'Assigned To', dx: 0.83 },
    { src: '510(k) Submission', tgt: 'Dr. Priya Sharma', type: 'Assigned To', dx: 0.5 },
    { src: 'CE Mark Submission', tgt: 'Dr. Priya Sharma', type: 'Assigned To', dx: 0.5 },
    { src: 'Sensor accuracy pivotal study', tgt: 'Sarah Kim', type: 'Assigned To', dx: 0.5 },
    { src: '14-day wear feasibility study', tgt: 'Sarah Kim', type: 'Assigned To', dx: 0.5 },
    { src: 'Real-world usability study', tgt: 'Sarah Kim', type: 'Assigned To', dx: 0.5 },

    // Part Of
    { src: 'Continuous glucose measurement for 14 days', tgt: 'Sensor Module', type: 'Part Of', dx: 0.67 },
    { src: 'MARD ≤ 10% vs. laboratory reference', tgt: 'Sensor Module', type: 'Part Of', dx: 0.67 },
    { src: 'Wireless data transmission to mobile app', tgt: 'Wireless Transmitter', type: 'Part Of', dx: 0.67 },
    { src: 'Alert on hypoglycemia (< 70 mg/dL)', tgt: 'Mobile Application', type: 'Part Of', dx: 0.67 },
    { src: 'Single-use applicator for sterile deployment', tgt: 'Applicator Assembly', type: 'Part Of', dx: 0.67 },
    { src: 'BLE vs. NFC for data transfer', tgt: 'Wireless Transmitter', type: 'Part Of', dx: 0.67 },
    { src: 'Cloud platform: GCP vs. AWS for HIPAA workloads', tgt: 'Cloud Analytics Platform', type: 'Part Of', dx: 0.67 },

    // Reported In
    { src: 'Sensor drift >15% after day 10', tgt: '14-day continuous wear duration', type: 'Reported In', dx: 0.375 },
    { src: 'BLE disconnection on iOS 17.4', tgt: 'BLE range and reliability test', type: 'Reported In', dx: 0.125 },
    { src: 'Adhesive residue on removal', tgt: 'Sensor accuracy pivotal study', type: 'Reported In', dx: 0.375 },
    { src: 'App crash on Samsung Galaxy S24', tgt: 'Real-world usability study', type: 'Reported In', dx: 0.125 },
    { src: 'Applicator spring inconsistency — lot 2024-07', tgt: 'Applicator insertion force consistency', type: 'Reported In', dx: 0.375 },
    { src: 'Cloud dashboard latency >30s', tgt: 'Data encryption end-to-end verification', type: 'Reported In', dx: 0.125 },

    // Relates To (cross-cutting)
    { src: 'BLE vs. NFC for data transfer', tgt: 'Wireless Transmitter', type: 'Relates To', dx: 0.5 },
    { src: 'React Native vs. native iOS/Android', tgt: 'Mobile Application', type: 'Relates To', dx: 0.5 },
    { src: 'Factory calibration vs. finger-prick calibration', tgt: 'Sensor Module', type: 'Relates To', dx: 0.5 },
    { src: 'Cloud platform: GCP vs. AWS for HIPAA workloads', tgt: 'Cloud Analytics Platform', type: 'Relates To', dx: 0.5 },
    { src: 'Sensor accuracy pivotal study', tgt: 'Design Verification Complete', type: 'Relates To', dx: 0.5 },
    { src: 'Risk Management Review', tgt: 'Inaccurate glucose reading', type: 'Relates To', dx: 0.5 },
    { src: 'Design Input Review', tgt: 'Continuous glucose measurement for 14 days', type: 'Relates To', dx: 0.5 },
  ];

  // Remove self-referencing connections and create actual connections
  let connCount = 0;
  for (const c of connections) {
    if (c.src === c.tgt) continue;
    const srcId = nordIds[c.src];
    const tgtId = nordIds[c.tgt];
    const typeId = connTypeIds[c.type];
    if (!srcId || !tgtId || !typeId) {
      console.warn(`  ⚠️ Missing: ${c.src} → ${c.tgt} (${c.type})`);
      continue;
    }
    const connId = did('conn', `${c.src}→${c.tgt}:${c.type}`);
    await q(`
      INSERT INTO connections (id, project_id, type_id, source_nord_id, target_nord_id, direction, distance_x, distance_y)
      VALUES ($1, $2, $3, $4, $5, 'forward', $6, 0.5)
      ON CONFLICT (id) DO UPDATE SET
        distance_x = EXCLUDED.distance_x
    `, [connId, PROJECT_ID, typeId, srcId, tgtId, c.dx]);
    connCount++;
  }
  console.log(`  ✅ ${connCount} connections`);

  // ── 6. Personas ──
  const PERSONAS = [
    {
      name: 'Dr. Priya Sharma', background: '15 years in regulatory strategy. Former FDA reviewer. Led 12 successful 510(k) submissions across Class II diagnostics.',
      primary_motivation: 'Ensure every design decision has a clear regulatory rationale and traceability chain.',
      voice: 'Precise, citation-heavy, risk-averse. References specific FDA guidance documents and ISO standards.',
      temperature: 0.3,
      guardrails: [
        { mode: 'always', text: 'Cite the specific regulation or guidance (21 CFR section, ISO clause, FDA guidance title) when referencing regulatory requirements.' },
        { mode: 'always', text: 'Flag any requirement that lacks a verification method or traceability link as a gap.' },
        { mode: 'never', text: 'Never claim a submission is "ready" unless all required sections and traceability matrices are complete.' },
        { mode: 'never', text: 'Never downplay the significance of a regulatory finding or open gap.' },
      ],
      models: [
        { name: 'FDA speaks in predicates', body: 'Every claim needs a comparator' },
        { name: 'Risk is the universal language', body: 'Risk is the universal language between engineering and regulation' },
        { name: 'Traceability is not optional', body: 'It IS the product documentation' },
        { name: 'Design controls aren\'t bureaucracy', body: 'They\'re the engineering method with receipts' },
        { name: 'Substantial equivalence is a legal argument', body: 'Not a technical one' },
      ],
      weights: { 'Design Control Phase': 25, 'Blocks': 30, 'Mitigates': 20, 'Verifies': 15, 'Assigned To': -10, 'Part Of': 0, 'Reported In': 5, 'Relates To': -5 },
    },
    {
      name: 'Marcus Cole', background: '10 years in embedded medical devices. Previously at Medtronic on insulin pump firmware. Expert in IEC 62304 software lifecycle.',
      primary_motivation: 'Ship a reliable, maintainable system architecture that passes verification on the first attempt.',
      voice: 'Direct, technical, skeptical of shortcuts. Uses engineering precision.',
      temperature: 0.4,
      guardrails: [
        { mode: 'always', text: 'Identify the specific subsystem or component affected when discussing technical issues.' },
        { mode: 'always', text: 'Consider failure modes and edge cases when evaluating design decisions.' },
        { mode: 'never', text: 'Never recommend bypassing verification testing to meet a deadline.' },
        { mode: 'never', text: 'Never suggest software changes without considering IEC 62304 classification impact.' },
      ],
      models: [
        { name: 'Architecture absorbs requirements', body: 'Architecture absorbs requirements or requirements absorb architecture' },
        { name: 'Every interface is a failure surface', body: 'Every interface is a failure surface' },
        { name: 'Test what kills, then test what annoys', body: 'Test what kills, then test what annoys' },
        { name: 'Technical debt ships with the patient', body: 'Technical debt in a medical device ships with the patient' },
        { name: 'IEC 62304 Class C', body: 'Every line of code is a liability' },
      ],
      weights: { 'Part Of': 25, 'Verifies': 20, 'Blocks': 15, 'Mitigates': 10, 'Design Control Phase': 5, 'Assigned To': 10, 'Reported In': 5, 'Relates To': 0 },
    },
    {
      name: 'Sarah Kim', background: 'PhD in Biomedical Engineering. 8 years in clinical trials for continuous monitoring devices.',
      primary_motivation: 'Design clinically meaningful studies that generate the evidence FDA needs while protecting patient safety.',
      voice: 'Empathetic, evidence-focused, methodical. Balances scientific rigor with patient advocacy.',
      temperature: 0.6,
      guardrails: [
        { mode: 'always', text: 'Frame clinical evidence in terms of patient outcomes and clinical significance, not just statistical p-values.' },
        { mode: 'always', text: 'Reference IRB approval status and informed consent requirements when discussing study protocols.' },
        { mode: 'never', text: 'Never recommend enrolling patients without confirmed IRB approval and informed consent.' },
        { mode: 'never', text: 'Never minimize adverse events or safety signals reported during studies.' },
      ],
      models: [
        { name: 'The patient is the stakeholder we never meet', body: 'The patient is the stakeholder we never meet' },
        { name: 'Endpoints must be clinically meaningful', body: 'Not just statistically significant' },
        { name: 'IRBs protect patients from us', body: 'Not from the device' },
        { name: 'Post-market surveillance', body: 'Where the real data lives' },
        { name: 'Well-designed studies', body: 'Answer questions we haven\'t thought to ask yet' },
      ],
      weights: { 'Reported In': 25, 'Verifies': 15, 'Relates To': 10, 'Design Control Phase': 5, 'Mitigates': 10, 'Blocks': 0, 'Assigned To': -5, 'Part Of': -10 },
    },
    {
      name: 'James Okonkwo', background: '12 years in medical device QMS. ISO 13485 Lead Auditor.',
      primary_motivation: 'Ensure every process is documented, every nonconformance is closed, and the design history file is audit-ready.',
      voice: 'Methodical, thorough, documentation-obsessive. Phrases things as audit findings.',
      temperature: 0.3,
      guardrails: [
        { mode: 'always', text: 'Flag any item that is missing required documentation or has incomplete records as a potential audit finding.' },
        { mode: 'always', text: 'Verify CAPA status for all critical and major nonconformances before accepting closure.' },
        { mode: 'never', text: 'Never approve closing a nonconformance without a documented root cause and evidence of corrective action.' },
        { mode: 'never', text: 'Never accept "Use As Is" disposition for critical severity nonconformances.' },
      ],
      models: [
        { name: 'If it\'s not documented, it didn\'t happen', body: 'If it\'s not documented, it didn\'t happen' },
        { name: 'CAPAs close, root causes don\'t hide', body: 'CAPAs close — root causes don\'t hide' },
        { name: 'Design history is the product\'s autobiography', body: 'Design history is the product\'s autobiography' },
        { name: 'ISO 13485 is a philosophy', body: 'Of controlled chaos' },
        { name: 'Audit findings are gifts', body: 'They tell you where your system is weak' },
      ],
      weights: { 'Verifies': 30, 'Assigned To': 15, 'Blocks': 10, 'Reported In': 10, 'Design Control Phase': 10, 'Mitigates': 5, 'Part Of': 0, 'Relates To': -5 },
    },
    {
      name: 'Elena Vasquez', background: '9 years in medtech product management. Previously led consumer health products at Abbott.',
      primary_motivation: 'Ship a device that Type 2 patients actually want to wear — not just one that passes regulatory review.',
      voice: 'Strategic, user-centric, impatient with unnecessary complexity. Uses market language.',
      temperature: 0.7,
      guardrails: [
        { mode: 'always', text: 'Consider the end-user experience impact of every technical and regulatory decision.' },
        { mode: 'always', text: 'Highlight time-to-market implications when discussing scope changes or additional requirements.' },
        { mode: 'never', text: 'Never dismiss regulatory requirements as mere bureaucracy — frame them as competitive advantages.' },
        { mode: 'never', text: 'Never propose features that add patient burden without clear clinical benefit.' },
      ],
      models: [
        { name: 'Patients choose simplicity over precision', body: 'Every time' },
        { name: 'Time to market is a feature', body: 'Every month is a month patients don\'t have this' },
        { name: 'Every regulation we exceed is a competitive moat', body: 'Every regulation we exceed is a competitive moat' },
        { name: 'The best medical device', body: 'Is one patients forget they\'re wearing' },
        { name: 'Market access is the last mile', body: 'Clearance means nothing without reimbursement' },
      ],
      weights: { 'Design Control Phase': 20, 'Assigned To': 15, 'Blocks': 10, 'Relates To': 5, 'Mitigates': 5, 'Verifies': 0, 'Part Of': -5, 'Reported In': -5 },
    },
  ];

  for (const p of PERSONAS) {
    const personaId = did('persona', p.name);
    await q(`
      INSERT INTO personas (id, project_id, name, background, primary_motivation, voice_and_tone, guardrails, temperature)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, background = EXCLUDED.background,
        primary_motivation = EXCLUDED.primary_motivation, voice_and_tone = EXCLUDED.voice_and_tone,
        guardrails = EXCLUDED.guardrails, temperature = EXCLUDED.temperature
    `, [personaId, PROJECT_ID, p.name, p.background, p.primary_motivation, p.voice, JSON.stringify(p.guardrails), p.temperature]);

    // Mental models
    await q('DELETE FROM persona_mental_models WHERE persona_id = $1', [personaId]);
    for (let i = 0; i < p.models.length; i++) {
      await q(`INSERT INTO persona_mental_models (persona_id, name, body, sort_order) VALUES ($1, $2, $3, $4)`,
        [personaId, p.models[i].name, p.models[i].body, i]);
    }

    // Category weights
    for (const [ctName, weight] of Object.entries(p.weights)) {
      const ctId = connTypeIds[ctName];
      if (!ctId) continue;
      await q(`
        INSERT INTO persona_category_weights (persona_id, connection_type_id, weight)
        VALUES ($1, $2, $3)
        ON CONFLICT (persona_id, connection_type_id) DO UPDATE SET weight = EXCLUDED.weight
      `, [personaId, ctId, weight]);
    }
  }
  console.log(`  ✅ ${PERSONAS.length} personas with weights and mental models`);

  // Set project defaults (persona + start nord now exist)
  const priyaPersonaId = did('persona', 'Dr. Priya Sharma');
  const reqOneId = did('nord', 'Continuous glucose measurement for 14 days');
  await q(`UPDATE projects SET default_persona_id = $1, default_start_nord_id = $2 WHERE id = $3`,
    [priyaPersonaId, reqOneId, PROJECT_ID]);
  console.log('  ✅ Project defaults: persona=Dr. Priya Sharma, start=REQ-001');

  // ── 7. Goals + DAG ──
  const GOALS = [
    { name: 'Requirements Locked', description: 'All user needs, design inputs, and design outputs are documented with priority, verification method, and traceability status.', icon: 'ClipboardCheck', color: '#3B82F6', sort: 1, end_type: null },
    { name: 'Risk Analysis Complete', description: 'All identified hazards have severity, probability, mitigation strategy, and residual risk documented per ISO 14971.', icon: 'AlertTriangle', color: '#EF4444', sort: 2, end_type: null },
    { name: 'Verification Complete', description: 'All verification test cases have been executed with pass/fail results and actual results documented.', icon: 'FlaskConical', color: '#10B981', sort: 3, end_type: null },
    { name: 'Clinical Protocol Approved', description: 'All clinical study protocols have IRB approval and are actively enrolling.', icon: 'Stethoscope', color: '#0EA5E9', sort: 4, end_type: null },
    { name: '510(k) Ready', description: 'The 510(k) submission document has a predicate device identified and substantial equivalence argument drafted.', icon: 'FileCheck', color: '#DC2626', sort: 5, end_type: null },
    { name: 'FDA Submission', description: 'The 510(k) has been submitted to FDA with a tracking number and target date.', icon: 'Flag', color: '#F97316', sort: 6, end_type: 'reset' as const },
  ];

  const goalIds: Record<string, string> = {};
  for (const g of GOALS) {
    const id = did('goal', g.name);
    goalIds[g.name] = id;
    await q(`
      INSERT INTO goals (id, project_id, name, description, icon, accent_color, sort_order, end_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
        accent_color = EXCLUDED.accent_color, sort_order = EXCLUDED.sort_order, end_type = EXCLUDED.end_type
    `, [id, PROJECT_ID, g.name, g.description, g.icon, g.color, g.sort, g.end_type]);
  }

  // DAG edges
  const GOAL_EDGES = [
    { src: 'Requirements Locked', tgt: 'Verification Complete' },
    { src: 'Risk Analysis Complete', tgt: 'Verification Complete' },
    { src: 'Verification Complete', tgt: 'Clinical Protocol Approved' },
    { src: 'Verification Complete', tgt: '510(k) Ready' },
    { src: 'Clinical Protocol Approved', tgt: '510(k) Ready' },
    { src: '510(k) Ready', tgt: 'FDA Submission' },
  ];

  await q('DELETE FROM goal_edges WHERE project_id = $1', [PROJECT_ID]);
  for (const e of GOAL_EDGES) {
    await q(`
      INSERT INTO goal_edges (project_id, source_goal_id, target_goal_id) VALUES ($1, $2, $3)
      ON CONFLICT (source_goal_id, target_goal_id) DO NOTHING
    `, [PROJECT_ID, goalIds[e.src], goalIds[e.tgt]]);
  }

  // Goal variable bindings — bind goals to project-level variables
  // First, ensure project_variables exist (migration 029 auto-migrates source:'mcp' props,
  // but we need named entries for the bindings below)
  const GOAL_VARIABLES = [
    // Requirements Locked variables
    'priority', 'verification_method', 'trace_status',
    // Risk Analysis Complete variables
    'severity', 'probability', 'mitigation', 'residual_risk',
    // Verification Complete variables
    'pass_fail', 'actual_result',
    // Clinical Protocol Approved variables
    'irb_approval_date', 'status',
    // 510(k) Ready variables
    'predicate_device', 'substantial_equivalence',
    // FDA Submission variables
    'target_date',  // 'status' already listed above
  ];
  const uniqueVarNames = [...new Set(GOAL_VARIABLES)];
  for (const varName of uniqueVarNames) {
    await q(`
      INSERT INTO project_variables (project_id, name, type)
      VALUES ($1, $2, 'string')
      ON CONFLICT (project_id, name) DO NOTHING
    `, [PROJECT_ID, varName]);
  }

  // Look up variable IDs by name
  const varRows = await q<{ id: string; name: string }>(
    'SELECT id, name FROM project_variables WHERE project_id = $1',
    [PROJECT_ID]
  );
  const varIdByName: Record<string, string> = {};
  for (const v of varRows) varIdByName[v.name] = v.id;

  // Clean up old bindings
  await q(`DELETE FROM goal_variable_bindings WHERE goal_id IN (SELECT id FROM goals WHERE project_id = $1)`, [PROJECT_ID]);

  // Helper to bind a goal to a set of variables
  async function bindGoalVars(goalName: string, varNames: string[]) {
    for (const vn of varNames) {
      const vid = varIdByName[vn];
      if (!vid) { console.warn(`  ⚠️ Variable "${vn}" not found for goal "${goalName}"`); continue; }
      await q(`INSERT INTO goal_variable_bindings (goal_id, variable_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [goalIds[goalName], vid]);
    }
  }

  // Requirements Locked: priority, verification_method, trace_status
  await bindGoalVars('Requirements Locked', ['priority', 'verification_method', 'trace_status']);

  // Risk Analysis Complete: severity, probability, mitigation, residual_risk
  await bindGoalVars('Risk Analysis Complete', ['severity', 'probability', 'mitigation', 'residual_risk']);

  // Verification Complete: pass_fail, actual_result
  await bindGoalVars('Verification Complete', ['pass_fail', 'actual_result']);

  // Clinical Protocol Approved: irb_approval_date, status
  await bindGoalVars('Clinical Protocol Approved', ['irb_approval_date', 'status']);

  // 510(k) Ready: predicate_device, substantial_equivalence
  await bindGoalVars('510(k) Ready', ['predicate_device', 'substantial_equivalence']);

  // FDA Submission: status, target_date
  await bindGoalVars('FDA Submission', ['status', 'target_date']);

  console.log(`  ✅ ${GOALS.length} goals with DAG and property bindings`);

  // ── 8. Test Scenarios ──
  const SCENARIOS = [
    {
      name: 'Regulatory Gap Analysis',
      description: 'Cooperative auditor reviewing the 510(k) pathway. Tests graph traversal from requirements through verification to submission.',
      user_objective: 'Walk me through every requirement that lacks a verification test case. I need to identify gaps before the pre-submission meeting next week.',
      user_profile: 'cooperative',
      max_rounds: 15,
      persona_name: 'Dr. Priya Sharma',
    },
    {
      name: 'Risk Mitigation Deep Dive',
      description: 'Skeptical engineer challenging risk analysis completeness. Tests property collection and goal progress tracking.',
      user_objective: 'I want to drill into RISK-003 and RISK-005 — the mitigation strategies seem incomplete. Push me for specifics on residual risk scoring.',
      user_profile: 'reluctant',
      max_rounds: 12,
      persona_name: 'Marcus Cole',
    },
    {
      name: 'Adversarial Compliance Check',
      description: 'Adversarial reviewer stress-testing the system. Tries to skip required fields, gives vague answers, and challenges the AI.',
      user_objective: 'I am going to give incomplete answers and push back on every question. The AI should not let me skip required fields or accept "I don\'t know" without follow-up.',
      user_profile: 'adversarial',
      max_rounds: 20,
      persona_name: 'James Okonkwo',
    },
  ];

  await q('DELETE FROM test_scenarios WHERE project_id = $1', [PROJECT_ID]);
  for (const s of SCENARIOS) {
    const personaId = s.persona_name ? did('persona', s.persona_name) : null;
    await q(`
      INSERT INTO test_scenarios (project_id, name, description, user_objective, user_profile, max_rounds, persona_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [PROJECT_ID, s.name, s.description, s.user_objective, s.user_profile, s.max_rounds, personaId]);
  }
  console.log(`  ✅ ${SCENARIOS.length} test scenarios`);

  // ── Done ──
  console.log(`\n✅ Meridian Medical seeded successfully!`);
  console.log(`   Project ID: ${PROJECT_ID}`);
  console.log(`\n   To record: DEMO_PROJECT_ID=${PROJECT_ID} npx playwright test --config=playwright-demo.config.ts\n`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
