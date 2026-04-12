# [EPIC] 3: App Shell, Header & Navigation

**Objective:** Build the persistent application chrome: Viewport Header, Global Dock with 3-mode switching, routing, project switching, and responsive mobile layout.
**Invariant:** 95% of screen space aimed at the spatial canvas. Dock tools change based on active lens.
**Tech:** React, Vanilla CSS, React Router
**Mock Ref:** `client-alt/src/components/Layout/ViewportHeader.tsx`, `GlobalDock.tsx`, `ProjectDashboard/`, `ThemeSwitcher/`

---

## [FEATURE] 3.1: Viewport Header

### [STORY] 3.1.1: Header — Left Zone (Project Switcher)
* **Target:** `src/components/Layout/ViewportHeader.tsx`, `ViewportHeader.css`
* **Directive:** Left region: Nords logo (small), folder icon, project name (editable inline), snapshot state badge, chevron dropdown. Clicking chevron opens project switcher dropdown listing all user projects + "New Project" + "Project Settings" links.
* **Ref:** `client-alt/Layout/ViewportHeader.tsx`, `04_ui.md` §1.1
* **AC:** Playwright: header renders with project name. Clicking chevron opens dropdown with project list.

### [STORY] 3.1.2: Header — Center Zone (Brand Logo)
* **Target:** `ViewportHeader.tsx`
* **Directive:** Centered Nords logo using `NordsLogo` component from `client-alt`. Must not shift when left/right zones change width — use CSS grid with `1fr auto 1fr`.
* **Ref:** `client-alt/NordsLogo.tsx` (1548 bytes)
* **AC:** Logo is pixel-centered regardless of project name length. Responsive: hidden below 768px.

### [STORY] 3.1.3: Header — Right Zone (User Controls)
* **Target:** `ViewportHeader.tsx`
* **Directive:** Right region: notification bell (with unread count badge), activity pulse dot, teammate avatar stack (max 3 + "+N"), theme toggle (sun/moon), settings gear icon, user avatar + chevron dropdown (Profile, Preferences, Logout).
* **Ref:** `04_ui.md` §1.1
* **AC:** Clicking user avatar opens dropdown. "Logout" calls `signOut()` and redirects to `/login`. Theme toggle switches `data-theme` attribute on `<html>`.

### [STORY] 3.1.4: Header — Mobile Responsive (≤768px)
* **Target:** `ViewportHeader.css`
* **Directive:** Collapse to: project name (truncated) + hamburger menu. Hamburger opens slide-out drawer with all header controls stacked vertically.
* **Ref:** `04_ui.md` §1.1 mobile spec
* **AC:** At 375px viewport width, only project name and hamburger visible. Menu opens on tap.

---

## [FEATURE] 3.2: Global Dock

### [STORY] 3.2.1: Dock — Shell & Lens Toggle
* **Target:** `src/components/Layout/GlobalDock.tsx`, `GlobalDock.css`
* **Directive:** Floating pill-shaped dock centered at bottom. Contains 3-way segmented control: Canvas / Link / Matrix. Active lens has filled background. Separator divider after lens toggle. Dock has glassmorphism backdrop blur.
* **Ref:** `client-alt/Layout/GlobalDock.tsx`, `GlobalDock.css`, `04_ui.md` §1.1
* **AC:** Clicking each lens segment updates active state. `data-active-lens` attribute reflects current mode.

### [STORY] 3.2.2: Dock — Canvas Mode Tools
* **Target:** `GlobalDock.tsx`
* **Directive:** When Canvas lens active, show: Display ▾ (visibility toggles flyout), Comments (federated panel trigger), Snapshot (capture button), Add ▾ (creation grid flyout with "Manage Types" button). Each is an icon button with tooltip.
* **Ref:** `04_ui.md` §1.1 (Canvas lens tools)
* **AC:** Switching to Canvas lens renders exactly 4 tool buttons after separator. Clicking "Add" opens creation flyout.

### [STORY] 3.2.3: Dock — Link Mode Tools
* **Target:** `GlobalDock.tsx`
* **Directive:** When Link lens active, show: Relationship ▾ (active connection type selector with color swatch), Context toggle (show/hide unconnected nords), Connect (crosshair mode toggle), Comments, Snapshot.
* **Ref:** `04_ui.md` §1.1 (Link lens tools)
* **AC:** Switching to Link lens swaps tool buttons. Relationship dropdown lists all connection types with accent colors.

### [STORY] 3.2.4: Dock — Matrix Mode Tools
* **Target:** `GlobalDock.tsx`
* **Directive:** When Matrix lens active, show: Columns ▾ (connection type for X-axis), Rows (optional connection type for Y-axis), Comments, Snapshot, Add ▾.
* **Ref:** `04_ui.md` §1.1 (Matrix lens tools), `05_spatial.md` §5
* **AC:** Columns dropdown lists connection types. Selecting one updates X-axis. Rows is optional (can be "None").

### [STORY] 3.2.5: Dock — Mobile Responsive (≤768px)
* **Target:** `GlobalDock.css`
* **Directive:** Two-tier horizontal bar. Top tier: full-width segmented control (Canvas/Link/Matrix). Bottom tier: evenly spaced icon-only tool buttons. No labels, no separators. `padding-bottom: env(safe-area-inset-bottom)` for iOS notch.
* **Ref:** `04_ui.md` §1.1 mobile spec
* **AC:** At 375px width, dock renders as 2 rows. Safe area inset prevents overlap with iOS home bar.

---

## [FEATURE] 3.3: Project Dashboard & Navigation

### [STORY] 3.3.1: Project Dashboard Screen
* **Target:** `src/components/ProjectDashboard/ProjectDashboard.tsx`, `.css`
* **Directive:** Grid of project cards. Each shows: project icon, name, member count, last modified date, thumbnail preview. "New Project" card with plus icon. Click navigates to `/project/:id`.
* **Ref:** `client-alt/ProjectDashboard/ProjectDashboard.tsx` (5858 bytes)
* **AC:** Dashboard loads with list of user's projects from API. "New Project" opens creation wizard. Navigation works via React Router.

### [STORY] 3.3.2: Empty State (No Projects)
* **Target:** `src/components/EmptyState/EmptyState.tsx`, `.css`
* **Directive:** First-time user sees: welcome message, illustration, "Create Your First Project" CTA button. Port styling from `client-alt/EmptyState/`.
* **Ref:** `client-alt/EmptyState/EmptyState.tsx` (2524 bytes)
* **AC:** When user has 0 projects, empty state renders instead of dashboard grid.

### [STORY] 3.3.3: Theme Switcher (Dark/Light Mode)
* **Target:** `src/components/ThemeSwitcher/ThemeSwitcher.tsx`
* **Directive:** Toggle button (sun/moon icons). Sets `data-theme` on `<html>`. Persists preference to `localStorage`. Respects `prefers-color-scheme` on first visit.
* **Ref:** `client-alt/ThemeSwitcher/`
* **AC:** Clicking toggle switches theme. Refresh preserves choice. New user gets system preference.

### [STORY] 3.3.4: Zoom Controls Widget
* **Target:** `src/components/Canvas/ZoomControls.tsx`, `.css`
* **Directive:** Fixed bottom-right corner. Contains: zoom-in (+), zoom-out (-), current % label (click to reset to 100%), fit-to-view button. Steps in 10% increments. Range: 25%–200%.
* **Ref:** `04_ui.md` §1.10
* **AC:** Clicking + increases zoom by 10%. Clicking percentage resets to 100%. Fit-to-view frames all visible nords.
