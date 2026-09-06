import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { CityData } from '../data/indiaMockData'

interface RegionMapProps {
  activeCity: CityData | null
  /** Parent state name, used to disambiguate common city names in the geocoding query. */
  activeStateName?: string | null
  className?: string
}

const INDIA_CENTER: [number, number] = [22.9, 79.5]
const INDIA_ZOOM = 4.3

// --- Real boundary lookup (OpenStreetMap Nominatim) -------------------------
// Nominatim's public search API can return an actual surveyed administrative
// boundary polygon for a place name (not just a point) via `polygon_geojson=1`.
// This runs client-side in the browser at request time — we don't ship any
// boundary data ourselves. Results are cached per session so re-selecting a
// city doesn't re-hit the API. Fine for light/demo traffic; a production
// deployment should move this to a server-side proxy with its own caching,
// per Nominatim's usage policy.
const boundaryCache = new Map<string, GeoJSON.Geometry | null>()

async function fetchCityBoundary(
  cityName: string,
  stateName: string | null | undefined,
  signal: AbortSignal,
): Promise<GeoJSON.Geometry | null> {
  const key = `${cityName}|${stateName ?? ''}`
  if (boundaryCache.has(key)) return boundaryCache.get(key)!

  const query = [cityName, stateName, 'India'].filter(Boolean).join(', ')
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&limit=1&q=${encodeURIComponent(query)}`

  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`Nominatim ${res.status}`)
    const results = await res.json()
    const geometry: GeoJSON.Geometry | null =
      results?.[0]?.geojson && (results[0].geojson.type === 'Polygon' || results[0].geojson.type === 'MultiPolygon')
        ? results[0].geojson
        : null
    boundaryCache.set(key, geometry)
    return geometry
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      boundaryCache.set(key, null)
    }
    return null
  }
}

// --- Fallback: deterministic organic outline --------------------------------
// Used only when Nominatim has no boundary for a place (small towns, or the
// request failed/was rate-limited) — an irregular polygon around the city's
// center so it still reads as "an outlined area" rather than nothing at all.
function hashSeed(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function approximateCityBoundary(lat: number, lng: number, seed: number, baseRadiusKm = 6): [number, number][] {
  const rand = mulberry32(seed)
  const points: [number, number][] = []
  const pointCount = 16
  const kmToLat = 1 / 111
  const kmToLng = 1 / (111 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * Math.PI * 2
    const radiusKm = baseRadiusKm * (0.65 + rand() * 0.65)
    points.push([lat + Math.sin(angle) * radiusKm * kmToLat, lng + Math.cos(angle) * radiusKm * kmToLng])
  }
  return points
}

/**
 * Compact, embeddable version of the earthy Leaflet map used on the landing
 * screen. Flies to whichever city is selected in StateCityPanel and outlines
 * its real administrative boundary (fetched live from OpenStreetMap), falling
 * back to an approximate outline only if no boundary data is available.
 */
export default function RegionMap({ activeCity, activeStateName, className = '' }: RegionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)
  const highlightRef = useRef<L.Layer | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    const map = L.map(el, {
      zoomControl: false,
      minZoom: 4,
      maxZoom: 16,
    }).setView(INDIA_CENTER, INDIA_ZOOM)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics | Boundaries &copy; OpenStreetMap contributors',
      },
    ).addTo(map)

    mapRef.current = map
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const controller = new AbortController()

    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    if (highlightRef.current) {
      highlightRef.current.remove()
      highlightRef.current = null
    }

    if (!activeCity) {
      map.flyTo(INDIA_CENTER, INDIA_ZOOM, { duration: 1.1 })
      return () => controller.abort()
    }

    const [lng, lat] = activeCity.coordinates
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#94a179'
    map.flyTo([lat, lng], 12, { duration: 1.2 })

    const marker = L.circleMarker([lat, lng], {
      radius: 6,
      color: '#ffffff',
      weight: 2,
      fillColor: accent,
      fillOpacity: 0.95,
    }).addTo(map)
    marker.bindTooltip(`${activeCity.name} · locating boundary…`, {
      permanent: true,
      direction: 'top',
      offset: [0, -10],
    })
    markerRef.current = marker

    fetchCityBoundary(activeCity.name, activeStateName, controller.signal).then((geometry) => {
      if (controller.signal.aborted || mapRef.current !== map) return

      marker.setTooltipContent(activeCity.name)

      if (geometry) {
        // Real, surveyed administrative boundary from OpenStreetMap.
        const layer = L.geoJSON(geometry, {
          style: {
            color: accent,
            weight: 2.5,
            opacity: 0.95,
            fillColor: accent,
            fillOpacity: 0.14,
          },
        }).addTo(map)
        highlightRef.current = layer
        const bounds = layer.getBounds()
        if (bounds.isValid()) map.flyToBounds(bounds, { padding: [48, 48], duration: 0.9, maxZoom: 14 })
      } else {
        // No boundary on record for this place — fall back to an
        // approximate outline rather than showing nothing.
        const boundary = approximateCityBoundary(lat, lng, hashSeed(activeCity.id), 6)
        const layer = L.polygon(boundary, {
          color: accent,
          weight: 2,
          opacity: 0.75,
          fillColor: accent,
          fillOpacity: 0.12,
          dashArray: '6 5',
          smoothFactor: 1.5,
        }).addTo(map)
        highlightRef.current = layer
      }
    })

    return () => controller.abort()
  }, [activeCity, activeStateName])

  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ filter: 'saturate(1.15) brightness(0.82) contrast(1.08)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 45%, rgba(10,12,8,0.55) 100%)' }}
      />
    </div>
  )
}
