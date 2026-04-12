# [EPIC] 12: Animations & Performance

**Objective:** Implement all named transitions from the Animation Appendix, The Reveal (lens switching), and enforce 60fps with GPU compositing.
**Invariant:** All animations use GPU-composited properties ONLY (transform, opacity). No width/height/top/left animation.
**Tech:** requestAnimationFrame, CSS transitions, Web Workers
**Ref:** `04_ui.md` Appendix A, `05_spatial.md` §6

---

## [FEATURE] 12.1: Lens Transition Animations

### [STORY] 12.1.1: Canvas → Link Lens Transition
* **Target:** `src/hooks/useLensTransition.ts`
* **Directive:** On lens switch: inactive connection types fade out (300ms ease-in-out). Unconnected nords cross-fade to 20% ghost opacity. Cards reposition if force-directed active. Total transition 500–800ms.
* **Ref:** `04_ui.md` Appendix A.1
* **AC:** Switching Canvas→Link: connection type edges fade to ghosts. Unconnected nords dim. No jarring snaps.

### [STORY] 12.1.2: Canvas → Matrix Lens Transition (The Reveal)
* **Target:** `useLensTransition.ts`
* **Directive:** THE signature animation. Cards fly from canvas positions into matrix column/row slots using `cubic-bezier(0.34, 1.56, 0.64, 1)` easing over 800–1200ms. Cards scale down slightly during flight. Connection lines fade out during transition. This is "the wow moment."
* **Ref:** `04_ui.md` Appendix A.1, `05_spatial.md` §6
* **AC:** Switching to Matrix: all cards visibly animate from their canvas coordinates into grid cells. Animation smooth at 60fps with 200+ nodes.

### [STORY] 12.1.3: Matrix → Canvas Lens Transition
* **Target:** `useLensTransition.ts`
* **Directive:** Cards animate from matrix cell positions back to saved canvas x/y coordinates. Ease-out over 800–1200ms. Connection lines fade back in after cards settle.
* **Ref:** `04_ui.md` Appendix A.1
* **AC:** Switching Matrix→Canvas: cards fly back to spatial positions. Connections re-render after movement completes.

---

## [FEATURE] 12.2: Entity Transition Animations

### [STORY] 12.2.1: Filter Toggle Animations (Show/Hide Type)
* **Target:** `src/hooks/useFilterAnimation.ts`
* **Directive:** Toggling a type's visibility: hidden cards fade to 20% over 200ms ease. Showing cards fade from 20% → 100%. Ghost transitions use opacity only — no position change.
* **Ref:** `04_ui.md` Appendix A.1, A.2
* **AC:** Hiding "Bug" type: bug cards fade to ghosts over 200ms. Showing: cards fade back in.

### [STORY] 12.2.2: Connection Toggle Cross-Fade
* **Target:** `useFilterAnimation.ts`
* **Directive:** Changing active connection type: old lines fade out, new lines fade in over 300ms ease-in-out. Nords ghost/unghost accordingly.
* **Ref:** `04_ui.md` Appendix A.1
* **AC:** Switching from "Blocks" to "Depends On": old edges fade, new edges appear. Connected nords transition ghost state.

### [STORY] 12.2.3: Detail Drawer Slide Animation
* **Target:** `DetailDrawer.css`
* **Directive:** Open: slide in from right edge, 250ms ease-out. Close: slide out, 200ms ease-in. Mobile bottom-sheet: slide up/down with spring damping.
* **Ref:** `04_ui.md` Appendix A.1
* **AC:** Drawer opens and closes with smooth slide. No CSS jank. AX: no layout shift on page content.

### [STORY] 12.2.4: Drag Release Physics Settle
* **Target:** `useForceLayout.ts`
* **Directive:** After drag release: force-directed equilibrium animation. Connected nodes pull/push to balanced positions. Spring physics simulation: `spring(0.6, 0.9)`. Max duration 300–600ms. Run on requestAnimationFrame with bailout at 300ms if not converged.
* **Ref:** `04_ui.md` Appendix A.1, A.3
* **AC:** Dragging a node and releasing: connected nodes gently settle to equilibrium. Animation never blocks UI.

---

## [FEATURE] 12.3: Performance Enforcement

### [STORY] 12.3.1: GPU Compositing Audit & Enforcement
* **Target:** `src/styles/animations.css`
* **Directive:** All animated elements use `will-change: transform, opacity` or `transform: translateZ(0)`. No animations on `width`, `height`, `top`, `left`, `margin`, `padding`. ESLint custom rule to flag non-composited animations in CSS.
* **Ref:** `04_ui.md` Appendix A.2, A.3
* **AC:** Chrome DevTools Layers panel shows no unexpected repaints during animations. All animated elements are on compositor layers.

### [STORY] 12.3.2: WebWorker Physics Offload
* **Target:** `src/workers/physicsWorker.ts`
* **Directive:** Force-directed equilibrium calculations (node position solving) run in a dedicated Web Worker off the main thread. Main thread sends node positions + connection constraints → worker returns equilibrium positions → main thread applies via requestAnimationFrame.
* **Ref:** `04_ui.md` Appendix A.3
* **AC:** With 1500 nodes: physics settle runs without dropping below 60fps on the main thread. Worker executes independently.

### [STORY] 12.3.3: Large Graph Degradation (1500+ Nodes)
* **Target:** `useLensTransition.ts`
* **Directive:** At 1500+ visible nords: lens transitions degrade to instant cuts with a 200ms fade overlay instead of individual card animations. Semantic zoom aggressively culls DOM elements at Meso/Macro scales.
* **Ref:** `04_ui.md` Appendix A.3
* **AC:** With 1500 nords: lens switch completes within 250ms total (fade overlay, no per-card animation). FPS stays above 30.
