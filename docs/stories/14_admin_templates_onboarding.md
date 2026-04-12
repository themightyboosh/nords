# [EPIC] 13: Admin, Templates & Onboarding

**Objective:** Implement the Global Admin Console, project creation wizard with template library, template promotion (cherry-picking), and progressive onboarding flow.
**Invariant:** Admin role required for all admin operations. Template promotion strips operational data.
**Tech:** React, PostgreSQL, Firebase Admin SDK
**Ref:** `06_admin_and_templates.md`

---

## [FEATURE] 13.1: Project Creation Wizard

### [STORY] 13.1.1: Project Creation — Step 1: Naming & Meta
* **Target:** `src/components/ProjectWizard/Step1Name.tsx`
* **Directive:** Modal wizard. Step 1: project name (required), description (optional), select organization. Validation: name 3-50 chars, no special chars.
* **Ref:** `06_admin.md` §1
* **AC:** Entering valid name enables "Next" button. Empty name shows validation error.

### [STORY] 13.1.2: Project Creation — Step 2: Icon Selection
* **Target:** `src/components/ProjectWizard/Step2Icon.tsx`
* **Directive:** Browse Lucide icon library (same component as Project Settings Icon Library). Search/filter icons. Click to select. Preview shows icon in project card context.
* **Ref:** `06_admin.md` §1, `04_ui.md` §1.14
* **AC:** Scrollable icon grid. Search filters icons. Selected icon shown in preview card.

### [STORY] 13.1.3: Project Creation — Step 3: Template Selection
* **Target:** `src/components/ProjectWizard/Step3Template.tsx`
* **Directive:** Grid of template cards: 4 GTM templates (OKR, Storyboarding, PM, RAG) + "Blank Canvas". Each card shows: name, description, preview thumbnail, included types count. Toggle: "Load with Sample Data" (populates canvas with pre-built mock graph).
* **Ref:** `06_admin.md` §2, §5
* **AC:** Selecting "OKR" template pre-configures Objectives/Key Results/Initiatives types + Alignment/Contribution connections. "Blank Canvas" creates empty project.

### [STORY] 13.1.4: GTM Template Definitions (4 Templates)
* **Target:** `src/data/templates.ts`
* **Directive:** Define 4 template configurations as TypeScript objects: OKR (Objectives, KRs, Initiatives + Alignment/Contribution connections), Storyboarding (Characters, Props, Settings, Plot Points + Emotional Tension/Proximity), PM (Tasks, Bugs, Milestones, Members + Blockers/Assignments), RAG (Document Chunks, Queries, AI Agents + Semantic Similarity). Each includes type schemas with icons, colors, and stage labels.
* **Ref:** `06_admin.md` §5
* **AC:** Each template produces valid `nord_types` and `connection_types` rows when applied.

---

## [FEATURE] 13.2: Project Settings Screen

### [STORY] 13.2.1: Project Settings — Shell & Navigation
* **Target:** `src/components/ProjectSettings/ProjectSettings.tsx`, `.css`
* **Directive:** Full-screen modal with left sidebar navigation. 10 sections: General, Members, Permissions, Snapshots, Spectrum Config, Icon Library, API & Access, Full Export, Sharing, Danger Zone. Port structure from `client-alt/ProjectSettings/`.
* **Ref:** `client-alt/ProjectSettings/ProjectSettings.tsx` (19KB), `04_ui.md` §1.14
* **AC:** All 10 sidebar items render. Clicking navigates between sections. Settings persist on change.

### [STORY] 13.2.2: Project Settings — API & Access Section
* **Target:** `ProjectSettings.tsx`
* **Directive:** Shows: web access token (masked + copy button), MCP endpoint URL, token scope selector (Read-Only / Read-Write / Admin), "Regenerate Token" danger button with confirmation.
* **Ref:** `04_ui.md` §1.14
* **AC:** Copy button copies token to clipboard. Regenerate shows confirmation dialog. New token generated.

### [STORY] 13.2.3: Project Settings — Sharing & Public Links
* **Target:** `ProjectSettings.tsx`
* **Directive:** Create public view-only links. Toggle link active/inactive. Copy-to-clipboard. No account required for viewers. Shows link stats (views count).
* **Ref:** `04_ui.md` §2.3
* **AC:** Creating a public link generates a unique URL. Opening the URL in incognito shows read-only canvas.

---

## [FEATURE] 13.3: Global Admin Console

### [STORY] 13.3.1: Admin Console — User Management
* **Target:** `src/components/Admin/UserManagement.tsx`
* **Directive:** List all workspace users: name, email, role, status, last active. Actions: Invite by Email, Promote to Admin, Deactivate Account, Reassign Orphaned Data. Only visible to Admin role users.
* **Ref:** `06_admin.md` §4
* **AC:** Admin sees user list. Promoting a user changes their role. Deactivating hides them from active lists but preserves their data.

### [STORY] 13.3.2: Promote to Template (Cherry-Picking)
* **Target:** `src/components/Admin/PromoteTemplate.tsx`
* **Directive:** From any project's settings, Admin clicks "Save as System Template". System extracts: component type schemas (Nord Types + Connection Types), lens settings, spectrum configurations. Strips operational data (actual nords/connections) OR caches it as "Sample Data" if user checks the box. Published to Global Template Library.
* **Ref:** `06_admin.md` §3
* **AC:** Admin promotes a project → new template appears in project creation wizard. Template contains type schemas but no user data (unless sample data checked).

### [STORY] 13.3.3: Onboarding Flow (Progressive Complexity)
* **Target:** `src/components/Onboarding/OnboardingFlow.tsx`
* **Directive:** First-time user guidance: 1) Create first Nord, 2) Define first Connection Type, 3) Set what distance means ("Closer = more important"), 4) Drag Nord B toward A — watch distance value change. Tooltip-based progressive disclosure. Dismissable. Stored in user preferences.
* **Ref:** `06_admin.md` §5
* **AC:** New user in blank project sees step-by-step tooltips. Completing each step advances to next. Can be dismissed and never shown again.
