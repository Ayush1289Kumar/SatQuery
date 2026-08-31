import { useState } from 'react'
import type { AnalysisResult, MapLayer, UploadedImage } from '../types'
import { HIGHLIGHT_LEGEND, HIGHLIGHT_COLORS } from '../data/mock'
import { downloadReport } from '../lib/report'
import MapView from './MapView'
import { Button, Card } from './ui'

interface ResultsScreenProps {
  images: UploadedImage[]
  question: string
  result: AnalysisResult
  onRestart: () => void
}

const LOW_CONFIDENCE = 0.6

export default function ResultsScreen({ images, question, result, onRestart }: ResultsScreenProps) {
  const [view, setView] = useState<'all' | number>('all')
  const lowConfidence = result.confidence < LOW_CONFIDENCE
  const pct = (result.confidence * 100).toFixed(0)

  // Build the layer set shown in the map. "all" blends every layer
  // (before/after overlay); selecting a value isolates one layer.
  const displayLayers: MapLayer[] =
    view === 'all'
      ? result.layers
      : result.layers
          .map((l, i) => (i === view ? { ...l, opacity: 1 } : { ...l, opacity: 1, highlights: [] }))
          .filter((l) => l.highlights.length > 0)

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Left: map evidence + layers */}
      <div className="space-y-4">
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-edge px-4 py-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-ink-900">Map evidence</h3>
              <div className="hidden sm:flex items-center gap-2 text-xs text-ink-500">
                {result.layers.map((l, i) => (
                  <span key={l.id} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ background: layerColor(l, i) }} />
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
                  className="rounded-md border border-edge bg-surface-50 px-2 py-1 text-xs text-ink-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  aria-label="Compare layer"
                >
                  <option value="all">Compare (all)</option>
                  {result.layers.map((l, i) => (
                    <option key={l.id} value={i}>
                      {l.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <MapView layers={displayLayers} heightClass="h-72 md:h-96" />
        </Card>

        {/* Legend */}
        <Card>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Legend</h4>
          <div className="mt-2 flex flex-wrap gap-3">
            {HIGHLIGHT_LEGEND.map((l) => (
              <span key={l.type} className="flex items-center gap-1.5 text-xs text-ink-600">
                <span className="h-3 w-3 rounded-sm" style={{ background: HIGHLIGHT_COLORS[l.type] }} />
                {l.label}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Right: answer panel */}
      <div className="space-y-4">
        {lowConfidence && (
          <div className="rounded-xl border border-warning/40 bg-amber-50 p-4 text-sm text-amber-800">
            <span className="font-semibold">Low confidence.</span> Please verify this result with ground data
            before acting.
          </div>
        )}

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">Result</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                lowConfidence ? 'bg-amber-100 text-amber-800' : 'bg-success/15 text-success'
              }`}
            >
              {pct}% confidence
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">{result.answer}</p>
        </Card>

        {/* Workflow summary */}
        <details className="rounded-xl bg-surface-50 shadow-card ring-1 ring-edge">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-ink-800">
            Model &amp; workflow
          </summary>
          <div className="border-t border-edge px-4 py-3 text-xs text-ink-500">
            <p className="font-medium text-ink-700">{result.workflowLabel}</p>
            <div className="mt-2 flex flex-col gap-1">
              {result.modelNames.map((m) => (
                <span key={m} className="font-mono">{m}</span>
              ))}
            </div>
            <p className="mt-2">Processing time: {result.usageTimeSec.toFixed(1)}s</p>
          </div>
        </details>

        <div className="flex flex-col gap-2">
          <Button onClick={() => downloadReport(images, question, result)}>Download report</Button>
          <Button variant="secondary" onClick={onRestart}>← New analysis</Button>
        </div>
      </div>
    </div>
  )
}

function layerColor(layer: MapLayer, index: number): string {
  if (layer.highlights.length === 0) return '#94a3b8'
  const t = layer.highlights[0].type
  return index === 0 ? HIGHLIGHT_COLORS[t] : HIGHLIGHT_COLORS[t] + 'aa'
}