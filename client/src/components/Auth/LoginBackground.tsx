import { useEffect, useRef } from 'react';

// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════

const NUM_CARDS = 36;
const NUM_CONNECTIONS = 20;
const NUM_LOOSE_LINES = 14;
const MAX_SPEED = 0.25;
const MIN_SPEED = 0.06;
const RECONNECT_INTERVAL = 3500;
const COLLISION_PADDING = 10;
const BLEED = 260;

const CARD_W = 152;
const CARD_H = 68;
const CARD_R = 6;

const CARD_FILLS = [
  '#111827', '#131b2e', '#161e30', '#0f1625', '#141c2c',
  '#10172a', '#171f34', '#0e1422',
];
const CARD_STROKE = '#808080'; // 50% gray outlines

const PALETTE = [
  '#3B82F6', '#8B5CF6', '#10B981', '#EF4444',
  '#F59E0B', '#6366F1', '#14B8A6', '#F97316',
  '#EC4899', '#06B6D4',
];

const NS = 'http://www.w3.org/2000/svg';

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

function el(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(lo: number, hi: number): number { return lo + Math.random() * (hi - lo); }
function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

// ═══════════════════════════════════════════
// ENTITY CLASSES
// ═══════════════════════════════════════════

interface CardEntity {
  id: number;
  colorIdx: number;
  w: number;
  h: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  group: SVGElement;
}

interface LooseLineEntity {
  color: string;
  baseOpacity: number;
  phase: number;
  x1: number; y1: number;
  x2: number; y2: number;
  vx: number; vy: number;
  line: SVGElement;
}

interface ConnectionEntity {
  src: number;
  tgt: number;
  colorIdx: number;
  color: string;
  birth: number;
  fadeOut: number | null;
  dead: boolean;
  dashPhase: number;
  path: SVGElement;
}

// ═══════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════

export default function LoginBackground() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Clear any previous content (React strict-mode double-mount)
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    let W = window.innerWidth;
    let H = window.innerHeight;

    const defsEl = el('defs') as SVGDefsElement;
    svg.appendChild(defsEl);

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      svg!.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg!.setAttribute('width', String(W));
      svg!.setAttribute('height', String(H));
    }
    resize();
    window.addEventListener('resize', resize);

    // Background gradient
    const bgGrad = el('linearGradient', { id: 'lbg-bgGrad', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
    bgGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#080c18' }));
    bgGrad.appendChild(el('stop', { offset: '50%', 'stop-color': '#0d1224' }));
    bgGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#080c18' }));
    defsEl.appendChild(bgGrad);
    svg.appendChild(el('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: 'url(#lbg-bgGrad)' }));

    // Dot grid
    const dotPat = el('pattern', { id: 'lbg-dots', x: 0, y: 0, width: 40, height: 40, patternUnits: 'userSpaceOnUse' });
    dotPat.appendChild(el('circle', { cx: 20, cy: 20, r: 0.6, fill: '#1e293b', opacity: 0.5 }));
    defsEl.appendChild(dotPat);
    svg.appendChild(el('rect', { x: 0, y: 0, width: '100%', height: '100%', fill: 'url(#lbg-dots)' }));

    // Vignette
    const vigGrad = el('radialGradient', { id: 'lbg-vig', cx: '50%', cy: '50%', r: '70%' });
    vigGrad.appendChild(el('stop', { offset: '0%', 'stop-color': '#080c18', 'stop-opacity': '0' }));
    vigGrad.appendChild(el('stop', { offset: '55%', 'stop-color': '#080c18', 'stop-opacity': '0.15' }));
    vigGrad.appendChild(el('stop', { offset: '100%', 'stop-color': '#080c18', 'stop-opacity': '0.88' }));
    defsEl.appendChild(vigGrad);

    // Layers
    const lineLayer = el('g', { id: 'lbg-loose-lines' });
    const connLayer = el('g', { id: 'lbg-connections' });
    const cardLayer = el('g', { id: 'lbg-cards' });
    const vigRect = el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#lbg-vig)', 'pointer-events': 'none' });
    svg.appendChild(lineLayer);
    svg.appendChild(connLayer);
    svg.appendChild(cardLayer);
    svg.appendChild(vigRect);

    // Arrow markers — one per palette color
    PALETTE.forEach((color, i) => {
      const marker = el('marker', {
        id: `lbg-arrow-${i}`,
        viewBox: '0 0 10 10',
        refX: 10, refY: 5,
        markerWidth: 6, markerHeight: 6,
        orient: 'auto-start-reverse',
      });
      marker.appendChild(el('path', { d: 'M 0 1.5 L 10 5 L 0 8.5 z', fill: color, opacity: 0.5 }));
      defsEl.appendChild(marker);

      // Start marker (reversed arrow)
      const markerStart = el('marker', {
        id: `lbg-arrow-start-${i}`,
        viewBox: '0 0 10 10',
        refX: 0, refY: 5,
        markerWidth: 6, markerHeight: 6,
        orient: 'auto-start-reverse',
      });
      markerStart.appendChild(el('path', { d: 'M 10 1.5 L 0 5 L 10 8.5 z', fill: color, opacity: 0.5 }));
      defsEl.appendChild(markerStart);
    });

    // ── Loose Lines ──

    function createLooseLine(): LooseLineEntity {
      const color = pick(PALETTE);
      const baseOpacity = rand(0.06, 0.18);
      const phase = Math.random() * Math.PI * 2;
      const edge = Math.floor(Math.random() * 4);
      const FAR = 400;
      let x1: number, y1: number, x2: number, y2: number;

      switch (edge) {
        case 0:
          x1 = rand(-FAR, W + FAR); y1 = rand(-FAR, -40);
          x2 = rand(-FAR * 0.3, W + FAR * 0.3); y2 = rand(H * 0.3, H + FAR);
          break;
        case 1:
          x1 = rand(W + 40, W + FAR); y1 = rand(-FAR, H + FAR);
          x2 = rand(-FAR, W * 0.7); y2 = rand(-FAR * 0.3, H + FAR * 0.3);
          break;
        case 2:
          x1 = rand(-FAR, W + FAR); y1 = rand(H + 40, H + FAR);
          x2 = rand(-FAR * 0.3, W + FAR * 0.3); y2 = rand(-FAR, H * 0.7);
          break;
        default:
          x1 = rand(-FAR, -40); y1 = rand(-FAR, H + FAR);
          x2 = rand(W * 0.3, W + FAR); y2 = rand(-FAR * 0.3, H + FAR * 0.3);
          break;
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = rand(0.02, 0.08);
      const colorIdx = PALETTE.indexOf(color);
      const line = el('line', {
        x1, y1, x2, y2,
        stroke: color,
        'stroke-width': rand(0.5, 1.5),
        'stroke-linecap': 'round',
        'marker-start': `url(#lbg-arrow-start-${colorIdx})`,
        'marker-end': `url(#lbg-arrow-${colorIdx})`,
        opacity: 0,
      });
      lineLayer.appendChild(line);

      return {
        color, baseOpacity, phase,
        x1, y1, x2, y2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        line,
      };
    }

    // ── Cards ──

    function inCenter(x: number, y: number, w: number, h: number): boolean {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return Math.abs(cx - W / 2) < 260 && Math.abs(cy - H / 2) < 200;
    }

    function spawnOnEdge(w: number, h: number): [number, number] {
      const edge = Math.floor(Math.random() * 4);
      switch (edge) {
        case 0: return [rand(-w * 0.3, W - w * 0.7), rand(-h * 0.8, -h * 0.2)];
        case 1: return [rand(W - w * 0.6, W + w * 0.3), rand(-h * 0.3, H - h * 0.7)];
        case 2: return [rand(-w * 0.3, W - w * 0.7), rand(H - h * 0.6, H + h * 0.3)];
        default: return [rand(-w * 0.7, -w * 0.1), rand(-h * 0.3, H - h * 0.7)];
      }
    }

    function createCard(i: number, forceEdge: boolean): CardEntity {
      const w = CARD_W;
      const h = CARD_H;
      let x: number, y: number;

      if (forceEdge) {
        [x, y] = spawnOnEdge(w, h);
      } else {
        x = rand(-BLEED, W + BLEED - w);
        y = rand(-BLEED, H + BLEED - h);
        let tries = 0;
        while (inCenter(x, y, w, h) && tries++ < 30) {
          x = rand(-BLEED, W + BLEED - w);
          y = rand(-BLEED, H + BLEED - h);
        }
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

      const group = el('g');
      group.appendChild(el('rect', {
        width: w, height: h,
        rx: CARD_R, ry: CARD_R,
        fill: pick(CARD_FILLS),
        stroke: CARD_STROKE,
        'stroke-width': 1,
      }));
      cardLayer.appendChild(group);

      return {
        id: i,
        colorIdx: i % PALETTE.length,
        w, h, x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        phase: Math.random() * Math.PI * 2,
        group,
      };
    }

    // ── Connections ──

    function edgePoint(from: CardEntity, toward: CardEntity): [number, number] {
      const dx = (toward.x + toward.w / 2) - (from.x + from.w / 2);
      const dy = (toward.y + toward.h / 2) - (from.y + from.h / 2);
      const hw = from.w / 2;
      const hh = from.h / 2;

      if (Math.abs(dx) / hw > Math.abs(dy) / hh) {
        const ex = dx > 0 ? from.x + from.w : from.x;
        const ey = (from.y + from.h / 2) + (dy / Math.abs(dx)) * hw * 0.5;
        return [ex, clamp(ey, from.y + 4, from.y + from.h - 4)];
      } else {
        const ey = dy > 0 ? from.y + from.h : from.y;
        const ex = (from.x + from.w / 2) + (dx / Math.abs(dy)) * hh * 0.5;
        return [clamp(ex, from.x + 4, from.x + from.w - 4), ey];
      }
    }

    function createConnection(src: number, tgt: number): ConnectionEntity {
      const colorIdx = cards[src].colorIdx;
      const color = PALETTE[colorIdx];
      const path = el('path', {
        fill: 'none',
        stroke: color,
        'stroke-width': 1,
        'stroke-dasharray': '5,4',
        'stroke-linecap': 'round',
        'marker-end': `url(#lbg-arrow-${colorIdx})`,
        opacity: 0,
      });
      connLayer.appendChild(path);

      return {
        src, tgt, colorIdx, color,
        birth: performance.now(),
        fadeOut: null, dead: false,
        dashPhase: Math.random() * 200,
        path,
      };
    }

    // ── Init ──

    const cards: CardEntity[] = [];
    for (let i = 0; i < NUM_CARDS; i++) {
      cards.push(createCard(i, i < Math.ceil(NUM_CARDS * 0.4)));
    }

    const looseLines: LooseLineEntity[] = [];
    for (let i = 0; i < NUM_LOOSE_LINES; i++) {
      looseLines.push(createLooseLine());
    }

    let connections: ConnectionEntity[] = [];
    function addRandomConnection() {
      const src = Math.floor(Math.random() * NUM_CARDS);
      let tgt: number;
      do { tgt = Math.floor(Math.random() * NUM_CARDS); } while (tgt === src);
      if (!connections.some(c => !c.dead && c.src === src && c.tgt === tgt)) {
        connections.push(createConnection(src, tgt));
      }
    }
    for (let i = 0; i < NUM_CONNECTIONS; i++) addRandomConnection();

    const interval = setInterval(() => {
      const living = connections.filter(c => !c.dead && c.fadeOut === null);
      if (living.length > 10) living[Math.floor(Math.random() * living.length)].fadeOut = performance.now();
      addRandomConnection();
    }, RECONNECT_INTERVAL);

    // ── Physics ──

    function ensureSpeed(c: CardEntity) {
      const s = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
      if (s < MIN_SPEED && s > 0.001) {
        c.vx = (c.vx / s) * MIN_SPEED;
        c.vy = (c.vy / s) * MIN_SPEED;
      }
    }

    function resolveCollisions() {
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const a = cards[i], b = cards[j];
          const pad = COLLISION_PADDING;
          const ox = (a.x + a.w + pad) - b.x;
          const oxr = (b.x + b.w + pad) - a.x;
          const oy = (a.y + a.h + pad) - b.y;
          const oyb = (b.y + b.h + pad) - a.y;

          if (ox > 0 && oxr > 0 && oy > 0 && oyb > 0) {
            const mx = Math.min(ox, oxr);
            const my = Math.min(oy, oyb);
            if (mx < my) {
              const push = mx / 2 + 0.3;
              const acx = a.x + a.w / 2, bcx = b.x + b.w / 2;
              if (acx < bcx) {
                a.x -= push; b.x += push;
                a.vx = -Math.abs(a.vx) * 0.85; b.vx = Math.abs(b.vx) * 0.85;
              } else {
                a.x += push; b.x -= push;
                a.vx = Math.abs(a.vx) * 0.85; b.vx = -Math.abs(b.vx) * 0.85;
              }
            } else {
              const push = my / 2 + 0.3;
              const acy = a.y + a.h / 2, bcy = b.y + b.h / 2;
              if (acy < bcy) {
                a.y -= push; b.y += push;
                a.vy = -Math.abs(a.vy) * 0.85; b.vy = Math.abs(b.vy) * 0.85;
              } else {
                a.y += push; b.y -= push;
                a.vy = Math.abs(a.vy) * 0.85; b.vy = -Math.abs(b.vy) * 0.85;
              }
            }
            ensureSpeed(a);
            ensureSpeed(b);
          }
        }
      }
    }

    // ── Animation Loop ──

    let raf: number;

    function frame(t: number) {
      // Update cards
      for (const c of cards) {
        c.x += c.vx;
        c.y += c.vy;

        if (c.x < -BLEED) { c.x = -BLEED; c.vx = Math.abs(c.vx); }
        if (c.x + c.w > W + BLEED) { c.x = W + BLEED - c.w; c.vx = -Math.abs(c.vx); }
        if (c.y < -BLEED) { c.y = -BLEED; c.vy = Math.abs(c.vy); }
        if (c.y + c.h > H + BLEED) { c.y = H + BLEED - c.h; c.vy = -Math.abs(c.vy); }

        c.phase += 0.005;
        const shimmer = 0.55 + Math.sin(c.phase + t * 0.0007) * 0.35;
        c.group.setAttribute('transform', `translate(${c.x.toFixed(1)},${c.y.toFixed(1)})`);
        c.group.setAttribute('opacity', shimmer.toFixed(3));
      }

      // Update loose lines
      for (const l of looseLines) {
        l.x1 += l.vx; l.y1 += l.vy;
        l.x2 += l.vx; l.y2 += l.vy;
        l.phase += 0.003;
        const shimmer = l.baseOpacity + Math.sin(l.phase + t * 0.0006) * (l.baseOpacity * 0.5);
        l.line.setAttribute('x1', l.x1.toFixed(1));
        l.line.setAttribute('y1', l.y1.toFixed(1));
        l.line.setAttribute('x2', l.x2.toFixed(1));
        l.line.setAttribute('y2', l.y2.toFixed(1));
        l.line.setAttribute('opacity', Math.max(0, shimmer).toFixed(3));
      }

      resolveCollisions();

      // Update connections
      connections = connections.filter(c => {
        if (c.dead) { c.path.remove(); return false; }
        return true;
      });

      for (const c of connections) {
        const age = performance.now() - c.birth;
        let fadeIn = Math.min(1, age / 1000);
        if (c.fadeOut !== null) {
          const dying = (performance.now() - c.fadeOut) / 800;
          if (dying >= 1) { c.dead = true; fadeIn = 0; }
          else fadeIn = (1 - dying) * fadeIn;
        }
        const op = fadeIn * 0.25;
        if (op < 0.005) { if (c.dead) c.path.remove(); continue; }

        const a = cards[c.src];
        const b = cards[c.tgt];
        const [sx, sy] = edgePoint(a, b);
        const [tx, ty] = edgePoint(b, a);
        const mx = (sx + tx) / 2 + (sy - ty) * 0.1;
        const my = (sy + ty) / 2 + (tx - sx) * 0.1;

        c.dashPhase -= 0.2;
        c.path.setAttribute('d', `M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)}`);
        c.path.setAttribute('opacity', op.toFixed(3));
        c.path.setAttribute('stroke-dashoffset', c.dashPhase.toFixed(1));
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    />
  );
}
