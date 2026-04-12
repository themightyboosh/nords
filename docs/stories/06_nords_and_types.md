# [EPIC] 5: Nord Cards & Type System

**Objective:** Implement the full Nord card anatomy (collapsed/expanded), type-driven rendering, property display, scale indicators, and the Manage Types admin screen.
**Invariant:** Properties defined at Type level only. Individual instances inherit, cannot add/remove properties.
**Tech:** React, Vanilla CSS (color-mix), Lucide icons
**Mock Ref:** `client-alt/ManageTypes/ManageTypes.tsx` (15KB), `Spectrum/Spectrum.tsx`

---

## [FEATURE] 5.1: Card Anatomy

### [STORY] 5.1.1: Collapsed Card — Title Bar & Type Badge
* **Target:** `src/components/Canvas/NordCard.tsx`, `NordCard.css`
* **Directive:** Top section shows type icon (colored, from Lucide) + type label (uppercase, small text) on left. Below: title (40 char soft limit, 2-line clamp CSS). Card background tinted 10% with type accent color via `color-mix(in srgb, var(--accent), transparent 90%)`. Border tinted 20%.
* **Ref:** `04_ui.md` §1.4
* **AC:** Task nords show task icon + "TASK" label + blue tint. Bug nords show bug icon + "BUG" label + red tint. Titles wrap at 2 lines with ellipsis.

### [STORY] 5.1.2: Collapsed Card — Property Rows (2 configurable)
* **Target:** `NordCard.tsx`
* **Directive:** Below title: 2 key:value property rows from the type's configured "card row" properties (defined in Manage Types). e.g., "Status: Done", "Assignee: Daniel". If more than 2 properties exist, show "+N more" indicator. Values are read-only on collapsed card.
* **Ref:** `04_ui.md` §1.4
* **AC:** Card shows exactly 2 property rows. If nord has 5 properties, shows "+3 more". Properties match type-level configuration order.

### [STORY] 5.1.3: Collapsed Card — Scale Indicator (Conditional)
* **Target:** `NordCard.tsx`
* **Directive:** Bottom-right corner: diagonal expand/contract arrow icon (`Maximize2`). **Only appears when the type has a scale property configured.** Dragging resizes card width from 25% to 200% of base width. Current scale shown in Detail Drawer. Card width = `BASE_WIDTH * scale`. If no scale property, handle is hidden, card renders at uniform width.
* **Ref:** `04_ui.md` §1.4, `02_data_model.md` §1.2
* **AC:** Task type with scale property: resize handle visible. Person type without scale: no resize handle. Dragging handle changes card width proportionally.

### [STORY] 5.1.4: Collapsed Card — Footer Spectrum
* **Target:** `NordCard.tsx`
* **Directive:** Bottom of card: thin Spectrum bar showing relative scale value. Color inherits type accent. Bar fill width = `scale * 100%`.
* **AC:** Scale 0.5 shows bar at 50% width. Scale 1.0 shows full bar.

---

## [FEATURE] 5.2: Spectrum Widget

### [STORY] 5.2.1: Spectrum 1D Component
* **Target:** `src/components/Spectrum/Spectrum1D.tsx`, `Spectrum.css`
* **Directive:** Horizontal bar with draggable thumb. Value range 0.0–1.0. Color from parent type accent. Optional stage labels overlay (quantized buckets). Thumb snaps to nearest bucket visually while maintaining continuous float precision underneath. Emits `onChange(value: number)`.
* **Ref:** `04_ui.md` §1.15, `client-alt/Spectrum/Spectrum.tsx`
* **AC:** Dragging thumb to 0.75 emits `onChange(0.75)`. With 3 stage labels, value 0.75 visually aligns with "Done" bucket but stores 0.75 precisely.

### [STORY] 5.2.2: Spectrum 2D Component
* **Target:** `src/components/Spectrum/Spectrum2D.tsx`
* **Directive:** X×Y coordinate pad with draggable dot. Each axis 0.0–1.0. Used for dual-axis mapping (e.g., Urgency × Impact). Emits `onChange({x: number, y: number})`.
* **Ref:** `04_ui.md` §1.15
* **AC:** Dragging dot to top-right emits `onChange({x: 1.0, y: 1.0})`. Visual dot position matches emitted values.

---

## [FEATURE] 5.3: Manage Types Screen

### [STORY] 5.3.1: Manage Types — Modal Shell & Tab Navigation
* **Target:** `src/components/ManageTypes/ManageTypes.tsx`, `ManageTypes.css`
* **Directive:** Full-screen modal. Two tabs: "Nord Types" / "Connection Types". Left sidebar shows type list (icon + name + accent color swatch). "+ New Type" button at bottom of sidebar. Clicking a type shows its property table on right.
* **Ref:** `04_ui.md` §1.13, `client-alt/ManageTypes/ManageTypes.tsx` (15KB)
* **AC:** Modal opens. Tab switching works. Type list renders. Selecting a type shows its properties.

### [STORY] 5.3.2: Manage Types — Nord Type Property Table
* **Target:** `ManageTypes.tsx`
* **Directive:** For selected nord type: reorderable table with columns: Name, Data Type (select/multi-select/number/date/boolean/url/file/user), Values/Config (type-specific), Card Row (checkbox — which 2 appear on collapsed card). "+ Add Property" button adds a new row. "Remove Property" button with confirmation dialog.
* **Ref:** `04_ui.md` §1.13, `08_property_types_reference.md`
* **AC:** Adding a property appends to table. Removing shows confirmation. Reordering updates sort_order. Card Row toggles limited to 2 max.

### [STORY] 5.3.3: Manage Types — Connection Type Stage Editor
* **Target:** `ManageTypes.tsx`
* **Directive:** For connection types: configure X Stage property (drives Matrix columns) and Y Stage property (drives Matrix rows). Each axis shows an inline spectrum bar with draggable label dividers. Labels are editable text. E.g., drag divider to set "To Do" = 0.0–0.4, "In Progress" = 0.4–0.7, "Done" = 0.7–1.0.
* **Ref:** `04_ui.md` §1.13, `08_property_types_reference.md` (dual-axis stages), `02_data_model.md` §1.4
* **AC:** Adding 3 labels to X Stage creates 3 equal-width buckets. Dragging dividers changes bucket widths. Labels saved to `x_stage_labels` and `y_stage_labels` JSONB.

### [STORY] 5.3.4: Manage Types — Type Visual Config (Icon, Color, Name)
* **Target:** `ManageTypes.tsx`
* **Directive:** Type header: editable name, icon picker (Lucide library browser — same as §1.14), accent color picker (HSL hue slider with lightness/saturation locked for accessibility). Preview card updates live.
* **Ref:** `04_ui.md` §1.7 (HSL constrained), §1.13
* **AC:** Changing icon updates all nords of that type on canvas. Color picker restricts to accessible HSL bands.

### [STORY] 5.3.5: Manage Types — Common Properties (Inherited)
* **Target:** `ManageTypes.tsx`
* **Directive:** All types inherit: Title (string), Scale (spectrum_1d), Description (markdown), Tags (tag[]). These appear grayed out / non-removable at top of property table.
* **Ref:** `04_ui.md` §1.13
* **AC:** Common properties visible but not deletable. Attempting removal shows "Cannot remove inherited property" message.

### [STORY] 5.3.6: HSL Color Strategy & Auto-Contrast
* **Target:** `src/utils/color.ts`
* **Directive:** Export `constrainHSL(hue)` that locks Saturation (30-70%) and Lightness (40-60% light, 30-50% dark) for accessibility. Export `autoContrast(bgColor)` that returns white or dark text based on WCAG relative luminance.
* **Ref:** `04_ui.md` §1.7
* **AC:** `constrainHSL(180)` returns valid pastel teal. `autoContrast('#1a1a2e')` returns `#ffffff`. All generated colors pass WCAG AA contrast ratio.
