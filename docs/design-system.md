# Nords Design System

> Living reference for the Nords UI design system. Covers tokens, themes, components, icons, responsive patterns, and accessibility.

---

## 1. Token System

All design tokens are **CSS Custom Properties** scoped to `[data-theme="<name>"]` selectors. Components consume them via `var(--nords-*)`.

### Typography

| Token | Obsidian | Nebula | Vapor |
|-------|----------|--------|-------|
| `--nords-font-primary` | Inter | Space Grotesk | Inter |
| `--nords-font-mono` | JetBrains Mono | JetBrains Mono | JetBrains Mono |

**Weights:** `thin` (300) · `normal` (400) · `medium` (500) · `semibold` (600) · `bold` (700) · `black` (800)

**Sizes:** `xs` (11px) · `sm` (12px) · `body` (13px) · `md` (14px) · `lg` (16px) · `xl` (20px) · `2xl` (24px)

**Line heights:** `tight` (1.2) · `normal` (1.5) · `relaxed` (1.65)

### Colors

**Surfaces** (5 levels, darkest → lightest):
`bg-deep` → `bg-canvas` → `bg-surface` → `bg-elevated` → `bg-hover`

**Text** (4 levels):
`text-primary` → `text-secondary` → `text-tertiary` → `text-disabled`

**Borders** (3 levels):
`border-subtle` → `border-default` → `border-strong`

**Accent**: `accent` · `accent-dim` · `accent-hover`

**Semantic**: `success` · `warning` · `danger` · `info`

**Connections**: `connection-active` · `connection-ghost`

### Spatial

| Token | Default |
|-------|---------|
| `--nords-space-xs` | 4px |
| `--nords-space-sm` | 8px |
| `--nords-space-md` | 12px |
| `--nords-space-lg` | 16px |
| `--nords-space-xl` | 24px |
| `--nords-space-2xl` | 32px |

**Radius:** `sm` (4px) · `md` (6px) · `lg` (10px) · `xl` (16px) · `pill` (100px)

**Shadows:** `sm` · `md` · `lg` · `glow`

### Layout

| Token | Description |
|-------|-------------|
| `--nords-header-height` | Viewport header bar height |
| `--nords-dock-height` | Bottom dock height |
| `--nords-drawer-width` | Side drawer width |
| `--nords-palette-width` | Entity palette flyout width |

### Glass Effect

```css
.nords-glass {
  background: var(--nords-glass-bg);
  backdrop-filter: blur(var(--nords-glass-blur));
  border: 1px solid var(--nords-color-border-default);
}
```

Use the `.nords-glass` utility class from `index.css` for any translucent surface.

---

## 2. Themes

Four themes available, each defining the complete token set:

| Theme | Selector | Personality |
|-------|----------|-------------|
| **Obsidian** (default) | `[data-theme="obsidian"]` | Dark charcoal, ice-blue accent. Palantir/Bloomberg. |
| **Obsidian Light** | `[data-theme="obsidian-light"]` | Steel-gray light mode. Linear/Apple Settings. |
| **Nebula** | `[data-theme="nebula"]` | Deep indigo-black, violet/cyan glow. Sci-fi HUD. |
| **Vapor** | `[data-theme="vapor"]` | Warm off-white, copper accent. Notion/editorial. |

### Adding a New Theme

1. Create `client/src/styles/theme-<name>.css`
2. Define all tokens inside `[data-theme="<name>"] { ... }`
3. Import it in `client/src/index.css`
4. Add the option to `ThemeSwitcher.tsx`

**Rule:** Every theme MUST define the same set of CSS custom properties. If a token is missing, components will inherit from `:root` or break silently.

---

## 3. Icon System

Icons use [Lucide React](https://lucide.dev/) with a string-based registry for database storage.

### Architecture

```
Database (string) → iconRegistry.ts → Lucide Component → React render
     "Bug"      →   resolveIcon()   →   <Bug />       →   <svg>
```

### Key Files

| File | Purpose |
|------|---------|
| `client/src/utils/iconRegistry.ts` | Maps 110+ icon names to Lucide components |
| `client/src/components/shared/IconPicker.tsx` | UI for selecting icons |
| `client/src/components/shared/ColorIcon.tsx` | Wraps any icon in a colored circle |

### API

```typescript
import { resolveIcon, getAvailableIconNames, ICON_MAP } from '../utils/iconRegistry';

// Resolve a DB string to a React component
const Icon = resolveIcon('Bug');        // → Lucide <Bug /> component
const Icon = resolveIcon(null);         // → <Square /> (default)
const Icon = resolveIcon('NonExist');   // → <Square /> (fallback)

// Get all available icon names (for IconPicker)
const names = getAvailableIconNames();  // → ['Square', 'User', 'FileText', ...]

// Direct access to the map
const BugIcon = ICON_MAP['Bug'];
```

### ColorIcon Usage

```tsx
import { ColorIcon } from '../shared/ColorIcon';

<ColorIcon iconName="Bug" color="#f87171" size={20} />
```

Renders the icon centered in a colored circle. Supports `onClick` for button behavior (adds `role="button"` automatically).

### Adding New Icons

1. Import the icon from `lucide-react` at the top of `iconRegistry.ts`
2. Add it to the `ICON_MAP` object (key = icon name string, value = component)
3. The `IconPicker` and `resolveIcon()` will pick it up automatically

---

## 4. Shared Components

Located in `client/src/components/shared/`:

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| **ColorIcon** | Icon in colored circle | `iconName`, `color`, `size`, `onClick` |
| **CustomSelect** | Styled dropdown (combobox) | `value`, `options`, `onChange`, `placeholder` |
| **HueSlider** | Color hue picker (0–360°) | `hue`, `onChange` |
| **IconPicker** | Grid picker for Lucide icons | `value`, `onChange` |
| **NordCard** | Reusable card for nodes | `nord`, `type`, `onClick`, `isGhosted` |
| **PersonaAvatar** | DiceBear avatar renderer | `seed`, `size`, `accentColor` |
| **PropertyTable** | Key-value property display | `properties`, `schema`, `onUpdate` |

---

## 5. Layout Components

| Component | Role | Location |
|-----------|------|----------|
| **ViewportHeader** | Top toolbar (project name, nav, actions) | `Layout/ViewportHeader.tsx` |
| **GlobalDock** | Bottom dock (lens switches, entity palette) | `Layout/GlobalDock.tsx` |
| **FloatingPanel** | Reusable floating panel container | `FloatingPanel/FloatingPanel.tsx` |

---

## 6. CSS Conventions

### File Structure

Each component has a co-located CSS file:
```
ComponentName/
  ComponentName.tsx
  ComponentName.css
```

### Naming

- Use `nords-` prefix for global utilities (`.nords-glass`, `.nords-spin`)
- Use component-specific prefixes for scoped styles (`.detail-drawer-*`, `.nord-card-*`)
- Avoid generic class names that could collide

### Global Utilities (in `index.css`)

| Class | Purpose |
|-------|---------|
| `.nords-glass` | Glassmorphism surface effect |
| `.nords-spin` | 360° rotation animation |
| `.required-dot` | Gold asterisk for required fields |
| `.nords-app-container` | Root app container (full viewport) |
