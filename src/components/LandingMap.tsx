import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { Satellite, ArrowDown } from 'lucide-react'

interface LandingMapProps {
  onGetStarted: () => void
}

/**
 * Full-viewport, zoomable/pannable physical map of India used as the
 * app's first screen. Built on the same raw-Leaflet pattern as MapView,
 * but tinted toward the earthy "moss-forestry" palette and framed with
 * a headline + bottom "Get Started" CTA (Wildwoods-Forestry-style hero).
 */
export default function LandingMap({ onGetStarted }: LandingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    const map = L.map(el, {
      zoomControl: false,
      minZoom: 4,
      maxZoom: 10,
      worldCopyJump: false,
    }).setView([22.9, 79.5], 5)

    // Loosely keep the view anchored on the subcontinent while still
    // letting people pan/zoom to explore it.
    map.setMaxBounds(L.latLngBounds([2, 55], [40, 105]))

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Physical/terrain basemap (free, no API key) — reads as a real
    // topographic map rather than a generic street map.
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 10,
      attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)',
      subdomains: 'abc',
    }).addTo(map)

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[var(--color-surface)]">
      {/* The map itself, tinted earthy via a CSS filter on its own layer
          so controls/markers added later aren't forced through the filter. */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ filter: 'sepia(0.45) saturate(1.4) hue-rotate(-8deg) brightness(0.6) contrast(1.05)' }}
        aria-hidden
      />

      {/* Vignette so text stays legible over the map at any pan position. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 35%, rgba(10,12,8,0.55) 100%), linear-gradient(to bottom, rgba(10,12,8,0.65) 0%, transparent 22%, transparent 65%, rgba(10,12,8,0.85) 100%)',
        }}
      />

      {/* Brand lockup, top-left */}
      <div className="pointer-events-none absolute left-6 top-6 z-10 flex items-center gap-3 sm:left-10 sm:top-8">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-violet)] shadow-[0_0_20px_-4px_var(--color-primary-glow)]">
          <Satellite className="h-4.5 w-4.5 text-black/80" strokeWidth={2.25} />
        </div>
        <div>
          <span className="font-display text-lg font-semibold tracking-tight text-white">SatQuery</span>
          <span className="ml-1 font-display text-lg font-light text-white/45">AI</span>
        </div>
      </div>

      {/* Headline, centered */}
      <div className="pointer-events-none absolute inset-x-0 top-[30%] z-10 flex flex-col items-center px-6 text-center sm:top-[34%]">
        <span className="mb-4 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-primary)]">
          India &middot; Satellite Intelligence
        </span>
        <h1 className="max-w-3xl font-display text-4xl font-medium leading-[1.15] text-white sm:text-6xl">
          Purposeful, evidence-based
          <br />
          <span className="italic text-[var(--color-primary)]">land &amp; disaster</span> intelligence.
        </h1>
        <p className="mt-5 max-w-xl text-sm font-light leading-relaxed text-white/70 sm:text-base">
          Explore the subcontinent, ask a satellite image a plain-English question,
          and get an answer backed by visual proof on the map.
        </p>
      </div>

      {/* Get Started CTA, bottom-center */}
      <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 flex flex-col items-center gap-3 sm:bottom-14">
        <button
          onClick={onGetStarted}
          className="pointer-events-auto group flex items-center gap-2.5 rounded-full border border-[var(--color-primary-glow)] bg-black/30 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-xl transition-all duration-300 hover:bg-[var(--color-primary)] hover:text-black hover:shadow-[0_0_40px_-4px_var(--color-primary-glow)]"
        >
          Get Started
          <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
        </button>
        <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/40">
          Scroll, drag or pinch the map to explore
        </span>
      </div>
    </div>
  )
}
