import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

/**
 * Decorative animated aurora backdrop drawn on a plain 2D canvas.
 * Intentionally subtle (low-alpha radial blobs) so it stays calm on a light,
 * high-contrast surface. Paused (single static frame) under reduced motion.
 * Accessible as decorative only — `aria-hidden`, never focusable.
 */
export default function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = true

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = canvas
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // Three drifting color sources: primary blue, soft violet, clean teal.
    const blobs = [
      { r: 120, g: 180, b: 255, baseX: 0.2, baseY: 0.25, amp: 0.12, speed: 0.00016, radius: 0.5 },
      { r: 190, g: 190, b: 255, baseX: 0.8, baseY: 0.1, amp: 0.1, speed: 0.00012, radius: 0.45 },
      { r: 120, g: 225, b: 210, baseX: 0.55, baseY: 0.85, amp: 0.14, speed: 0.0002, radius: 0.42 },
    ]

    const draw = (t: number) => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      ctx.clearRect(0, 0, w, h)

      blobs.forEach((b) => {
        const cx = w * (b.baseX + Math.sin(t * b.speed) * b.amp)
        const cy = h * (b.baseY + Math.cos(t * b.speed * 1.3) * b.amp)
        const r = Math.max(w, h) * b.radius
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        grad.addColorStop(0, `rgba(${b.r}, ${b.g}, ${b.b}, 0.16)`)
        grad.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, w, h)
      })
    }

    if (reduced) {
      // Single static frame, no animation loop.
      resize()
      draw(0)
      return
    }

    resize()
    const start = performance.now()
    const loop = (now: number) => {
      if (!running) return
      draw(now - start)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    const onResize = () => {
      resize()
    }
    window.addEventListener('resize', onResize)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced])

  return (
    <canvas
      ref={canvasRef}
      className="ambient-canvas"
      aria-hidden="true"
      role="presentation"
      tabIndex={-1}
    />
  )
}