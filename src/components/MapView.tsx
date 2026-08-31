import { useEffect, useRef } from 'react'
import L from 'leaflet'
import type { Highlight, MapLayer } from '../types'
import { HIGHLIGHT_COLORS } from '../data/mock'

interface MapViewProps {
  layers: MapLayer[]
  heightClass?: string
}

/**
 * A Leaflet map that renders analysis highlight layers as overlays.
 * Layers with lower opacity are drawn on top so a before/after blend works
 * (set the "after" layer opacity < 1 to fade it over the "before" layer).
 */
export default function MapView({ layers, heightClass = 'h-64 md:h-96' }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Init map once.
  useEffect(() => {
    const el = containerRef.current
    if (!el || mapRef.current) return

    const map = L.map(el, { zoomControl: false }).setView([19.05, 72.92], 12)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Render layers whenever highlights change, honouring opacity for blending.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const toRemove = new L.LayerGroup().addTo(map)
    layers.forEach((layer) => {
      const color = (t: Highlight['type']) => HIGHLIGHT_COLORS[t] ?? '#0f6bff'
      const opacity = layer.opacity

      layer.highlights.forEach((h) => {
        const poly = L.polygon(h.coords as L.LatLngExpression[], {
          color: color(h.type),
          weight: 2,
          opacity: Math.max(0.4, opacity),
          fillColor: color(h.type),
          fillOpacity: opacity * 0.42,
        })
        poly
          .bindPopup(
            `<b>${h.label}</b><br/>Type: ${h.type}<br/>Confidence: ${(
              h.confidence * 100
            ).toFixed(0)}%`,
          )
          .bindTooltip(h.label, { sticky: true })
        poly.addTo(toRemove)
      })
    })

    return () => {
      map.removeLayer(toRemove)
    }
  }, [layers])

  return <div ref={containerRef} className={heightClass} />
}