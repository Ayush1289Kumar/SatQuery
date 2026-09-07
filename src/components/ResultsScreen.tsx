import { useState } from 'react'
import type { AnalysisResult, MapLayer, UploadedImage } from '../types'
import { HIGHLIGHT_LEGEND, HIGHLIGHT_COLORS } from '../data/mock'
import { downloadReport } from '../lib/report'
import MapView from './MapView'
import { Button, Card, Badge } from './ui'

interface ResultsScreenProps {
  images: UploadedImage[]
  question: string
  result: AnalysisResult
  onRestart: () => void
  /** Visual-only: immersive aquatic environment for water/flood analyses. */
  water?: boolean
  /** Aquatic identity: 'azure' = flood extent, 'teal' = water mapping. */
  variant?: 'azure' | 'teal'
}

const LOW_CONFIDENCE = 0.6

/* Pastel aqua legend palette for water mode — categories keep meaningful distinction. */
const WATER_LEGEND_COLORS: Record<string, string> = {
  water: '#7FD4EA',
  flood: '#F5A97E',
  built: '#E08D8D',
  vegetation: '#7FD6A8',
  land: '#E5C48A',
}

export default function ResultsScreen({ images, question, result, onRestart, water = false, variant = 'azure' }: ResultsScreenProps) {
  const accent = variant === 'teal' ? '#7FE0D6' : '#7FD4EA'
  const [view, setView] = useState<'all' | number>('all')
  const lowConfidence = result.confidence < LOW_CONFIDENCE
  const pct = (result.confidence * 100).toFixed(0)

  const displayLayers: MapLayer[] =
    view === 'all'
      ? result.layers
      : result.layers
          .map((l, i) => (i === view ? { ...l, opacity: 1 } : { ...l, opacity: 1, highlights: [] }))
          .filter((l) => l.highlights.length > 0)

  return (
    <>
      {water && (
        <div aria-hidden className={`water-env ${variant === 'teal' ? 'water--teal' : 'water--indigo'}`}>
          <div className="water-base" />
          <div className="water-blob water-blob-a" />
          <div className="water-blob water-blob-b" />
          <div className="water-blob water-blob-c" />
          <div className="water-mist" />
          <div className="water-contours" />
          <div className="water-grain" />
          <div className="water-spot" />
          <div className="water-caustics" />
          <div className="water-mote water-mote-1" />
          <div className="water-mote water-mote-2" />
          <div className="water-mote water-mote-3" />
          <div className="water-mote water-mote-4" />
        </div>
      )}
      <div className={`grid gap-6 lg:grid-cols-[1.6fr_1fr] ${water ? `wr-root ${variant === 'teal' ? 'water--teal' : 'water--indigo'}` : ''}`}>
      {/* Left: map evidence */}
      <div className="space-y-4">
        <div className={water ? 'water-panel wr-map overflow-hidden rounded-2xl' : 'overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)]'}>
          {/* Map header */}
          <div className={`flex items-center justify-between px-4 py-3 ${water ? 'wr-map-head' : 'border-b border-[rgba(255,255,255,0.08)]'}`}>
            <div className="flex items-center gap-3">
              <h3 className={`text-sm font-semibold ${water ? 'wr-title' : 'text-white'}`}>Map Evidence</h3>
              <div className="hidden sm:flex items-center gap-2.5">
                {result.layers.map((l, i) => (
                  <span key={l.id} className={`flex items-center gap-1.5 text-xs ${water ? 'wr-date' : 'text-[rgba(255,255,255,0.45)]'}`}>
                    <span
                      className="h-2 w-2 rounded-full shadow-[0_0_6px_currentColor]"
                      style={{ background: water ? (i === 0 ? accent : '#F0A075') : layerColor(l, i) }}
                    />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {result.layers.length > 1 && (
                <select
                  value={view === 'all' ? 'all' : String(view)}
                  onChange={(e) => {
                    const v = e.target.value
                    setView(v === 'all' ? 'all' : Number(v))
                  }}
                  className={`rounded-lg px-2.5 py-1.5 text-xs focus:outline-none ${water ? 'wr-select' : 'border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.65)] focus:border-[rgba(var(--primary-rgb),0.40)] focus:bg-[rgba(var(--primary-rgb),0.08)]'}`}
                  aria-label="Compare layer"
                >
                  <option value="all" className="bg-[#080b1c]">Compare (all)</option>
                  {result.layers.map((l, i) => (
                    <option key={l.id} value={i} className="bg-[#080b1c]">
                      {l.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="relative">
            <MapView layers={displayLayers} heightClass="h-72 md:h-96" />
            {water && <div aria-hidden className="wr-map-overlay" />}
          </div>
        </div>

        {/* Legend */}
        <Card className={water ? 'wr-legend' : ''}>
          <h4 className={`text-[11px] font-semibold uppercase tracking-widest ${water ? 'wr-label' : 'text-[rgba(255,255,255,0.35)]'}`}>
            Layer Legend
          </h4>
          <div className="mt-3 flex flex-wrap gap-3">
            {HIGHLIGHT_LEGEND.map((l) => (
              <span key={l.type} className={`flex items-center gap-2 text-xs ${water ? 'wr-date' : 'text-[rgba(255,255,255,0.55)]'}`}>
                <span
                  className="h-3 w-3 rounded-sm shadow-[0_0_8px_currentColor]"
                  style={{ background: water ? WATER_LEGEND_COLORS[l.type] : HIGHLIGHT_COLORS[l.type] }}
                />
                {l.label}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Right: analysis panel */}
      <div className="space-y-4">
        {/* Low-confidence warning */}
        {lowConfidence && (
          <div className="rounded-xl border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.10)] p-4 text-sm text-[rgba(255,255,255,0.75)]">
            <div className="flex items-start gap-2.5">
              <span className="text-base">⚠️</span>
              <div>
                <span className="font-semibold text-[#f59e0b]">Low confidence</span>
                <p className="mt-0.5 text-xs text-[rgba(255,255,255,0.50)]">
                  Please verify this result with ground-truth data before acting.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Result card */}
        <Card glow="blue" className={water ? 'wr-result' : ''}>
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-semibold ${water ? 'wr-title' : 'text-white'}`}>Analysis Result</h3>
            <Badge color={water ? 'cyan' : lowConfidence ? 'amber' : 'green'} className={water ? 'wr-badge' : ''}>
              {lowConfidence ? '⚠' : '✓'} {pct}% confidence
            </Badge>
          </div>
          <p className={`mt-4 text-sm leading-relaxed ${water ? 'wr-body' : 'text-[rgba(255,255,255,0.65)]'}`}>{result.answer}</p>

          {/* Question reference */}
          <div className={`mt-4 rounded-lg px-3.5 py-2.5 ${water ? 'wr-inset' : 'border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)]'}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-widest ${water ? 'wr-label' : 'text-[rgba(255,255,255,0.30)]'}`}>Query</p>
            <p className={`mt-1 text-xs italic ${water ? 'wr-date' : 'text-[rgba(255,255,255,0.55)]'}`}>&ldquo;{question}&rdquo;</p>
          </div>
        </Card>

        {/* Workflow details */}
        <details className={water ? 'water-panel wr-details overflow-hidden' : 'glass-card overflow-hidden'}>
          <summary className="cursor-pointer select-none px-5 py-3.5 text-sm font-semibold transition-colors list-none flex items-center justify-between">
            <span className={water ? 'wr-body font-semibold' : 'text-[rgba(255,255,255,0.70)] hover:text-white'}>Model & Workflow</span>
            <span className={water ? 'wr-label text-xs' : 'text-[rgba(255,255,255,0.30)] text-xs'}>▾</span>
          </summary>
          <div className={`px-5 py-4 ${water ? 'wr-details-body' : 'border-t border-[rgba(255,255,255,0.07)]'}`}>
            <p className={`text-sm font-medium ${water ? 'wr-body' : 'text-[rgba(255,255,255,0.65)]'}`}>{result.workflowLabel}</p>
            <div className="mt-3 flex flex-col gap-2">
              {result.modelNames.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]"
                    style={water ? { background: '#7FD4EA', color: '#7FD4EA' } : undefined}
                  />
                  <span className={`font-mono text-xs ${water ? 'wr-date' : 'text-[rgba(255,255,255,0.50)]'}`}>{m}</span>
                </div>
              ))}
            </div>
            <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 ${water ? 'wr-inset' : 'border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]'}`}>
              <span className={`text-[11px] ${water ? 'wr-label' : 'text-[rgba(255,255,255,0.35)]'}`}>Processing time</span>
              <span className="ml-auto font-mono text-xs" style={water ? { color: variant === 'teal' ? '#9BF2E9' : '#9BE4FF' } : undefined}> {result.usageTimeSec.toFixed(1)}s</span>
            </div>
          </div>
        </details>

        {/* Image chips */}
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <span
              key={img.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${water ? 'wr-chip' : 'border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.45)]'}`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor]"
                style={water ? { background: '#7FD4EA', color: '#7FD4EA' } : undefined}
              />
              {img.name.split('.')[0]}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Button onClick={() => downloadReport(images, question, result)} className={water ? 'wr-btn-primary' : ''}>
            ↓ Download Report
          </Button>
          <Button variant="secondary" onClick={onRestart} className={water ? 'wr-btn-ghost' : ''}>
            ← New Analysis
          </Button>
        </div>
      </div>
      </div>
    </>
  )
}

function layerColor(layer: MapLayer, index: number): string {
  if (layer.highlights.length === 0) return 'rgba(255,255,255,0.20)'
  const t = layer.highlights[0].type
  return index === 0 ? HIGHLIGHT_COLORS[t] : HIGHLIGHT_COLORS[t] + 'aa'
}