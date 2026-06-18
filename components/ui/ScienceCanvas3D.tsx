'use client';

/* eslint-disable sonarjs/pseudo-random -- Math.random() is acceptable for decorative visuals in this file */

import { useEffect, useRef } from 'react';

/**
 * Hero background: a pseudo-3D "molecular universe" rendered on a 2D canvas.
 * A DNA double-helix core is surrounded by a network of chemistry/physics/math
 * formulas linked by bonds, with electrons orbiting a few nuclei. The whole
 * field rotates in perspective and tilts toward the pointer.
 *
 * No WebGL / external deps: 3D points are projected by hand so it stays light
 * enough for mobile. Honours prefers-reduced-motion and pauses when off-screen.
 */

interface Vec3 { x: number; y: number; z: number; }
interface SciNode { base: Vec3; size: number; symbol: string | null; color: string; glow: number; }
interface SciEdge { a: number; b: number; strength: number; }
interface Electron { nucleus: number; r: number; speed: number; phase: number; u: Vec3; v: Vec3; color: string; }
interface Pulse { edge: number; t: number; speed: number; reversed: boolean; color: string; }
interface Projected { x: number; y: number; scale: number; depthT: number; }

// Brand-aligned accents (bordeaux + the subject colours used across the site).
const PALETTE = {
  red: '#d1163b',
  pink: '#D54F8A',
  blue: '#68BCE8',
  amber: '#EEB550',
  green: '#57c39a',
};

// Math / physics / chemistry notation, coloured by discipline.
const FORMULAS: ReadonlyArray<{ s: string; c: string }> = [
  { s: '∫', c: PALETTE.pink }, { s: '∑', c: PALETTE.pink }, { s: 'π', c: PALETTE.pink },
  { s: '√', c: PALETTE.pink }, { s: '∂', c: PALETTE.pink }, { s: '∇', c: PALETTE.pink },
  { s: 'Δ', c: PALETTE.pink }, { s: '∞', c: PALETTE.pink }, { s: 'dx', c: PALETTE.pink },
  { s: 'E=mc²', c: PALETTE.amber }, { s: 'F=ma', c: PALETTE.amber }, { s: '½mv²', c: PALETTE.amber },
  { s: 'λ', c: PALETTE.amber }, { s: 'ℏ', c: PALETTE.amber }, { s: 'PV=nRT', c: PALETTE.amber },
  { s: 'g', c: PALETTE.amber },
  { s: 'H₂O', c: PALETTE.blue }, { s: 'CO₂', c: PALETTE.blue }, { s: 'O₂', c: PALETTE.blue },
  { s: 'C₆H₁₂O₆', c: PALETTE.blue }, { s: 'NaCl', c: PALETTE.blue }, { s: 'CH₄', c: PALETTE.blue },
  { s: 'pH', c: PALETTE.blue }, { s: 'NH₃', c: PALETTE.blue },
  { s: 'ATP', c: PALETTE.green }, { s: 'DNA', c: PALETTE.green }, { s: 'RNA', c: PALETTE.green },
  { s: 'NADH', c: PALETTE.green }, { s: 'C₆H₅', c: PALETTE.green }, { s: 'Glc', c: PALETTE.green },
  { s: 'Hb', c: PALETTE.green },
];

// Complementary DNA base pairs (A-T, G-C), each nucleotide keeping a distinct hue.
const BASE_PAIRS: ReadonlyArray<{ a: string; b: string; ca: string; cb: string }> = [
  { a: 'A', b: 'T', ca: PALETTE.green, cb: PALETTE.amber },
  { a: 'T', b: 'A', ca: PALETTE.amber, cb: PALETTE.green },
  { a: 'G', b: 'C', ca: PALETTE.blue, cb: PALETTE.pink },
  { a: 'C', b: 'G', ca: PALETTE.pink, cb: PALETTE.blue },
];

function randomUnit(): Vec3 {
  const a = Math.random() * Math.PI * 2;
  const z = Math.random() * 2 - 1;
  const r = Math.sqrt(1 - z * z);
  return { x: Math.cos(a) * r, y: z, z: Math.sin(a) * r };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dist(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function buildField(mobile: boolean) {
  const nodes: SciNode[] = [];
  const edges: SciEdge[] = [];

  // DNA double helix along the Y axis — the recognisable biology centrepiece.
  // Each rung is a complementary base pair (A-T / G-C) with its own hue.
  const segs = mobile ? 14 : 20;
  const turns = mobile ? 2.4 : 3.2;
  const helixR = 0.24;
  const letter = mobile ? 9 : 11;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const y = (t * 2 - 1) * 0.95;
    const ang = t * Math.PI * 2 * turns;
    const pair = BASE_PAIRS[Math.floor(Math.random() * BASE_PAIRS.length)];
    const a = nodes.length;
    nodes.push({ base: { x: Math.cos(ang) * helixR, y, z: Math.sin(ang) * helixR }, size: letter, symbol: pair.a, color: pair.ca, glow: 10 });
    const b = nodes.length;
    nodes.push({ base: { x: Math.cos(ang + Math.PI) * helixR, y, z: Math.sin(ang + Math.PI) * helixR }, size: letter, symbol: pair.b, color: pair.cb, glow: 10 });
    edges.push({ a, b, strength: 0.4 }); // hydrogen-bond rung
    if (i > 0) {
      edges.push({ a: a - 2, b: a, strength: 0.85 }); // sugar-phosphate backbone A
      edges.push({ a: b - 2, b, strength: 0.85 }); // sugar-phosphate backbone B
    }
  }

  // Scattered formula/atom cloud forming a molecular network around the helix.
  const scatterStart = nodes.length;
  const scatter = mobile ? 20 : 42;
  for (let i = 0; i < scatter; i++) {
    const dir = randomUnit();
    const rad = 0.6 + Math.random() * 0.5;
    const f = FORMULAS[Math.floor(Math.random() * FORMULAS.length)];
    nodes.push({
      base: { x: dir.x * rad, y: dir.y * rad * 0.92, z: dir.z * rad },
      size: (mobile ? 17 : 24) * (0.7 + Math.random() * 0.6),
      symbol: f.s, color: f.c, glow: mobile ? 10 : 16,
    });
  }

  // Bonds between nearby scattered nodes.
  const maxD = mobile ? 0.52 : 0.46;
  for (let i = scatterStart; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = dist(nodes[i].base, nodes[j].base);
      if (d < maxD) edges.push({ a: i, b: j, strength: 1 - d / maxD });
    }
  }

  // Electrons orbiting a few nuclei (physics accent).
  const electrons: Electron[] = [];
  const nuclei = mobile ? 2 : 3;
  for (let n = 0; n < nuclei; n++) {
    const nucleus = scatterStart + Math.floor(Math.random() * scatter);
    for (let e = 0; e < 2; e++) {
      const u = randomUnit();
      const v = normalize(cross(u, randomUnit()));
      electrons.push({ nucleus, r: 0.13 + Math.random() * 0.06, speed: 1.4 + Math.random(), phase: Math.random() * Math.PI * 2, u, v, color: PALETTE.amber });
    }
  }

  // Adjacency (node -> incident edges) so signals can hop between connected bonds.
  const adjacency: number[][] = nodes.map(() => []);
  edges.forEach((e, idx) => { adjacency[e.a].push(idx); adjacency[e.b].push(idx); });

  // Signal pulses travelling along the bonds — like nerve impulses through a network.
  const pulseColors = [PALETTE.green, '#9af0c8', PALETTE.blue];
  const pulses: Pulse[] = [];
  const pulseCount = mobile ? 3 : 7;
  for (let i = 0; i < pulseCount; i++) {
    pulses.push({
      edge: Math.floor(Math.random() * edges.length),
      t: Math.random(),
      speed: 0.5 + Math.random() * 0.6,
      reversed: Math.random() < 0.5,
      color: pulseColors[i % pulseColors.length],
    });
  }

  return { nodes, edges, electrons, adjacency, pulses };
}

function project(p: Vec3, ry: number, rx: number, spread: number, focal: number, cx: number, cy: number): Projected {
  const wx = p.x * spread, wy = p.y * spread, wz = p.z * spread;
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const x1 = wx * cosY + wz * sinY;
  const z1 = -wx * sinY + wz * cosY;
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const y1 = wy * cosX - z1 * sinX;
  const z2 = wy * sinX + z1 * cosX;
  const scale = focal / (focal + z2);
  const depthT = Math.max(0, Math.min(1, (spread - z2) / (2 * spread)));
  return { x: cx + x1 * scale, y: cy + y1 * scale, scale, depthT };
}

export default function ScienceCanvas3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let mobile = globalThis.innerWidth < 768;
    let field = buildField(mobile);
    let proj: Projected[] = Array.from({ length: field.nodes.length });
    let order = field.nodes.map((_, i) => i);
    let w = 0, h = 0, cx = 0, cy = 0, spread = 0, focal = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    const resize = () => {
      w = container.clientWidth;
      h = container.clientHeight;
      const nowMobile = w < 768;
      if (nowMobile !== mobile) {
        mobile = nowMobile;
        field = buildField(mobile);
        proj = Array.from({ length: field.nodes.length });
        order = field.nodes.map((_, i) => i);
      }
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2;
      cy = h * 0.5;
      spread = Math.min(w, h) * (mobile ? 0.6 : 0.5);
      focal = spread * 2.6;
    };
    resize();

    const onMove = (e: MouseEvent) => { pointer.tx = e.clientX / w - 0.5; pointer.ty = e.clientY / h - 0.5; };
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) { pointer.tx = t.clientX / w - 0.5; pointer.ty = t.clientY / h - 0.5; }
    };

    const drawEdges = () => {
      for (const edge of field.edges) {
        const pa = proj[edge.a], pb = proj[edge.b];
        const depth = (pa.depthT + pb.depthT) / 2;
        const alpha = edge.strength * (0.04 + depth * 0.22);
        if (alpha < 0.012) continue;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = field.nodes[edge.a].color;
        ctx.lineWidth = 0.5 + depth * 1.3;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    };

    const drawNodes = () => {
      order.sort((a, b) => proj[a].depthT - proj[b].depthT);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const i of order) {
        const node = field.nodes[i];
        const p = proj[i];
        ctx.globalAlpha = Math.min(0.95, 0.12 + p.depthT * 0.82);
        ctx.shadowBlur = node.glow * p.scale;
        ctx.shadowColor = node.color;
        ctx.fillStyle = node.color;
        if (node.symbol) {
          ctx.font = `bold ${node.size * p.scale}px Bahnschrift, sans-serif`;
          ctx.fillText(node.symbol, p.x, p.y);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, node.size * p.scale * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawElectrons = (t: number, ry: number, rx: number) => {
      for (const el of field.electrons) {
        const nb = field.nodes[el.nucleus].base;
        const a = el.phase + t * el.speed;
        const ca = Math.cos(a) * el.r, sa = Math.sin(a) * el.r;
        const p = project(
          { x: nb.x + el.u.x * ca + el.v.x * sa, y: nb.y + el.u.y * ca + el.v.y * sa, z: nb.z + el.u.z * ca + el.v.z * sa },
          ry, rx, spread, focal, cx, cy
        );
        ctx.globalAlpha = Math.min(0.95, 0.25 + p.depthT * 0.7);
        ctx.shadowBlur = 10 * p.scale;
        ctx.shadowColor = el.color;
        ctx.fillStyle = el.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2 * p.scale, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const advancePulses = (dt: number) => {
      for (const pulse of field.pulses) {
        pulse.t += pulse.speed * dt;
        while (pulse.t >= 1) {
          pulse.t -= 1;
          const edge = field.edges[pulse.edge];
          const arrived = pulse.reversed ? edge.a : edge.b;
          const adj = field.adjacency[arrived];
          pulse.edge = adj.length ? adj[Math.floor(Math.random() * adj.length)] : Math.floor(Math.random() * field.edges.length);
          pulse.reversed = field.edges[pulse.edge].a !== arrived;
        }
      }
    };

    const drawPulses = () => {
      for (const pulse of field.pulses) {
        const edge = field.edges[pulse.edge];
        const from = pulse.reversed ? proj[edge.b] : proj[edge.a];
        const to = pulse.reversed ? proj[edge.a] : proj[edge.b];
        const x = from.x + (to.x - from.x) * pulse.t;
        const y = from.y + (to.y - from.y) * pulse.t;
        const depth = from.depthT + (to.depthT - from.depthT) * pulse.t;
        const r = 1.4 + depth * 2;
        ctx.shadowBlur = 14 * (0.5 + depth);
        ctx.shadowColor = pulse.color;
        ctx.globalAlpha = 0.3 + depth * 0.4;
        ctx.fillStyle = pulse.color;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.6 + depth * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const start = performance.now();
    let last = start;
    const render = (now: number) => {
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      const ry = (reduce ? 0.6 : t * 0.12) + pointer.x * 0.9;
      const rx = (reduce ? -0.25 : Math.sin(t * 0.18) * 0.18) - pointer.y * 0.6;

      for (let i = 0; i < field.nodes.length; i++) {
        proj[i] = project(field.nodes[i].base, ry, rx, spread, focal, cx, cy);
      }
      if (!reduce) advancePulses(dt);

      ctx.clearRect(0, 0, w, h);
      drawEdges();
      drawNodes();
      drawElectrons(t, ry, rx);
      drawPulses();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      if (!reduce) raf = requestAnimationFrame(render);
    };

    let raf = 0;
    const startLoop = () => { if (!raf && !reduce) raf = requestAnimationFrame(render); };
    const stopLoop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

    if (reduce) render(start);
    else startLoop();

    if (!reduce) {
      globalThis.addEventListener('mousemove', onMove);
      globalThis.addEventListener('touchmove', onTouch, { passive: true });
    }
    globalThis.addEventListener('resize', resize);

    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) startLoop();
      else stopLoop();
    });
    io.observe(container);
    const onVisibility = () => { if (document.hidden) stopLoop(); else startLoop(); };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopLoop();
      io.disconnect();
      globalThis.removeEventListener('mousemove', onMove);
      globalThis.removeEventListener('touchmove', onTouch);
      globalThis.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Deep-space base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0a0410] to-black" />
      {/* Ambient brand glow orbs */}
      <div className="absolute top-[12%] left-[10%] w-72 h-72 rounded-full bg-[#a8012b] blur-[120px] opacity-20 animate-pulse-slow" />
      <div className="absolute bottom-[10%] right-[12%] w-80 h-80 rounded-full bg-[#68BCE8] blur-[130px] opacity-10 animate-pulse-slow" style={{ animationDelay: '3s' }} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Vignette: fades the field toward the edges so the composition stays framed */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.55) 100%)' }}
      />
    </div>
  );
}
