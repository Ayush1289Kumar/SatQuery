import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { ArrowDown } from 'lucide-react'
import Logo from './Logo'

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

    // True satellite imagery basemap (free, no API key) — raw land cover
    // and terrain pixels only, no roads, borders or place labels.
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 10,
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
      },
    ).addTo(map)

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
        style={{ filter: 'saturate(1.15) brightness(0.8) contrast(1.08)' }}
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

      {/* Brand lockup, top-left — same scale as the header branding */}
      <div className="absolute left-6 top-6 z-10 flex items-center sm:left-10 sm:top-8">
        <Logo />
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
