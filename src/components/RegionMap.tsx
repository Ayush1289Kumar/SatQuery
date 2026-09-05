import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { CityData } from '../data/indiaMockData'

interface RegionMapProps {
  activeCity: CityData | null
  className?: string
}

const INDIA_CENTER: [number, number] = [22.9, 79.5]
const INDIA_ZOOM = 4.3

/**
 * Compact, embeddable version of the earthy Leaflet map used on the
 * landing screen. Replaces the old low-res react-simple-maps dot map.
 * Flies to and marks whichever city is selected in StateCityPanel.
 */
export default function RegionMap({ activeCity, className = '' }: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    const map = L.map(el, {
      zoomControl: false,
      minZoom: 4,
      maxZoom: 12,
    }).setView(INDIA_CENTER, INDIA_ZOOM)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 12,
      attribution: '&copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)',
      subdomains: 'abc',
    }).addTo(map)

    mapRef.current = map
    // Leaflet sometimes measures the container before layout settles
    // inside a grid/flex parent — nudge it once after mount.
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Fly to + mark the selected city; return to the India-wide view otherwise.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    if (activeCity) {
      const [lng, lat] = activeCity.coordinates
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#94a179'
      map.flyTo([lat, lng], 8, { duration: 1.1 })
      const marker = L.circleMarker([lat, lng], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: accent,
        fillOpacity: 0.9,
      }).addTo(map)
      marker.bindTooltip(activeCity.name, { permanent: true, direction: 'top', offset: [0, -10] })
      markerRef.current = marker
    } else {
      map.flyTo(INDIA_CENTER, INDIA_ZOOM, { duration: 1.1 })
    }
  }, [activeCity])

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ filter: 'sepia(0.45) saturate(1.4) hue-rotate(-8deg) brightness(0.62) contrast(1.05)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(10,12,8,0.55) 100%)' }}
      />
    </div>
  )
}
