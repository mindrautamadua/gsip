"use client";

import { useEffect, useRef } from "react";

export type Blip = { id: string; importance: number };

// deterministic hash → stable blip placement per event id
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const IMP_COLOR: Record<number, string> = {
  5: "244,63,94",
  4: "249,115,22",
  3: "245,158,11",
  2: "132,204,22",
  1: "16,185,129",
};

// Live radar sweep: concentric rings + event blips that flare as the beam
// passes. Pure canvas, GPU-cheap, static frame under prefers-reduced-motion.
export function RadarHero({ blips }: { blips: Blip[] }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const base = dark ? "52,211,153" : "47,158,84";

    const pts = blips.slice(0, 40).map((b) => {
      const h = hash(b.id);
      return {
        angle: ((h % 3600) / 3600) * Math.PI * 2,
        radius: 0.28 + ((h >> 12) % 62) / 100,
        color: IMP_COLOR[Math.min(5, Math.max(1, b.importance))] ?? base,
        size: 2 + b.importance * 0.9,
      };
    });

    let raf = 0;
    let sweep = 0;
    let last = performance.now();
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) draw(true);
    };

    const draw = (staticFrame = false) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) / 2 - 6;
      if (R <= 0) return;

      // rings + spokes
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${base},0.16)`;
      for (const f of [0.25, 0.5, 0.75, 1]) {
        ctx.beginPath();
        ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(${base},0.1)`;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
      }

      // sweep trail (fading wedge behind the beam)
      if (!staticFrame) {
        const SEGS = 44;
        for (let i = 0; i < SEGS; i++) {
          const a1 = sweep - (i * 0.022);
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, R, a1 - 0.024, a1);
          ctx.closePath();
          ctx.fillStyle = `rgba(${base},${0.14 * (1 - i / SEGS)})`;
          ctx.fill();
        }
        // beam edge
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweep) * R, cy + Math.sin(sweep) * R);
        ctx.strokeStyle = `rgba(${base},0.55)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // blips — flare on beam pass, slow decay after
      for (const p of pts) {
        let glow = 0.55;
        if (!staticFrame) {
          let d = (sweep - p.angle) % (Math.PI * 2);
          if (d < 0) d += Math.PI * 2;
          glow = Math.max(0.18, 1 - d * 0.55);
        }
        const x = cx + Math.cos(p.angle) * R * p.radius;
        const y = cy + Math.sin(p.angle) * R * p.radius;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${glow})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, p.size * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${glow * 0.16})`;
        ctx.fill();
      }

      // center hub
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${base},0.9)`;
      ctx.fill();
    };

    const loop = (now: number) => {
      sweep += ((now - last) / 1000) * 0.9; // rad/s
      last = now;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    if (!reduced) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [blips]);

  return <canvas ref={ref} className="h-full w-full" aria-hidden />;
}
