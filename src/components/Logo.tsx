import { useMemo, useRef, useState, useEffect } from 'react'
import type { RefObject, PointerEvent as ReactPointerEvent } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * GEO-NIUS — animated 3D brand lockup.
 *
 * A single cohesive Three.js composition (no drei/gsap — the entrance
 * choreography, hover glow, idle pulse and parallax are driven in useFrame so
 * it stays compact for a header footprint):
 *
 *   A. Globe    — warm golden sphere, softly emissive, lat/long grid lines
 *   B. Bulb     — decorative navy neck + ridged base (the globe is the "bulb")
 *   C. Leaves   — two large protective leaf/hand forms curving up around globe
 *   D. Base     — two olive leaves spreading horizontally at the very bottom
 *   E. Sparkles — two tiny navy sparkles that twinkle at the sides
 *
 * Entrance phases: base leaves → protective leaves rise → bulb + globe
 * assemble (grid draws in, globe brightens) → warm "activation" flicker →
 * sparkles. Hover brightens the globe, adds a golden bloom, energises the grid
 * and throws a little warm light onto the leaves. Idle = one gentle unified
 * pulse + float + tiny damped pointer parallax. All motion is disabled under
 * prefers-reduced-motion, and rendering pauses while off-screen.
 */

const NAVY = '#14233F'
const NAVY_EDGE = '#0F1A30'
const OLIVE = '#6B8A42'
const OLIVE_DEEP = '#4A612F'
const GOLD = '#F2C248'
const GOLD_DEEP = '#D99B2B'
const GOLD_GLOW = '#F6C75A'

/** One large protective "hand/leaf" form cupping the globe from below. */
function buildProtectiveLeaf(): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(0.06, -0.04)
  s.quadraticCurveTo(-0.30, -0.12, -0.55, 0.08)
  s.quadraticCurveTo(-0.78, 0.24, -0.86, 0.52)
  s.quadraticCurveTo(-0.94, 0.80, -0.72, 1.02)
  s.quadraticCurveTo(-0.62, 1.14, -0.50, 1.10)
  s.quadraticCurveTo(-0.34, 1.00, -0.28, 0.82)
  s.quadraticCurveTo(-0.24, 0.60, -0.16, 0.40)
  s.quadraticCurveTo(-0.08, 0.18, 0.06, -0.04)
  return s
}

/** Horizontal platform leaf spreading out from the bulb base. */
function buildBaseLeaf(sign: 1 | -1): THREE.Shape {
  const s = new THREE.Shape()
  const x = sign
  s.moveTo(0.04, -0.02)
  s.quadraticCurveTo(0.3 * x, -0.10, 0.62 * x, -0.08)
  s.quadraticCurveTo(0.82 * x, -0.06, 0.78 * x, 0.06)
  s.quadraticCurveTo(0.60 * x, 0.16, 0.34 * x, 0.14)
  s.quadraticCurveTo(0.16 * x, 0.12, 0.04, 0.10)
  s.quadraticCurveTo(0.02, 0.06, 0.04, -0.02)
  return s
}

/** Subtle midrib "vein" polyline inside a leaf (kept minimal). */
function buildVein(pts: [number, number][], z: number): number[] {
  const arr: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    arr.push(x1, y1, z, x2, y2, z)
  }
  return arr
}

/** Flatten shape outline into positions for a navy contour line. */
function buildOutline(shape: THREE.Shape, z: number): number[] {
  const pts = shape.getPoints(48)
  const arr: number[] = []
  for (const p of pts) arr.push(p.x, p.y, z)
  arr.push(pts[0].x, pts[0].y, z)
  return arr
}

function smoothstep(a: number, b: number, t: number): number {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}
/** Positions (pairs) for a lat/long grid as LineSegments. */
function buildGridPositions(): Float32Array {
  const p: number[] = []
  const R = 0.518
  const step = 0.14
  // parallels (latitude circles)
  for (let i = 0; i <= 6; i++) {
    const phi = -Math.PI / 2 + i * (Math.PI / 6)
    const y = R * Math.sin(phi)
    const rr = R * Math.cos(phi)
    for (let a = 0; a < Math.PI * 2; a += step) {
      const a2 = a + step
      // only draw front-facing half so it reads as latitude ring on a globe
      p.push(rr * Math.cos(a), y, rr * Math.sin(a), rr * Math.cos(a2), y, rr * Math.sin(a2))
    }
  }
  // meridians (longitude great-circles through both poles)
  for (let i = 0; i < 8; i++) {
    const th = i * (Math.PI / 8)
    const ca = Math.cos(th)
    const sa = Math.sin(th)
    for (let u = 0; u < Math.PI * 2; u += step) {
      const u2 = u + step
      p.push(
        R * Math.cos(u) * ca, R * Math.sin(u), R * Math.cos(u) * sa,
        R * Math.cos(u2) * ca, R * Math.sin(u2), R * Math.cos(u2) * sa,
      )
    }
  }
  return new Float32Array(p)
}

/** Soft radial "bloom" sprite texture (no post-processing). */
function buildGlowTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,214,130,1)')
  g.addColorStop(0.4, 'rgba(255,200,100,0.5)')
  g.addColorStop(1, 'rgba(255,190,80,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  return tex
}

/** Tiny 4-point sparkle shape. */
function buildStar(): THREE.Shape {
  const s = new THREE.Shape()
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2
    const r = i % 2 === 0 ? 1 : 0.42
    const x = Math.cos(ang) * 0.05 * r
    const y = Math.sin(ang) * 0.05 * r
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

interface GeoSceneProps {
  reduced: boolean
  hover: boolean
  pointer: RefObject<{ x: number; y: number }>
}

function GeoScene({ reduced, hover, pointer }: GeoSceneProps) {
  const root = useRef<THREE.Group>(null)
  const bulb = useRef<THREE.Group>(null)
  const globe = useRef<THREE.Mesh>(null)
  const globeMat = useRef<THREE.MeshStandardMaterial>(null)
  const grid = useRef<THREE.LineSegments>(null)
  const gridMat = useRef<THREE.LineBasicMaterial>(null)
  const glowSpr = useRef<THREE.Sprite>(null)
  const glowMat = useRef<THREE.SpriteMaterial>(null)
  const leafL = useRef<THREE.Group>(null)
  const leafR = useRef<THREE.Group>(null)
  const leafMatL = useRef<THREE.MeshStandardMaterial>(null)
  const leafMatR = useRef<THREE.MeshStandardMaterial>(null)
  const leafOutL = useRef<THREE.LineBasicMaterial>(null)
  const leafOutR = useRef<THREE.LineBasicMaterial>(null)
  const baseGroup = useRef<THREE.Group>(null)
  const baseMatL = useRef<THREE.MeshStandardMaterial>(null)
  const baseMatR = useRef<THREE.MeshStandardMaterial>(null)
  const baseOutL = useRef<THREE.LineBasicMaterial>(null)
  const baseOutR = useRef<THREE.LineBasicMaterial>(null)
  const sparkMatL = useRef<THREE.MeshStandardMaterial>(null)
  const sparkMatR = useRef<THREE.MeshStandardMaterial>(null)
  const warm = useRef<THREE.PointLight>(null)

  const extrudeProt = useMemo(
    () =>
      new THREE.ExtrudeGeometry(buildProtectiveLeaf(), {
        depth: 0.055, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.014, bevelSegments: 2, steps: 1,
      }),
    [],
  )
  const extrudeBase = useMemo(
    () =>
      new THREE.ExtrudeGeometry(buildBaseLeaf(1), {
        depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.012, bevelSegments: 2, steps: 1,
      }),
    [],
  )
  const protOutline = useMemo(() => buildOutline(buildProtectiveLeaf(), -0.045).flat(), [])
  const baseOutline = useMemo(() => buildOutline(buildBaseLeaf(1), -0.042).flat(), [])
  const protVein = useMemo(
    () => new Float32Array(buildVein([[0.0, -0.02], [-0.2, 0.12], [-0.42, 0.36], [-0.6, 0.72], [-0.68, 0.95]], 0.028)),
    [],
  )
  const baseVein = useMemo(
    () => new Float32Array(buildVein([[0.06, 0.04], [0.3, 0.05], [0.52, 0.04], [0.72, 0.01]], 0.028)),
    [],
  )
  const gridGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(buildGridPositions(), 3))
    return g
  }, [])
  const starGeo = useMemo(() => new THREE.ShapeGeometry(buildStar()), [])
  const glowTex = useMemo(() => buildGlowTexture(), [])

  const hoverAmt = useRef(0)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const setFinal = () => {
      if (globe.current) globe.current.scale.setScalar(1)
      if (globeMat.current) globeMat.current.emissiveIntensity = 0.9
      if (grid.current) grid.current.visible = true
      if (gridMat.current) { gridMat.current.opacity = 0.95 }
      if (bulb.current) bulb.current.scale.set(1, 1, 1)
      if (baseGroup.current) { baseGroup.current.scale.set(1, 1, 1); baseGroup.current.position.y = -0.42 }
      for (const l of [leafL, leafR]) {
        if (l.current) { l.current.position.y = 0; l.current.scale.setScalar(1) }
      }
      for (const m of [leafMatL, leafMatR, baseMatL, baseMatR, baseOutL, baseOutR, leafOutL, leafOutR]) {
        if (m.current) m.current.opacity = 1
      }
      if (sparkMatL.current) sparkMatL.current.opacity = 1
      if (sparkMatR.current) sparkMatR.current.opacity = 1
    }
    if (reduced) { setFinal(); return }

    const base = smoothstep(0.05, 0.95, t)
    const side = smoothstep(0.5, 1.55, t)
    const bulbP = smoothstep(1.3, 2.1, t)
    const glowP = smoothstep(1.75, 2.65, t)
    let flick = 1
    if (t > 2.65 && t <= 3.35) {
      const f = t - 2.65
      flick = 1 - 0.22 * (1 - smoothstep(0.25, 1, f)) * (0.5 + 0.5 * Math.sin(f * 30))
    }
    const target = hover ? 1 : 0
    hoverAmt.current += (target - hoverAmt.current) * 0.08
    const h = hoverAmt.current
    const idle = t > 3.4 ? 1 : 0
    const pulse = 1 + 0.014 * idle * Math.sin(t * 1.5)
    const float = 0.02 * idle * Math.sin(t * 1.12)

    if (root.current) {
      root.current.rotation.x = -pointer.current.y * 0.05
      root.current.rotation.y = pointer.current.x * 0.06
      root.current.scale.setScalar(pulse)
      root.current.position.y = float
    }

    if (baseGroup.current) {
      baseGroup.current.scale.set(0.2 + 0.8 * base, 1, 1)
      baseGroup.current.position.y = -0.42 + (1 - base) * 0.32
    }
    for (const [l, off] of [[leafL, 1], [leafR, -1]] as const) {
      const g = l.current
      if (g) {
        const rise = 1 - side
        g.position.y = -rise * 1.0
        g.position.x = off * -0.07 * rise
        g.rotation.z = off * (1 - side) * 0.08
        const s = 0.55 + 0.45 * side
        g.scale.setScalar(s)
      }
    }
    for (const m of [leafMatL, leafMatR, leafOutL, leafOutR]) if (m.current) m.current.opacity = side
    for (const m of [baseMatL, baseMatR, baseOutL, baseOutR]) if (m.current) m.current.opacity = base

    if (bulb.current) bulb.current.scale.set(1, bulbP, 1)
    if (globe.current) globe.current.scale.setScalar(0.6 + 0.4 * glowP)
    if (globeMat.current) {
      globeMat.current.emissiveIntensity = 0.08 + (0.82 * glowP) * flick + h * 0.5
      globeMat.current.emissive.set(new THREE.Color(GOLD_DEEP).lerp(new THREE.Color(GOLD_GLOW), h))
    }
    if (grid.current) {
      grid.current.visible = glowP > 0.02
      if (gridMat.current) gridMat.current.opacity = (0.5 + 0.5 * glowP) * (0.5 + 0.5 * flick) + h * 0.3
    }
    if (glowSpr.current && glowMat.current) {
      glowMat.current.opacity = Math.min(1, (0.18 + 0.5 * glowP + h * 0.55) * flick)
      glowSpr.current.scale.setScalar(1.2 + h * 0.5)
    }
    if (warm.current) {
      warm.current.intensity = (0.9 + 0.9 * glowP + 1.4 * h) * (0.92 + 0.08 * Math.sin(t * 3))
    }
    if (sparkMatL.current) {
      sparkMatL.current.opacity = 0.2 + 0.8 * smoothstep(3.3, 3.9, t) * (0.7 + 0.3 * Math.sin(t * 2.1)) + h * 0.3
    }
    if (sparkMatR.current) {
      sparkMatR.current.opacity = 0.2 + 0.8 * smoothstep(3.45, 4.0, t) * (0.7 + 0.3 * Math.sin(t * 2.1 + 1.4)) + h * 0.3
    }
  })

  return (
    <>
      <ambientLight intensity={reduced ? 0.9 : 1.0} color="#ffffff" />
      <hemisphereLight args={['#ffffff', '#223047', 0.5]} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} color="#fff4e0" />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#3a4a66" />
      {/* Cool rim light from behind — separates dark navy edges from the bg. */}
      <directionalLight position={[0, 1.2, -4]} intensity={0.55} color="#9FB6E8" />
      <pointLight ref={warm} position={[0, 0.5, 1.2]} color={GOLD_GLOW} intensity={reduced ? 1.2 : 1.6} distance={8} />
      <group ref={root}>
        {/* Protective leaves/hands cupping the globe (mirrored left/right). */}
        <group ref={leafL} position={[0, 0, 0]}>
          <mesh geometry={extrudeProt} position={[0, 0, 0]}>
            <meshStandardMaterial ref={leafMatL} color={OLIVE} emissive={OLIVE_DEEP} emissiveIntensity={0.18} metalness={0.06} roughness={0.48} transparent />
          </mesh>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[new Float32Array(protOutline), 3]} />
            </bufferGeometry>
            <lineBasicMaterial ref={leafOutL} color={NAVY_EDGE} transparent />
          </line>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[protVein, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#3C5226" transparent opacity={0.38} />
          </line>
        </group>
        <group ref={leafR} position={[0, 0, 0]} scale={[-1, 1, 1]}>
          <mesh geometry={extrudeProt} position={[0, 0, 0]}>
            <meshStandardMaterial ref={leafMatR} color={OLIVE} emissive={OLIVE_DEEP} emissiveIntensity={0.15} metalness={0.06} roughness={0.56} transparent />
          </mesh>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[new Float32Array(protOutline), 3]} />
            </bufferGeometry>
            <lineBasicMaterial ref={leafOutR} color={NAVY_EDGE} transparent />
          </line>
          <line>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[protVein, 3]} />
            </bufferGeometry>
            <lineBasicMaterial color="#3C5226" transparent opacity={0.34} />
          </line>
        </group>

        {/* Base platform leaves. */}
        <group ref={baseGroup} position={[0, -0.42, 0]}>
          <group>
            <mesh geometry={extrudeBase} position={[0, 0, 0]}>
              <meshStandardMaterial ref={baseMatL} color={OLIVE} emissive={OLIVE_DEEP} emissiveIntensity={0.16} metalness={0.06} roughness={0.5} transparent />
            </mesh>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[new Float32Array(baseOutline), 3]} />
              </bufferGeometry>
              <lineBasicMaterial ref={baseOutL} color={NAVY_EDGE} transparent />
            </line>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[baseVein, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#3C5226" transparent opacity={0.36} />
            </line>
          </group>
          <group scale={[-1, 1, 1]}>
            <mesh geometry={extrudeBase} position={[0, 0, 0]}>
              <meshStandardMaterial ref={baseMatR} color={OLIVE} emissive={OLIVE_DEEP} emissiveIntensity={0.14} metalness={0.06} roughness={0.58} transparent />
            </mesh>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[new Float32Array(baseOutline), 3]} />
              </bufferGeometry>
              <lineBasicMaterial ref={baseOutR} color={NAVY_EDGE} transparent />
            </line>
            <line>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[baseVein, 3]} />
              </bufferGeometry>
              <lineBasicMaterial color="#3C5226" transparent opacity={0.32} />
            </line>
          </group>
        </group>

        {/* Bulb neck + ridged base (globe is the illuminated bulb). */}
        <group ref={bulb} position={[0, -0.34, 0]}>
          <mesh position={[0, 0.24, 0]}>
            <cylinderGeometry args={[0.19, 0.11, 0.26, 28]} />
            <meshStandardMaterial color={NAVY} metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.12, 0.165, 0.11, 28]} />
            <meshStandardMaterial color={NAVY} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <torusGeometry args={[0.135, 0.018, 12, 32]} />
            <meshStandardMaterial color="#223350" metalness={0.65} roughness={0.4} />
          </mesh>
          {/* Refined base grooves — alternating matte/metallic navy rings. */}
          <mesh position={[0, -0.05, 0]}>
            <torusGeometry args={[0.128, 0.012, 10, 32]} />
            <meshStandardMaterial color="#1B2C49" metalness={0.45} roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.13, 0]}>
            <torusGeometry args={[0.12, 0.012, 10, 32]} />
            <meshStandardMaterial color="#2A3D5C" metalness={0.7} roughness={0.32} />
          </mesh>
        </group>

        {/* Golden globe with lat/long grid. */}
        <group position={[0, 0.52, 0]}>
          <mesh ref={globe}>
            <sphereGeometry args={[0.5, 48, 32]} />
            <meshStandardMaterial ref={globeMat} color={GOLD} emissive={GOLD_DEEP} emissiveIntensity={0.15} metalness={0.22} roughness={0.28} />
          </mesh>
          <lineSegments ref={grid} geometry={gridGeo} visible={false}>
            <lineBasicMaterial ref={gridMat} color="#1C2B46" transparent opacity={0} />
          </lineSegments>
        </group>

        {/* Warm golden bloom behind the globe (no post-processing). */}
        <sprite ref={glowSpr} position={[0, 0.52, 0.1]} scale={[1.2, 1.2, 1]}>
          <spriteMaterial ref={glowMat} map={glowTex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>

        {/* Side sparkles. */}
        <mesh geometry={starGeo} position={[-0.98, 0.76, 0]} rotation={[0, 0, 0.5]}>
          <meshStandardMaterial ref={sparkMatL} color={NAVY} metalness={0.4} roughness={0.4} transparent opacity={0} />
        </mesh>
        <mesh geometry={starGeo} position={[0.98, 0.76, 0]} rotation={[0, 0, -0.5]}>
          <meshStandardMaterial ref={sparkMatR} color={NAVY} metalness={0.4} roughness={0.4} transparent opacity={0} />
        </mesh>
      </group>
    </>
  )
}
/** Sequential "GEO-NIUS" reveal: GEO → hyphen (energy pulse) → NIUS. */
const WORDMARK: { ch: string; delay: number; cls?: string }[] = [
  { ch: 'G', delay: 0, cls: 'geo-geo' },
  { ch: 'E', delay: 80, cls: 'geo-geo' },
  { ch: 'O', delay: 160, cls: 'geo-o' },
  { ch: '-', delay: 430, cls: 'geo-hyphen' },
  { ch: 'N', delay: 320 },
  { ch: 'I', delay: 410 },
  { ch: 'U', delay: 500 },
  { ch: 'S', delay: 590 },
]

/**
 * The brand lockup.
 *  - variant "header": compact (56px mark) for the sticky navbar.
 *  - variant "hero":   dominant (112–144px mark) hero-scale presence.
 * The orthographic zoom is derived from the rendered canvas size so the
 * composition always fills it without clipping, at any breakpoint.
 */
export default function Logo({ variant = 'header' }: { variant?: 'header' | 'hero' } = {}) {
  const reduced = usePrefersReducedMotion()
  const wrap = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState(false)
  const [inView, setInView] = useState(true)
  const [wide, setWide] = useState(false)
  const pointer = useRef({ x: 0, y: 0 })
  const hero = variant === 'hero'

  // Track the sm breakpoint so the hero mark scales cleanly.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    setWide(mq.matches)
    const fn = (e: MediaQueryListEvent) => setWide(e.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  // Pause GPU rendering while this lockup is off-screen.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      setInView(entries[0].isIntersecting)
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = wrap.current
    if (!el || reduced) return
    const r = el.getBoundingClientRect()
    pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1
    pointer.current.y = ((e.clientY - r.top) / r.height) * 2 - 1
  }

  // Composition spans ~2.3 world units; zoom = px / span keeps it unclipped.
  const canvasPx = hero ? (wide ? 144 : 112) : 56
  const zoom = canvasPx / 2.35

  const textCls = hero
    ? 'text-2xl sm:text-3xl md:text-4xl font-bold tracking-[0.24em]'
    : 'text-base sm:text-lg font-semibold tracking-[0.2em]'

  return (
    <div
      ref={wrap}
      className={`logo-lockup flex select-none items-center ${hero ? 'gap-5 sm:gap-7' : 'gap-3'}`}
      onPointerMove={onMove}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        setHover(false)
        pointer.current = { x: 0, y: 0 }
      }}
    >
      <div className={`relative shrink-0 ${hero ? 'h-28 w-28 sm:h-36 sm:w-36 md:h-36 md:w-36' : 'h-14 w-14'}`}>
        {/* Atmospheric halo — pure light behind the mark, never a box. */}
        <div className="logo-halo" aria-hidden="true" />
        <Canvas
          orthographic
          dpr={[1, 2]}
          frameloop={inView ? 'always' : 'never'}
          camera={{ zoom, position: [0, 0, 6], near: 0.1, far: 30 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
          style={{ pointerEvents: 'none', touchAction: 'none', position: 'relative' }}
          aria-hidden="true"
        >
          <GeoScene reduced={reduced} hover={hover} pointer={pointer} />
        </Canvas>
      </div>

      <div className={`geo-word whitespace-nowrap leading-none font-sans ${textCls} text-white`} aria-label="GEO-NIUS" role="img">
        {WORDMARK.map(({ ch, delay, cls }) => (
          <span
            key={ch + String(delay)}
            className={`${reduced ? '' : 'geo-char'} ${cls ?? ''}`}
            style={reduced ? undefined : { animationDelay: `${delay}ms` }}
          >
            {ch}
          </span>
        ))}
      </div>
    </div>
  )
}