"use client";

import { useEffect, useRef } from "react";

export type GNode = { cc: string; name: string; value: number };
export type GArc = { a: string; b: string; w: number; kind?: string };

const KIND_COLOR: Record<string, string> = {
  supplies: "#34d399", imports_from: "#fbbf24", exports_to: "#38bdf8",
  invests_in: "#a78bfa", competes_with: "#fb7185", owns: "#f0abfc",
};
const ARC_DEFAULT = "#5eead4";

// ISO2 → [lat, lng]
const COORDS: Record<string, [number, number]> = {
  US: [38, -97], CN: [35, 105], DE: [51, 10], JP: [36, 138], IN: [22, 79], ID: [-2, 118],
  GB: [54, -2], FR: [46, 2], IT: [42, 12], KR: [36, 128], RU: [60, 90], SA: [24, 45],
  ZA: [-29, 24], TR: [39, 35], BR: [-10, -55], CA: [56, -106], AU: [-25, 133], MX: [23, -102],
  NL: [52, 5], TW: [24, 121], SG: [1, 104], MY: [4, 102], TH: [15, 101], VN: [16, 106],
  PH: [13, 122], AR: [-34, -64], KH: [13, 105], LA: [18, 105], MM: [21, 96], BN: [4, 115],
};

const LAND: [number, number][][] = [
  [[37, -6], [35, 10], [32, 22], [31, 32], [12, 43], [10, 51], [-1, 42], [-11, 40], [-26, 33], [-34, 26], [-34, 19], [-22, 14], [-6, 12], [4, 9], [5, -4], [10, -16], [21, -17], [33, -8]],
  [[71, 25], [70, 50], [60, 55], [55, 48], [46, 40], [41, 28], [36, 15], [38, -9], [43, -9], [48, -5], [51, 2], [58, 5], [62, 8], [71, 25]],
  [[75, 60], [73, 100], [72, 140], [66, 172], [60, 160], [52, 140], [43, 131], [35, 127], [30, 122], [22, 118], [10, 104], [16, 95], [22, 90], [21, 70], [25, 60], [37, 50], [45, 55], [55, 58], [66, 58]],
  [[72, -100], [70, -140], [60, -165], [55, -160], [48, -125], [40, -124], [32, -117], [23, -110], [18, -95], [15, -88], [9, -80], [18, -96], [25, -97], [30, -89], [31, -81], [40, -74], [45, -67], [52, -56], [60, -64], [63, -78], [68, -95]],
  [[12, -72], [8, -60], [2, -51], [-8, -35], [-23, -41], [-34, -54], [-41, -63], [-52, -69], [-55, -67], [-48, -74], [-32, -71], [-14, -76], [-4, -81], [4, -78], [10, -75]],
  [[-11, 131], [-13, 142], [-20, 149], [-28, 153], [-38, 146], [-39, 140], [-35, 135], [-32, 124], [-22, 114], [-16, 123]],
  [[83, -30], [81, -20], [70, -22], [60, -44], [70, -54], [78, -58]],
  [[6, 95], [2, 104], [-6, 106], [-8, 114], [-9, 123], [-8, 140], [2, 131], [6, 122], [6, 100]],
];
function inRing(lat: number, lng: number, ring: [number, number][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i], [yj, xj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const isLand = (lat: number, lng: number) => LAND.some((r) => inRing(lat, lng, r));

type Vec = [number, number, number];
const D2R = Math.PI / 180;

function llToVec(lat: number, lng: number): Vec {
  const p = lat * D2R, l = lng * D2R;
  return [Math.cos(p) * Math.sin(l), Math.sin(p), Math.cos(p) * Math.cos(l)];
}
function rot(v: Vec, spin: number, tilt: number): Vec {
  const [x, y, z] = v;
  const x1 = x * Math.cos(spin) + z * Math.sin(spin);
  const z1 = -x * Math.sin(spin) + z * Math.cos(spin);
  const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt);
  const z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt);
  return [x1, y2, z2];
}
function slerp(a: Vec, b: Vec, t: number): Vec {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  d = Math.max(-1, Math.min(1, d));
  const o = Math.acos(d);
  if (o < 1e-4) return a;
  const s = Math.sin(o), w1 = Math.sin((1 - t) * o) / s, w2 = Math.sin(t * o) / s;
  return [a[0] * w1 + b[0] * w2, a[1] * w1 + b[1] * w2, a[2] * w1 + b[2] * w2];
}
function easeAngle(cur: number, target: number, f: number) {
  let d = target - cur;
  d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  return cur + d * f;
}

export function GlobeCanvas({ nodes, arcs, focusCc, onPick }: { nodes: GNode[]; arcs: GArc[]; focusCc: string | null; onPick: (cc: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ spin: 0.4, tilt: -0.35, zoom: 1, dragging: false, lastX: 0, lastY: 0, vSpin: 0.0016, moved: false });
  const focusRef = useRef(focusCc);
  const pickRef = useRef(onPick);
  useEffect(() => { focusRef.current = focusCc; }, [focusCc]);
  useEffect(() => { pickRef.current = onPick; }, [onPick]);

  useEffect(() => {
    const canvas = canvasRef.current!, wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0, W = 0, H = 0, R = 0, cx = 0, cy = 0, dpr = 1;

    const stars = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2, a: Math.random() * 0.5 + 0.2, ph: Math.random() * 6.28 }));
    const landDots: Vec[] = [];
    for (let lat = -56; lat <= 80; lat += 2.1)
      for (let lng = -180; lng < 180; lng += 2.1)
        if (isLand(lat, lng)) landDots.push(llToVec(lat, lng));

    const nodeVecs = nodes.filter((n) => COORDS[n.cc]).map((n) => ({ ...n, v: llToVec(...COORDS[n.cc]) }));
    const maxVal = Math.max(1, ...nodeVecs.map((n) => n.value));
    const arcData = arcs.filter((a) => COORDS[a.a] && COORDS[a.b]).map((a, i) => ({
      va: llToVec(...COORDS[a.a]), vb: llToVec(...COORDS[a.b]), w: a.w, phase: (i * 0.137) % 1,
      col: KIND_COLOR[a.kind ?? ""] ?? ARC_DEFAULT,
    }));

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth; H = wrap.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.42; cx = W / 2; cy = H / 2;
    };
    resize();
    window.addEventListener("resize", resize);

    let projRE = R;
    const proj = (v: Vec) => { const [x, y, z] = rot(v, stateRef.current.spin, stateRef.current.tilt); return { x: cx + x * projRE, y: cy - y * projRE, z }; };

    const draw = (t: number) => {
      const s = stateRef.current;
      const fc = focusRef.current;
      if (s.dragging) { /* pointermove drives rotation */ }
      else if (fc && COORDS[fc]) {
        const [lat, lng] = COORDS[fc];
        s.spin = easeAngle(s.spin, -lng * D2R, 0.09);
        s.tilt += (Math.max(-1.1, Math.min(1.1, lat * D2R)) - s.tilt) * 0.09;
        s.zoom += (1.75 - s.zoom) * 0.09;
      } else {
        s.spin += s.vSpin;
        s.zoom += (1 - s.zoom) * 0.08;
      }
      const R2 = R * s.zoom; projRE = R2;

      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, Math.max(W, H) * 0.75);
      bg.addColorStop(0, "#0a1512"); bg.addColorStop(1, "#05080a");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      for (const st of stars) {
        const tw = 0.35 + 0.65 * Math.sin(t * 0.002 + st.ph) ** 2;
        ctx.globalAlpha = st.a * tw; ctx.fillStyle = "#c9f7e0";
        ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;

      const atmo = ctx.createRadialGradient(cx, cy, R2 * 0.86, cx, cy, R2 + 26);
      atmo.addColorStop(0, "rgba(52,211,153,0)"); atmo.addColorStop(0.55, "rgba(52,211,153,0.16)"); atmo.addColorStop(1, "rgba(16,185,129,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R2 + 26, 0, 7); ctx.fillStyle = atmo; ctx.fill();
      const oc = ctx.createRadialGradient(cx - R2 * 0.35, cy - R2 * 0.38, R2 * 0.05, cx + R2 * 0.2, cy + R2 * 0.2, R2 * 1.15);
      oc.addColorStop(0, "#14352a"); oc.addColorStop(0.7, "#0c1c15"); oc.addColorStop(1, "#050d09");
      ctx.beginPath(); ctx.arc(cx, cy, R2, 0, 7); ctx.fillStyle = oc; ctx.fill();

      // dotted land
      for (const ld of landDots) {
        const p = proj(ld);
        if (p.z <= 0.03) continue;
        ctx.globalAlpha = 0.22 + p.z * 0.55; ctx.fillStyle = "#3fae82";
        ctx.fillRect(p.x - 0.6, p.y - 0.6, 1.3, 1.3);
      }
      ctx.globalAlpha = 1;

      // graticule
      ctx.strokeStyle = "rgba(120,200,160,0.10)"; ctx.lineWidth = 0.6;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath(); let started = false;
        for (let lng = -180; lng <= 180; lng += 6) { const p = proj(llToVec(lat, lng)); if (p.z > 0) { if (started) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); started = true; } else started = false; }
        ctx.stroke();
      }
      for (let lng = -180; lng < 180; lng += 30) {
        ctx.beginPath(); let started = false;
        for (let lat = -90; lat <= 90; lat += 6) { const p = proj(llToVec(lat, lng)); if (p.z > 0) { if (started) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); started = true; } else started = false; }
        ctx.stroke();
      }

      // arcs
      const now = t * 0.00018;
      for (const arc of arcData) {
        const pts: { x: number; y: number; z: number }[] = [];
        for (let k = 0; k <= 40; k++) {
          const tt = k / 40, m = slerp(arc.va, arc.vb, tt), lift = 1 + 0.22 * Math.sin(Math.PI * tt);
          pts.push(proj([m[0] * lift, m[1] * lift, m[2] * lift]));
        }
        ctx.beginPath(); let started = false;
        for (const p of pts) { if (p.z > -0.15) { if (started) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); started = true; } else started = false; }
        ctx.strokeStyle = arc.col; ctx.globalAlpha = 0.2 + Math.min(0.45, arc.w * 0.12);
        ctx.lineWidth = 0.8 + Math.min(1.6, arc.w * 0.5); ctx.stroke(); ctx.globalAlpha = 1;
        const tp = (now + arc.phase) % 1, idx = Math.min(40, Math.floor(tp * 40));
        ctx.shadowColor = arc.col;
        for (let tr = 6; tr >= 0; tr--) {
          const pd = pts[idx - tr]; if (!pd || pd.z <= 0) continue;
          const k = 1 - tr / 7; ctx.globalAlpha = k * 0.9;
          ctx.beginPath(); ctx.arc(pd.x, pd.y, 0.6 + k * 1.8, 0, 7);
          ctx.fillStyle = tr === 0 ? "#ffffff" : arc.col; ctx.shadowBlur = tr === 0 ? 14 : 6; ctx.fill();
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      }

      // nodes + labels
      for (const n of nodeVecs) {
        const p = proj(n.v);
        if (p.z <= 0) continue;
        const frac = n.value / maxVal, rad = 1.8 + frac * 4.5, sel = focusRef.current === n.cc;
        if (frac > 0.35 || sel) {
          const per = 2600, off = (n.cc.charCodeAt(0) * 37 + n.cc.charCodeAt(1) * 91) % per, ph = ((t + off) % per) / per;
          ctx.globalAlpha = (1 - ph) * (sel ? 0.7 : 0.45) * p.z; ctx.strokeStyle = sel ? "#ecfdf5" : "#34d399"; ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.arc(p.x, p.y, rad + ph * 22, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, 7);
        ctx.fillStyle = sel ? "#ffffff" : "#5eead4"; ctx.shadowColor = "#34d399"; ctx.shadowBlur = sel ? 20 : 14; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x - rad * 0.3, p.y - rad * 0.3, rad * 0.4, 0, 7);
        ctx.fillStyle = "#ecfdf5"; ctx.shadowBlur = 0; ctx.fill();
        // label (name at every visible point; brighter when large/selected/zoomed)
        const showLabel = sel || frac > 0.28 || s.zoom > 1.25;
        ctx.globalAlpha = showLabel ? Math.min(1, 0.45 + p.z * 0.6) : 0.28 * p.z;
        ctx.fillStyle = sel ? "#ffffff" : "rgba(224,255,240,0.92)";
        ctx.font = `${sel ? "700" : "600"} ${sel ? 12 : 10}px ui-monospace, monospace`;
        ctx.fillText(n.name, p.x + rad + 4, p.y + 3);
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const down = (e: PointerEvent) => { const s = stateRef.current; s.dragging = true; s.moved = false; s.lastX = e.clientX; s.lastY = e.clientY; };
    const move = (e: PointerEvent) => {
      const s = stateRef.current; if (!s.dragging) return;
      const dx = e.clientX - s.lastX, dy = e.clientY - s.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) s.moved = true;
      s.spin += dx * 0.005; s.tilt = Math.max(-1.2, Math.min(1.2, s.tilt + dy * 0.005));
      s.lastX = e.clientX; s.lastY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      const s = stateRef.current;
      const wasClick = s.dragging && !s.moved;
      s.dragging = false;
      if (!wasClick) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      let best: string | null = null, bestD = 1e9;
      for (const n of nodeVecs) {
        const p = proj(n.v); if (p.z <= 0) continue;
        const d = Math.hypot(p.x - mx, p.y - my), rad = 1.8 + (n.value / maxVal) * 4.5;
        if (d < Math.max(18, rad + 10) && d < bestD) { bestD = d; best = n.cc; }
      }
      pickRef.current(best);
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [nodes, arcs]);

  return (
    <div ref={wrapRef} className="absolute inset-0 cursor-grab active:cursor-grabbing">
      <canvas ref={canvasRef} />
    </div>
  );
}
