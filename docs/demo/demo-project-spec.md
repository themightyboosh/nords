# Demo Project Specification — Meridian Medical: Pulse Sense CGM

> **Company:** Meridian Medical (40-person medical device startup)
>
> **Product:** Pulse Sense — a next-generation continuous glucose monitor (CGM) for Type 2 diabetes patients who've never used a CGM before
>
> **Regulatory Target:** FDA 510(k) clearance
>
> **Project Mode:** Guided

---

## Project Settings

| Field | Value |
|-------|-------|
| `name` | Pulse Sense CGM — Design Control |
| `description` | Design control and regulatory pathway management for the Pulse Sense continuous glucose monitor. Covers requirements traceability, risk management (ISO 14971), verification & validation, clinical protocol management, and FDA 510(k) submission. |
| `purpose` | Track the complete design control lifecycle of a Class II medical device from user needs through FDA 510(k) clearance. Manage risks, test protocols, regulatory submissions, and cross-functional team assignments. |
| `project_mode` | `guided` |
| `mcp_enabled` | `true` |
| `mcp_capture_data` | `true` |
| `mcp_mutable` | `true` |
| `goals_enabled` | `true` |

---

## Nord Types (10)

### 1. Requirement

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `req_id` | text | ✅ | ✅ |
| `title` | text | ✅ | ✅ |
| `description` | textarea | ✅ | ✅ |
| `category` | select: `User Need`, `Design Input`, `Design Output` | ✅ | ✅ |
| `priority` | select: `Must Have`, `Should Have`, `Could Have` | ✅ | ✅ |
| `verification_method` | select: `Test`, `Inspection`, `Analysis`, `Demonstration` | ✅ | ✅ |
| `trace_status` | select: `Untraced`, `Partially Traced`, `Traced` | ✅ | ✅ |

**Icon:** ClipboardCheck · **Color:** `#3B82F6` (blue)

### 2. Subsystem

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `title` | text | ✅ | ✅ |
| `description` | textarea | ✅ | ✅ |
| `technology_stack` | text | ❌ | ✅ |
| `supplier` | text | ❌ | ✅ |
| `risk_class` | select: `Class I`, `Class II`, `Class III` | ✅ | ✅ |
| `interface_spec` | textarea | ❌ | ✅ |

**Icon:** Cpu · **Color:** `#8B5CF6` (purple)

### 3. Risk

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `hazard_id` | text | ✅ | ✅ |
| `hazard` | text | ✅ | ✅ |
| `harm` | textarea | ✅ | ✅ |
| `severity` | number (1–5) | ✅ | ✅ |
| `probability` | number (1–5) | ✅ | ✅ |
| `risk_score` | number | ❌ | ✅ |
| `mitigation` | textarea | ✅ | ✅ |
| `residual_risk` | number | ✅ | ✅ |
| `iso_14971_ref` | text | ❌ | ✅ |

**Icon:** AlertTriangle · **Color:** `#EF4444` (red)

### 4. Test Case

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `test_id` | text | ✅ | ✅ |
| `title` | text | ✅ | ✅ |
| `protocol` | textarea | ✅ | ✅ |
| `expected_result` | textarea | ✅ | ✅ |
| `actual_result` | textarea | ✅ | ✅ |
| `pass_fail` | select: `Pass`, `Fail`, `Conditional`, `Not Run` | ✅ | ✅ |
| `test_date` | date | ❌ | ✅ |
| `tester` | text | ❌ | ✅ |

**Icon:** FlaskConical · **Color:** `#10B981` (green)

### 5. Bug / Nonconformance

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `nc_id` | text | ✅ | ✅ |
| `title` | text | ✅ | ✅ |
| `description` | textarea | ✅ | ✅ |
| `severity` | select: `Critical`, `Major`, `Minor` | ✅ | ✅ |
| `root_cause` | textarea | ✅ | ✅ |
| `capa_required` | boolean | ✅ | ✅ |
| `disposition` | select: `Use As Is`, `Rework`, `Scrap`, `Return to Supplier` | ✅ | ✅ |
| `closed_date` | date | ❌ | ✅ |

**Icon:** Bug · **Color:** `#F59E0B` (amber)

### 6. Team Member

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `name` | text | ✅ | ✅ |
| `role` | text | ✅ | ✅ |
| `department` | select: `Engineering`, `Regulatory`, `Clinical`, `Quality`, `Product`, `Operations` | ✅ | ✅ |
| `credentials` | text | ❌ | ✅ |
| `signing_authority` | boolean | ❌ | ✅ |

**Icon:** User · **Color:** `#6366F1` (indigo)

### 7. Regulatory Submission

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `submission_type` | select: `510(k)`, `PMA`, `De Novo`, `CE Mark` | ✅ | ✅ |
| `target_date` | date | ✅ | ✅ |
| `predicate_device` | text | ✅ | ✅ |
| `substantial_equivalence` | textarea | ✅ | ✅ |
| `status` | select: `Drafting`, `Internal Review`, `Submitted`, `FDA Review`, `Cleared`, `Rejected` | ✅ | ✅ |
| `fda_tracking_number` | text | ❌ | ✅ |

**Icon:** FileCheck · **Color:** `#DC2626` (red-700)

### 8. Clinical Protocol

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `protocol_id` | text | ✅ | ✅ |
| `title` | text | ✅ | ✅ |
| `study_type` | select: `Feasibility`, `Pivotal`, `Post-Market` | ✅ | ✅ |
| `sample_size` | number | ✅ | ✅ |
| `irb_approval_date` | date | ✅ | ✅ |
| `primary_endpoint` | textarea | ✅ | ✅ |
| `status` | select: `Draft`, `IRB Review`, `Active`, `Enrollment Complete`, `Closed` | ✅ | ✅ |
| `site_count` | number | ❌ | ✅ |

**Icon:** Stethoscope · **Color:** `#0EA5E9` (sky)

### 9. Architecture Decision Record (ADR)

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `adr_id` | text | ✅ | ✅ |
| `title` | text | ✅ | ✅ |
| `context` | textarea | ✅ | ✅ |
| `decision` | textarea | ✅ | ✅ |
| `alternatives` | textarea | ❌ | ✅ |
| `status` | select: `Proposed`, `Accepted`, `Superseded`, `Deprecated` | ✅ | ✅ |
| `decided_by` | text | ❌ | ✅ |
| `date` | date | ❌ | ✅ |

**Icon:** GitBranch · **Color:** `#14B8A6` (teal)

### 10. Milestone

| Field | Type | Required | MCP Visible |
|-------|------|----------|-------------|
| `name` | text | ✅ | ✅ |
| `target_date` | date | ✅ | ✅ |
| `gate_type` | select: `Design Review`, `Phase Gate`, `Submission`, `Regulatory Decision` | ✅ | ✅ |
| `exit_criteria` | textarea | ✅ | ✅ |
| `approved_by` | text | ❌ | ✅ |

**Icon:** Flag · **Color:** `#F97316` (orange)

---

## Connection Types (8)

### 1. Design Control Phase

| Property | Value |
|----------|-------|
| Direction | → (end) |
| X Stages | `User Need` (0.0–0.16) → `Design Input` (0.17–0.33) → `Design Output` (0.34–0.50) → `Verification` (0.51–0.67) → `Validation` (0.68–0.84) → `Transfer to Production` (0.85–1.0) |
| Y Stages | — |
| Color | `#3B82F6` (blue) |
| Style | Solid |

### 2. Blocks

| Property | Value |
|----------|-------|
| Direction | → (end) |
| X Stages | `Soft Dependency` (0.0–0.33) → `Hard Dependency` (0.34–0.67) → `Critical Blocker` (0.68–1.0) |
| Y Stages | — |
| Color | `#EF4444` (red) |
| Style | Dashed |

### 3. Mitigates

| Property | Value |
|----------|-------|
| Direction | → (end) |
| X Stages | `Monitoring` (0.0–0.33) → `Controls` (0.34–0.67) → `Eliminates` (0.68–1.0) |
| Y Stages | — |
| Color | `#10B981` (green) |
| Style | Solid |

### 4. Assigned To

| Property | Value |
|----------|-------|
| Direction | → (end) |
| X Stages | `Available` (0.0–0.33) → `Allocated` (0.34–0.67) → `Overloaded` (0.68–1.0) |
| Y Stages | — |
| Color | `#6366F1` (indigo) |
| Style | Dotted |

### 5. Verifies

| Property | Value |
|----------|-------|
| Direction | → (end) |
| X Stages | `Specified` (0.0–0.25) → `Protocol Ready` (0.26–0.50) → `Tested` (0.51–0.75) → `Accepted` (0.76–1.0) |
| Y Stages | — |
| Color | `#14B8A6` (teal) |
| Style | Solid |

### 6. Part Of

| Property | Value |
|----------|-------|
| Direction | → (end) |
| X Stages | `Planned` (0.0–0.33) → `Integrated` (0.34–0.67) → `Validated` (0.68–1.0) |
| Y Stages | — |
| Color | `#8B5CF6` (purple) |
| Style | Solid |

### 7. Reported In

| Property | Value |
|----------|-------|
| Direction | → (end) |
| X Stages | `New` (0.0–0.25) → `Triaged` (0.26–0.50) → `Investigating` (0.51–0.75) → `Resolved` (0.76–1.0) |
| Y Stages | — |
| Color | `#F59E0B` (amber) |
| Style | Dashed |

### 8. Relates To

| Property | Value |
|----------|-------|
| Direction | ↔ (both) |
| X Stages | — |
| Y Stages | — |
| Color | `#9CA3AF` (gray) |
| Style | Dotted |

---

## Personas (5)

### 1. Dr. Priya Sharma — VP Regulatory Affairs

| Field | Value |
|-------|-------|
| **Role** | VP Regulatory Affairs |
| **Background** | 15 years in regulatory strategy. Former FDA reviewer. Led 12 successful 510(k) submissions across Class II diagnostics. |
| **Motivation** | Ensure every design decision has a clear regulatory rationale and traceability chain. |
| **Voice** | Precise, citation-heavy, risk-averse. References specific FDA guidance documents and ISO standards. |
| **Temperature** | 0.3 |

**Mental Models (5):**
1. "FDA speaks in predicates — every claim needs a comparator"
2. "Risk is the universal language between engineering and regulation"
3. "Traceability is not optional — it IS the product documentation"
4. "Design controls aren't bureaucracy — they're the engineering method with receipts"
5. "Substantial equivalence is a legal argument, not a technical one"

**Category Weights:**

| Connection Type | Weight |
|----------------|--------|
| Design Control Phase | +25 |
| Blocks | +30 |
| Mitigates | +20 |
| Verifies | +15 |
| Assigned To | -10 |
| Part Of | 0 |
| Reported In | +5 |
| Relates To | -5 |

**Goal Weights:**

| Goal | Weight |
|------|--------|
| Requirements Locked | +15 |
| Risk Analysis Complete | +25 |
| Verification Complete | +20 |
| Clinical Protocol Approved | +10 |
| 510(k) Ready | +30 |
| FDA Submission | +25 |

---

### 2. Marcus Cole — Lead Systems Engineer

| Field | Value |
|-------|-------|
| **Role** | Lead Systems Engineer |
| **Background** | 10 years in embedded medical devices. Previously at Medtronic on insulin pump firmware. Expert in IEC 62304 software lifecycle. |
| **Motivation** | Ship a reliable, maintainable system architecture that passes verification on the first attempt. |
| **Voice** | Direct, technical, skeptical of shortcuts. Uses engineering precision. |
| **Temperature** | 0.4 |

**Mental Models (5):**
1. "Architecture absorbs requirements or requirements absorb architecture"
2. "Every interface is a failure surface"
3. "Test what kills, then test what annoys"
4. "Technical debt in a medical device ships with the patient"
5. "IEC 62304 Class C means every line of code is a liability"

**Category Weights:**

| Connection Type | Weight |
|----------------|--------|
| Part Of | +25 |
| Verifies | +20 |
| Blocks | +15 |
| Mitigates | +10 |
| Design Control Phase | +5 |
| Assigned To | +10 |
| Reported In | +5 |
| Relates To | 0 |

**Goal Weights:**

| Goal | Weight |
|------|--------|
| Requirements Locked | +20 |
| Risk Analysis Complete | +15 |
| Verification Complete | +30 |
| Clinical Protocol Approved | 0 |
| 510(k) Ready | +5 |
| FDA Submission | +5 |

---

### 3. Sarah Kim — Clinical Affairs Director

| Field | Value |
|-------|-------|
| **Role** | Clinical Affairs Director |
| **Background** | PhD in Biomedical Engineering. 8 years in clinical trials for continuous monitoring devices. Managed 5 pivotal studies. |
| **Motivation** | Design clinically meaningful studies that generate the evidence FDA needs while protecting patient safety. |
| **Voice** | Empathetic, evidence-focused, methodical. Balances scientific rigor with patient advocacy. |
| **Temperature** | 0.6 |

**Mental Models (5):**
1. "The patient is the stakeholder we never meet"
2. "Endpoints must be clinically meaningful, not just statistically significant"
3. "IRBs protect patients from us — not from the device"
4. "Post-market surveillance is where the real data lives"
5. "A well-designed study answers questions we haven't thought to ask yet"

**Category Weights:**

| Connection Type | Weight |
|----------------|--------|
| Reported In | +25 |
| Verifies | +15 |
| Relates To | +10 |
| Design Control Phase | +5 |
| Mitigates | +10 |
| Blocks | 0 |
| Assigned To | -5 |
| Part Of | -10 |

**Goal Weights:**

| Goal | Weight |
|------|--------|
| Requirements Locked | +5 |
| Risk Analysis Complete | +10 |
| Verification Complete | +10 |
| Clinical Protocol Approved | +30 |
| 510(k) Ready | +15 |
| FDA Submission | +10 |

---

### 4. James Okonkwo — Quality Assurance Manager

| Field | Value |
|-------|-------|
| **Role** | Quality Assurance Manager |
| **Background** | 12 years in medical device QMS. ISO 13485 Lead Auditor. Built the quality system at two startups from scratch. |
| **Motivation** | Ensure every process is documented, every nonconformance is closed, and the design history file is audit-ready. |
| **Voice** | Methodical, thorough, documentation-obsessive. Phrases things as audit findings. |
| **Temperature** | 0.3 |

**Mental Models (5):**
1. "If it's not documented, it didn't happen"
2. "CAPAs close — root causes don't hide"
3. "Design history is the product's autobiography"
4. "ISO 13485 is not a checklist — it's a philosophy of controlled chaos"
5. "An audit finding is a gift — it tells you where your system is weak"

**Category Weights:**

| Connection Type | Weight |
|----------------|--------|
| Verifies | +30 |
| Assigned To | +15 |
| Blocks | +10 |
| Reported In | +10 |
| Design Control Phase | +10 |
| Mitigates | +5 |
| Part Of | 0 |
| Relates To | -5 |

**Goal Weights:**

| Goal | Weight |
|------|--------|
| Requirements Locked | +20 |
| Risk Analysis Complete | +20 |
| Verification Complete | +30 |
| Clinical Protocol Approved | +5 |
| 510(k) Ready | +15 |
| FDA Submission | +10 |

---

### 5. Elena Vasquez — Product Director

| Field | Value |
|-------|-------|
| **Role** | Product Director |
| **Background** | 9 years in medtech product management. Previously led consumer health products at Abbott. Expert in translating clinical requirements into user experiences. |
| **Motivation** | Ship a device that Type 2 patients actually want to wear — not just one that passes regulatory review. |
| **Voice** | Strategic, user-centric, impatient with unnecessary complexity. Uses market language. |
| **Temperature** | 0.7 |

**Mental Models (5):**
1. "Patients choose simplicity over precision every time"
2. "Time to market is a feature — every month is a month patients don't have this"
3. "Every regulation we exceed is a competitive moat"
4. "The best medical device is one patients forget they're wearing"
5. "Market access is the last mile — clearance means nothing without reimbursement"

**Category Weights:**

| Connection Type | Weight |
|----------------|--------|
| Design Control Phase | +20 |
| Assigned To | +15 |
| Blocks | +10 |
| Relates To | +5 |
| Mitigates | +5 |
| Verifies | 0 |
| Part Of | -5 |
| Reported In | -5 |

**Goal Weights:**

| Goal | Weight |
|------|--------|
| Requirements Locked | +10 |
| Risk Analysis Complete | +5 |
| Verification Complete | +10 |
| Clinical Protocol Approved | +10 |
| 510(k) Ready | +20 |
| FDA Submission | +30 |

---

## Goals (6)

### Prerequisite DAG

```
[1] Requirements Locked ─────┐
                              ├──▶ [3] Verification Complete ──┬──▶ [5] 510(k) Ready ──▶ [6] FDA Submission
[2] Risk Analysis Complete ──┘                                  │
                                                                ▼
                                                   [4] Clinical Protocol Approved
```

### 1. Requirements Locked

| Field | Value |
|-------|-------|
| **Description** | All user needs, design inputs, and design outputs are documented with priority, verification method, and traceability status. |
| **Prerequisites** | None (root goal) |
| **Ends Session** | No |
| **Exclusion Group** | — |

**Bound Properties:**

| Nord Type | Property | Condition |
|-----------|----------|-----------|
| Requirement (all 8) | `priority` | ≠ empty |
| Requirement (all 8) | `verification_method` | ≠ empty |
| Requirement (all 8) | `trace_status` | = `Traced` |

---

### 2. Risk Analysis Complete

| Field | Value |
|-------|-------|
| **Description** | All identified hazards have severity, probability, mitigation strategy, and residual risk documented per ISO 14971. |
| **Prerequisites** | None (root goal) |
| **Ends Session** | No |
| **Exclusion Group** | — |

**Bound Properties:**

| Nord Type | Property | Condition |
|-----------|----------|-----------|
| Risk (all 8) | `severity` | ≠ empty |
| Risk (all 8) | `probability` | ≠ empty |
| Risk (all 8) | `mitigation` | ≠ empty |
| Risk (all 8) | `residual_risk` | ≠ empty |

---

### 3. Verification Complete

| Field | Value |
|-------|-------|
| **Description** | All verification test cases have been executed with pass/fail results and actual results documented. |
| **Prerequisites** | Requirements Locked, Risk Analysis Complete |
| **Ends Session** | No |
| **Exclusion Group** | — |

**Bound Properties:**

| Nord Type | Property | Condition |
|-----------|----------|-----------|
| Test Case (all 10) | `pass_fail` | ≠ empty |
| Test Case (all 10) | `actual_result` | ≠ empty |

---

### 4. Clinical Protocol Approved

| Field | Value |
|-------|-------|
| **Description** | All clinical study protocols have IRB approval and are actively enrolling. |
| **Prerequisites** | Verification Complete |
| **Ends Session** | No |
| **Exclusion Group** | — |

**Bound Properties:**

| Nord Type | Property | Condition |
|-----------|----------|-----------|
| Clinical Protocol (all 3) | `irb_approval_date` | ≠ empty |
| Clinical Protocol (all 3) | `status` | = `Active` |

---

### 5. 510(k) Ready

| Field | Value |
|-------|-------|
| **Description** | The 510(k) submission document has a predicate device identified and substantial equivalence argument drafted. |
| **Prerequisites** | Verification Complete, Clinical Protocol Approved |
| **Ends Session** | No |
| **Exclusion Group** | — |

**Bound Properties:**

| Nord Type | Property | Condition |
|-----------|----------|-----------|
| Regulatory Submission "510(k)" | `predicate_device` | ≠ empty |
| Regulatory Submission "510(k)" | `substantial_equivalence` | ≠ empty |

---

### 6. FDA Submission

| Field | Value |
|-------|-------|
| **Description** | The 510(k) has been submitted to FDA with a tracking number and target date. |
| **Prerequisites** | 510(k) Ready |
| **Ends Session** | **Yes** |
| **Exclusion Group** | — |

**Bound Properties:**

| Nord Type | Property | Condition |
|-----------|----------|-----------|
| Regulatory Submission "510(k)" | `status` | = `Submitted` |
| Regulatory Submission "510(k)" | `target_date` | ≠ empty |

---

## Sample Nords (64 total)

### Requirements (8)

| # | req_id | title | category | priority | verification_method | trace_status |
|---|--------|-------|----------|----------|--------------------:|--------------|
| 1 | REQ-001 | Continuous glucose measurement for 14 days | User Need | Must Have | Test | Traced |
| 2 | REQ-002 | MARD ≤ 10% vs. laboratory reference | Design Input | Must Have | Test | Traced |
| 3 | REQ-003 | Wireless data transmission to mobile app | Design Input | Must Have | Demonstration | *empty* |
| 4 | REQ-004 | Waterproof to IP67 rating | Design Output | Must Have | Test | Traced |
| 5 | REQ-005 | Painless sensor insertion by patient | User Need | Must Have | *empty* | *empty* |
| 6 | REQ-006 | Alert on hypoglycemia (< 70 mg/dL) | Design Input | Must Have | Test | Traced |
| 7 | REQ-007 | Battery life ≥ 14 days continuous operation | Design Output | Should Have | Test | Traced |
| 8 | REQ-008 | Single-use applicator for sterile deployment | Design Output | Must Have | Inspection | Traced |

### Subsystems (5)

| # | title | technology_stack | risk_class |
|---|-------|-----------------|------------|
| 1 | Sensor Module | Electrochemical enzyme electrode, Pt/AgCl reference | Class II |
| 2 | Wireless Transmitter | BLE 5.3 SoC (Nordic nRF5340) | Class II |
| 3 | Mobile Application | React Native, HealthKit/Health Connect integration | Class II |
| 4 | Cloud Analytics Platform | GCP, HIPAA-compliant data pipeline | Class I |
| 5 | Applicator Assembly | Spring-loaded insertion mechanism, EO sterilization | Class II |

### Risks (8)

| # | hazard_id | hazard | harm | severity | probability | mitigation | residual_risk |
|---|-----------|--------|------|----------|-------------|------------|---------------|
| 1 | HAZ-001 | Inaccurate glucose reading | Incorrect insulin dosing → hypoglycemia | 5 | 2 | Factory calibration with lot-specific calibration codes | 2 |
| 2 | HAZ-002 | Battery thermal runaway | Skin burn at application site | 4 | 1 | Thermal cutoff circuit, biocompatible encapsulation | 1 |
| 3 | HAZ-003 | BLE signal interference | Delayed glucose alert | 3 | 3 | Redundant local alarm on transmitter, store-and-forward | 2 |
| 4 | HAZ-004 | Sensor wire fracture during removal | Retained foreign body | 4 | 2 | Reinforced sensor wire (316L stainless), pull-force testing | 1 |
| 5 | HAZ-005 | Adhesive contact dermatitis | Skin irritation / allergic reaction | 3 | 4 | *empty* | *empty* |
| 6 | HAZ-006 | Data breach of glucose data | Patient privacy violation | 4 | 2 | AES-256 encryption, HIPAA-compliant cloud | 1 |
| 7 | HAZ-007 | App crash during hypoglycemia alert | Missed critical alert | 5 | 2 | Independent hardware alarm on transmitter | 1 |
| 8 | HAZ-008 | Applicator misfire — incomplete insertion | Inaccurate readings, patient frustration | 3 | 3 | *empty* | *empty* |

### Test Cases (10)

| # | test_id | title | pass_fail | actual_result |
|---|---------|-------|-----------|---------------|
| 1 | TC-001 | Sensor accuracy (MARD) vs YSI reference | Pass | MARD 8.7% across 40 subjects |
| 2 | TC-002 | 14-day continuous wear duration | Pass | 98% sensor survival at day 14 |
| 3 | TC-003 | IP67 waterproof immersion test | Pass | No moisture ingress after 30 min at 1m |
| 4 | TC-004 | BLE range and reliability test | *empty* | *empty* |
| 5 | TC-005 | Hypoglycemia alert latency | Pass | Mean alert time 4.2 min from threshold |
| 6 | TC-006 | Battery life under continuous operation | *empty* | *empty* |
| 7 | TC-007 | Thermal safety — battery stress test | Pass | Max surface temp 38.2°C under load |
| 8 | TC-008 | Sensor wire pull-force test | Pass | Mean pull force 2.8N, min 2.1N |
| 9 | TC-009 | Applicator insertion force consistency | *empty* | *empty* |
| 10 | TC-010 | Data encryption end-to-end verification | Pass | AES-256-GCM verified, no plaintext in transit |

### Bugs / Nonconformances (6)

| # | nc_id | title | severity | root_cause | capa_required | disposition |
|---|-------|-------|----------|------------|---------------|-------------|
| 1 | NC-001 | Sensor drift >15% after day 10 | Critical | Enzyme degradation in high-humidity storage | true | Rework |
| 2 | NC-002 | BLE disconnection on iOS 17.4 | Major | Apple BLE stack regression | true | *empty* |
| 3 | NC-003 | Adhesive residue on removal | Minor | Excess adhesive application in production | false | Use As Is |
| 4 | NC-004 | App crash on Samsung Galaxy S24 | Major | Memory leak in React Native bridge | true | Rework |
| 5 | NC-005 | Applicator spring inconsistency — lot 2024-07 | Critical | Supplier heat treatment deviation | true | Scrap |
| 6 | NC-006 | Cloud dashboard latency >30s | Minor | *empty* | *empty* | *empty* |

### Team Members (7)

| # | name | role | department | credentials | signing_authority |
|---|------|------|------------|-------------|-------------------|
| 1 | Dr. Priya Sharma | VP Regulatory Affairs | Regulatory | RAC, former FDA reviewer | true |
| 2 | Marcus Cole | Lead Systems Engineer | Engineering | BSEE, 10yr embedded medical | true |
| 3 | Sarah Kim | Clinical Affairs Director | Clinical | PhD Biomedical Engineering | true |
| 4 | James Okonkwo | Quality Assurance Manager | Quality | ISO 13485 Lead Auditor | true |
| 5 | Elena Vasquez | Product Director | Product | MBA, 9yr medtech product | false |
| 6 | Dr. Aisha Patel | Sensor Design Engineer | Engineering | PhD Electrochemistry | false |
| 7 | Tom Nguyen | Software Engineer | Engineering | BSCS, IEC 62304 certified | false |

### Regulatory Submissions (2)

| # | submission_type | target_date | predicate_device | substantial_equivalence | status |
|---|----------------|-------------|------------------|------------------------|--------|
| 1 | 510(k) | *empty* | Dexcom G7 (K221803) | *empty* | Drafting |
| 2 | CE Mark | *empty* | *empty* | *empty* | Drafting |

### Clinical Protocols (3)

| # | protocol_id | title | study_type | sample_size | irb_approval_date | primary_endpoint | status |
|---|-------------|-------|------------|-------------|-------------------|------------------|--------|
| 1 | CP-001 | Sensor accuracy pivotal study | Pivotal | 350 | 2026-03-15 | MARD vs. YSI reference ≤ 10% | Active |
| 2 | CP-002 | 14-day wear feasibility study | Feasibility | 30 | *empty* | Sensor survival rate at day 14 | IRB Review |
| 3 | CP-003 | Real-world usability study | Post-Market | 100 | *empty* | System Usability Scale (SUS) ≥ 75 | Draft |

### Architecture Decision Records (5)

| # | adr_id | title | decision | status |
|---|--------|-------|----------|--------|
| 1 | ADR-001 | BLE vs. NFC for data transfer | BLE 5.3 — continuous streaming required for real-time alerts | Accepted |
| 2 | ADR-002 | React Native vs. native iOS/Android | React Native — faster iteration, acceptable performance for CGM use case | Accepted |
| 3 | ADR-003 | Factory calibration vs. finger-prick calibration | Factory calibration — critical for user experience, requires tighter manufacturing controls | Accepted |
| 4 | ADR-004 | Cloud platform: GCP vs. AWS for HIPAA workloads | GCP — team expertise, Assured Workloads for HIPAA, competitive pricing | Accepted |
| 5 | ADR-005 | Sensor wire material: Platinum vs. gold | *empty* | Proposed |

### Milestones (5)

| # | name | target_date | gate_type | exit_criteria |
|---|------|-------------|-----------|---------------|
| 1 | Design Input Review | 2026-02-01 | Design Review | All user needs documented, design inputs derived, traceability matrix complete |
| 2 | Risk Management Review | 2026-04-15 | Phase Gate | ISO 14971 risk analysis complete, all residual risks acceptable |
| 3 | Design Verification Complete | 2026-07-01 | Phase Gate | All test protocols executed, results documented, no open Critical NCs |
| 4 | Clinical Study Completion | 2026-11-01 | Phase Gate | Pivotal study enrollment complete, primary endpoint met |
| 5 | 510(k) Submission | *empty* | Submission | *empty* |

---

## Connection Map (~85 connections)

### Design Control Phase (12)
- REQ-001 through REQ-008: various stages from User Need to Verification
- TC-001 through TC-004: Verification stage

### Blocks (10)
- HAZ-001 → REQ-002 (Critical Blocker — accuracy risk blocks MARD requirement)
- HAZ-005 → REQ-005 (Hard Dependency — dermatitis risk blocks painless insertion)
- HAZ-008 → REQ-008 (Hard Dependency — applicator misfire blocks sterile deployment)
- NC-001 → TC-002 (Critical Blocker — sensor drift blocks wear duration test)
- NC-002 → TC-004 (Hard Dependency — BLE disconnect blocks BLE test)
- NC-005 → TC-009 (Critical Blocker — spring inconsistency blocks applicator test)
- MS-3 → MS-5 (Hard Dependency — verification must precede submission)
- CP-001 → MS-4 (Hard Dependency)
- REQ-003 → REQ-006 (Soft Dependency — wireless needed for alerts)
- ADR-005 → TC-001 (Soft Dependency — material decision affects accuracy)

### Mitigates (8)
- One connection per Risk → relevant Requirement or Subsystem

### Assigned To (12)
- Each Team Member → 1-3 items. Marcus has 7 (overloaded).

### Verifies (10)
- Each Test Case → the Requirement it verifies

### Part Of (7)
- Each Subsystem → related Requirements and ADRs

### Reported In (6)
- Each NC/Bug → the Test Case or Protocol it was found in

### Relates To (20)
- Cross-cutting semantic links (ADR↔Subsystem, Protocol↔Milestone, etc.)

---

## Pre-Fill Status

| Category | Total Slots | Filled | Empty | % |
|----------|------------|--------|-------|---|
| Requirements | 56 | 47 | 9 | 84% |
| Risks | 72 | 58 | 14 | 81% |
| Test Cases | 80 | 52 | 28 | 65% |
| Bugs/NCs | 48 | 36 | 12 | 75% |
| Clinical Protocols | 24 | 16 | 8 | 67% |
| Reg Submissions | 12 | 5 | 7 | 42% |
| ADRs | 40 | 33 | 7 | 83% |
| Milestones | 25 | 19 | 6 | 76% |
| **Total** | **~420** | **~280** | **~140** | **67%** |

**AI-discoverable gaps:** 140 empty property slots across the project for the AI to identify and fill during demo sessions.
