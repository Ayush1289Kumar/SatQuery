import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ═══════════════════════════════════════════════════════════
   Configuration — adapted for SatQuery AI
   ═══════════════════════════════════════════════════════════ */

interface RingDef {
  radius: number;
  inclination: number; // radians — tilt from horizontal plane
  color: string;
}

interface MetricDef {
  ringIdx: number;
  phase: number;    // starting angle on ring
  speed: number;    // orbit speed (rad / s)
  icon: string;
  label: string;
  value: string;
  unit: string;
  color: string;
}

const THEMES: Record<string, { primary: string, violet: string, cyan: string }> = {
  'forest-canopy': { primary: '#10b981', violet: '#65a30d', cyan: '#86efac' },
  'olive-sage': { primary: '#4d7c0f', violet: '#86efac', cyan: '#d9f99d' },
  'mint-pine': { primary: '#0f766e', violet: '#6ee7b7', cyan: '#99f6e4' },
  'neon-flora': { primary: '#a3e635', violet: '#14b8a6', cyan: '#fde047' },
  'jungle-night': { primary: '#14b8a6', violet: '#22c55e', cyan: '#84cc16' },
};

const RINGS: RingDef[] = [
  { radius: 2.20, inclination: 0.38, color: "violet" },
  { radius: 2.55, inclination: -0.22, color: "cyan" },
  { radius: 2.00, inclination: 0.72, color: "primary" },
];

// SatQuery-specific metrics replacing meeting analytics
const METRICS: MetricDef[] = [
  { ringIdx: 0, phase: 0, speed: 0.35, icon: "🛰", label: "Coverage", value: "94", unit: " km²", color: "primary" },
  { ringIdx: 0, phase: Math.PI, speed: 0.35, icon: "🔬", label: "Resolution", value: "0.3", unit: " m/px", color: "primary" },
  { ringIdx: 1, phase: 0.80, speed: 0.25, icon: "✓", label: "Confidence", value: "87", unit: "%", color: "violet" },
  { ringIdx: 1, phase: Math.PI + 0.8, speed: 0.25, icon: "⚡", label: "Processing", value: "9.2", unit: "s", color: "#f5b94b" },
  { ringIdx: 2, phase: 1.50, speed: 0.45, icon: "◎", label: "Models", value: "3", unit: " active", color: "cyan" },
];

/* ═══════════════════════════════════════════════════════════
   Pure helpers
   ═══════════════════════════════════════════════════════════ */

function orbPos(radius: number, inclination: number, angle: number): THREE.Vector3 {
  const x = radius * Math.cos(angle);
  const zFlat = radius * Math.sin(angle);
  return new THREE.Vector3(x, zFlat * Math.sin(inclination), zFlat * Math.cos(inclination));
}

function makeGlowTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.28, "rgba(255,255,255,0.70)");
  g.addColorStop(0.55, "rgba(255,255,255,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeOrbitLine(ring: RingDef, colorHex: string): THREE.Line {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 128; i++) {
    pts.push(orbPos(ring.radius, ring.inclination, (i / 128) * Math.PI * 2));
  }
  return new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending,
    })
  );
}

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

/**
 * GlobeHero — SatQuery AI hero visual.
 *
 * A glowing wireframe planet with five SatQuery metric cards orbiting it on
 * three inclined rings at different speeds. A cyan scan arc sweeps the
 * equator independently. Mouse parallax tilts the globe; depth-of-orbit
 * affects each card's scale and opacity so they feel truly 3-D.
 *
 * Ported from AI-Meeting-Autopsy/dashboard-globe.tsx, adapted for SatQuery.
 */
export function GlobeHero({ className = "", theme = "neon-flora" }: { className?: string, theme?: string }) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const cardLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const cardLayer = cardLayerRef.current;
    if (!canvas || !cardLayer) return;

    const W = canvas.clientWidth || 520;
    const H = canvas.clientHeight || 520;

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({
      alpha: true, antialias: true, powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    canvas.appendChild(renderer.domElement);

    /* ── Scene / camera ── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0.8, 6.5);
    camera.lookAt(0, 0, 0);

    const root = new THREE.Group();
    scene.add(root);

    const tex = makeGlowTex();

    const colors = THEMES[theme] || THEMES['forest-canopy'];
    const resolveColor = (c: string) => c === 'primary' ? colors.primary : c === 'violet' ? colors.violet : c === 'cyan' ? colors.cyan : c;

    /* ── Ambient background haze ── */
    const haze = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: new THREE.Color(colors.violet),
      blending: THREE.AdditiveBlending, transparent: true, opacity: 0.065,
    }));
    haze.scale.setScalar(10);
    root.add(haze);

    /* ── Globe core — layered glows ── */
    const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: new THREE.Color(colors.violet),
      blending: THREE.AdditiveBlending, transparent: true, opacity: 0.58,
    }));
    coreGlow.scale.setScalar(2.5);
    root.add(coreGlow);

    const coreAccent = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: new THREE.Color(colors.cyan),
      blending: THREE.AdditiveBlending, transparent: true, opacity: 0.20,
    }));
    coreAccent.scale.setScalar(1.1);
    root.add(coreAccent);

    /* ── Wireframe geodesic globe ── */
    const sphereGeo = new THREE.SphereGeometry(1.5, 22, 15);
    const edgesGeo = new THREE.EdgesGeometry(sphereGeo);
    const wireMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(colors.primary), transparent: true, opacity: 0.50, blending: THREE.AdditiveBlending,
    });
    root.add(new THREE.LineSegments(edgesGeo, wireMat));

    /* ── Equatorial scan group ── */
    const scanGroup = new THREE.Group();
    root.add(scanGroup);

    const fullRingPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      fullRingPts.push(new THREE.Vector3(1.52 * Math.cos(a), 0, 1.52 * Math.sin(a)));
    }
    scanGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(fullRingPts),
      new THREE.LineBasicMaterial({ color: new THREE.Color(colors.cyan), transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending }),
    ));

    const arcPts: THREE.Vector3[] = [];
    const arcCols = [];
    const headColor = new THREE.Color(colors.cyan);
    for (let i = 0; i <= 32; i++) {
      arcPts.push(new THREE.Vector3(1.52 * Math.cos((i / 32) * Math.PI * 0.5), 0, 1.52 * Math.sin((i / 32) * Math.PI * 0.5)));
      const alpha = Math.pow(i / 32, 2.5); // Smooth fade to tail
      arcCols.push(headColor.r * alpha, headColor.g * alpha, headColor.b * alpha);
    }
    const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPts);
    arcGeo.setAttribute("color", new THREE.Float32BufferAttribute(arcCols, 3));
    const arcMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending,
    });
    scanGroup.add(new THREE.Line(arcGeo, arcMat));

    const headGeo = new THREE.BufferGeometry();
    headGeo.setAttribute("position", new THREE.Float32BufferAttribute([1.52, 0, 0], 3));
    const dotColor = new THREE.Color(colors.cyan);
    headGeo.setAttribute("color", new THREE.Float32BufferAttribute([dotColor.r, dotColor.g, dotColor.b], 3));
    const headDot = new THREE.Points(headGeo, new THREE.PointsMaterial({
      size: 0.34, vertexColors: true, transparent: true, opacity: 1.0,
      map: tex, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scanGroup.add(headDot);

    /* ── Tactical Planetary Ring (Halo) ── */
    const haloGeo = new THREE.TorusGeometry(1.65, 0.004, 16, 100);
    const haloMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colors.cyan), transparent: true, opacity: 0.20, blending: THREE.AdditiveBlending
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    root.add(halo);

    /* ── Orbital rings ── */
    const orbitLines = RINGS.map(r => { const l = makeOrbitLine(r, resolveColor(r.color)); root.add(l); return l; });

    /* ── Data Stream Comets ── */
    const cometsGeo = new THREE.BufferGeometry();
    const cometsPos = new Float32Array(RINGS.length * 3);
    cometsGeo.setAttribute("position", new THREE.BufferAttribute(cometsPos, 3));
    const cometsMat = new THREE.PointsMaterial({
      size: 0.20, color: new THREE.Color(colors.cyan), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, map: tex, depthWrite: false
    });
    const comets = new THREE.Points(cometsGeo, cometsMat);
    root.add(comets);

    /* ── Metric anchor dots ── */
    const anchorBuf = new Float32Array(METRICS.length * 3);
    const anchorCol = new Float32Array(METRICS.length * 3);
    METRICS.forEach((m, i) => {
      const c = new THREE.Color(resolveColor(m.color));
      anchorCol[i * 3] = c.r; anchorCol[i * 3 + 1] = c.g; anchorCol[i * 3 + 2] = c.b;
    });
    const anchorGeo = new THREE.BufferGeometry();
    anchorGeo.setAttribute("position", new THREE.BufferAttribute(anchorBuf, 3));
    anchorGeo.setAttribute("color", new THREE.BufferAttribute(anchorCol, 3));
    root.add(new THREE.Points(anchorGeo, new THREE.PointsMaterial({
      size: 0.65, vertexColors: true, transparent: true, opacity: 1.0,
      map: tex, blending: THREE.AdditiveBlending, depthWrite: false,
    })));

    /* ── Connector lines ── */
    const connBuf = new Float32Array(METRICS.length * 6);
    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute("position", new THREE.BufferAttribute(connBuf, 3));
    const connMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(colors.primary), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
    });
    root.add(new THREE.LineSegments(connGeo, connMat));

    /* ── Holographic Dust / Starfield ── */
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      dustPos[i * 3] = (Math.random() - 0.5) * 12;
      dustPos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      dustPos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      size: 0.08, color: new THREE.Color(colors.cyan), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, map: tex, depthWrite: false
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ── Tactical Grid Floor ── */
    const grid = new THREE.GridHelper(30, 40, new THREE.Color(colors.primary), new THREE.Color(colors.violet));
    grid.position.y = -3.5;
    (grid.material as THREE.Material).opacity = 0.12;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).blending = THREE.AdditiveBlending;
    scene.add(grid);

    /* ── HTML metric stat cards ── */
    const cardEls = METRICS.map(m => {
      const hexColor = resolveColor(m.color);
      const el = document.createElement("div");
      el.style.cssText = [
        "position:absolute",
        "pointer-events:none",
        "transform:translate(-50%,-50%) scale(1)",
        "width:112px",
        "padding:10px 12px",
        "border-radius:14px",
        "background:rgba(8,11,28,0.90)",
        `border:1px solid ${hexColor}55`,
        `box-shadow:0 0 28px -8px ${hexColor}50,inset 0 1px 0 rgba(255,255,255,0.06)`,
        "backdrop-filter:blur(14px)",
        "-webkit-backdrop-filter:blur(14px)",
        "opacity:0",
        "will-change:transform,opacity",
        "user-select:none",
        "transition:opacity 0.3s,transform 0.25s",
      ].join(";");

      const chip = document.createElement("div");
      chip.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:${hexColor}22;border:1px solid ${hexColor}40;font-size:11px;margin-bottom:6px`;
      chip.textContent = m.icon;

      const valEl = document.createElement("div");
      const isLong = m.value.length > 3;
      valEl.style.cssText = `font-family:system-ui,sans-serif;font-size:${isLong ? "15" : "22"}px;font-weight:800;line-height:1.1;color:${hexColor};letter-spacing:-0.03em;text-shadow:0 0 16px ${hexColor}80`;
      valEl.innerHTML = `${m.value}<span style="font-size:10px;font-weight:500;opacity:0.65;letter-spacing:0">${m.unit}</span>`;

      const lbl = document.createElement("div");
      lbl.style.cssText = "font-size:9.5px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:rgba(154,163,196,0.85);margin-top:3px";
      lbl.textContent = m.label;

      el.appendChild(chip);
      el.appendChild(valEl);
      el.appendChild(lbl);
      cardLayer.appendChild(el);
      return el;
    });

    /* ── Mouse parallax ── */
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const onLeave = () => { mouse.tx = 0; mouse.ty = 0; };
    window.addEventListener("mousemove", onMove, { passive: true });
    canvas.addEventListener("mouseleave", onLeave);

    /* ── Animation loop ── */
    const projVec = new THREE.Vector3();
    const angles = METRICS.map(m => m.phase);
    let elapsed = 0;
    let animId = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      elapsed += dt;

      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      root.rotation.y = elapsed * 0.20 + mouse.x * 0.40;
      root.rotation.x = mouse.y * 0.18;

      dust.rotation.y = elapsed * 0.05;
      dust.rotation.x = elapsed * 0.02;

      coreGlow.scale.setScalar(2.5 * (1 + Math.sin(elapsed * 1.5) * 0.08));
      wireMat.opacity = 0.40 + Math.sin(elapsed * 1.5) * 0.15;

      scanGroup.rotation.y = elapsed * 1.2;
      arcMat.opacity = 0.65 + Math.sin(elapsed * 2.0) * 0.22;

      METRICS.forEach((m, i) => { angles[i] += dt * m.speed; });

      const mPos = METRICS.map((m, i) =>
        orbPos(RINGS[m.ringIdx].radius, RINGS[m.ringIdx].inclination, angles[i])
      );

      const cometAngles = RINGS.map((_, i) => elapsed * (0.8 + i * 0.4));
      const cometsAttr = cometsGeo.attributes.position as THREE.BufferAttribute;
      RINGS.forEach((r, i) => {
        const p = orbPos(r.radius, r.inclination, cometAngles[i]);
        cometsAttr.setXYZ(i, p.x, p.y, p.z);
      });
      cometsAttr.needsUpdate = true;

      const apAttr = anchorGeo.attributes.position as THREE.BufferAttribute;
      mPos.forEach((p, i) => apAttr.setXYZ(i, p.x, p.y, p.z));
      apAttr.needsUpdate = true;

      const cpAttr = connGeo.attributes.position as THREE.BufferAttribute;
      mPos.forEach((p, i) => {
        const surf = p.clone().normalize().multiplyScalar(1.54);
        cpAttr.setXYZ(i * 2, surf.x, surf.y, surf.z);
        cpAttr.setXYZ(i * 2 + 1, p.x, p.y, p.z);
      });
      cpAttr.needsUpdate = true;

      renderer.render(scene, camera);

      root.updateMatrixWorld();
      const cW = canvas.clientWidth;
      const cH = canvas.clientHeight;

      mPos.forEach((p, i) => {
        const el = cardEls[i];
        projVec.copy(p).applyMatrix4(root.matrixWorld).project(camera);
        if (projVec.z > 1) { el.style.opacity = "0"; return; }

        el.style.left = `${(projVec.x * 0.5 + 0.5) * cW}px`;
        el.style.top = `${(-projVec.y * 0.5 + 0.5) * cH}px`;

        const depth = (1 - projVec.z) * 0.5 + 0.5;
        el.style.transform = `translate(-50%,-50%) scale(${0.70 + depth * 0.50})`;
        el.style.opacity = String(Math.min(0.42 + depth * 0.58, 1));
        el.style.zIndex = String(Math.round(depth * 10));
      });

      animId = requestAnimationFrame(tick);
    };

    /* ── Resize ── */
    const onResize = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      root.scale.setScalar(Math.max(0.60, Math.min(1.05, Math.min(w / 520, h / 580))));
    };
    window.addEventListener("resize", onResize);
    onResize();
    tick();

    /* ── Cleanup ── */
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("mouseleave", onLeave);
      cardEls.forEach(el => el?.remove());
      tex.dispose();
      sphereGeo.dispose();
      edgesGeo.dispose();
      anchorGeo.dispose();
      connGeo.dispose();
      headGeo.dispose();
      orbitLines.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); });
      renderer.dispose();
      if (renderer.domElement.parentElement === canvas) canvas.removeChild(renderer.domElement);
    };
  }, [theme]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* Three.js WebGL canvas */}
      <div ref={canvasRef} aria-hidden className="absolute inset-0" />
      {/* HTML stat card overlay */}
      <div ref={cardLayerRef} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
}

export default GlobeHero;
