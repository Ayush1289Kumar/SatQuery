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
}

const LOW_CONFIDENCE = 0.6

export default function ResultsScreen({ images, question, result, onRestart }: ResultsScreenProps) {
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
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      {/* Left: map evidence */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)]">
          {/* Map header */}
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white">Map Evidence</h3>
              <div className="hidden sm:flex items-center gap-2.5">
                {result.layers.map((l, i) => (
                  <span key={l.id} className="flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.45)]">
                    <span
                      className="h-2 w-2 rounded-full shadow-[0_0_6px_currentColor]"
                      style={{ background: layerColor(l, i) }}
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
                  className="rounded-lg border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] px-2.5 py-1.5 text-xs text-[rgba(255,255,255,0.65)] focus:outline-none focus:border-[rgba(59,130,246,0.40)] focus:bg-[rgba(59,130,246,0.08)]"
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
          <MapView layers={displayLayers} heightClass="h-72 md:h-96" />
        </div>

        {/* Legend */}
        <Card>
          <h4 className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.35)]">
            Layer Legend
          </h4>
          <div className="mt-3 flex flex-wrap gap-3">
            {HIGHLIGHT_LEGEND.map((l) => (
              <span key={l.type} className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.55)]">
                <span
                  className="h-3 w-3 rounded-sm shadow-[0_0_8px_currentColor]"
                  style={{ background: HIGHLIGHT_COLORS[l.type] }}
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
        <Card glow="blue">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Analysis Result</h3>
            <Badge color={lowConfidence ? 'amber' : 'green'}>
              {lowConfidence ? '⚠' : '✓'} {pct}% confidence
            </Badge>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[rgba(255,255,255,0.65)]">{result.answer}</p>

          {/* Question reference */}
          <div className="mt-4 rounded-lg border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-3.5 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.30)]">Query</p>
            <p className="mt-1 text-xs text-[rgba(255,255,255,0.55)] italic">&ldquo;{question}&rdquo;</p>
          </div>
        </Card>

        {/* Workflow details */}
        <details className="glass-card overflow-hidden">
          <summary className="cursor-pointer select-none px-5 py-3.5 text-sm font-semibold text-[rgba(255,255,255,0.70)] hover:text-white transition-colors list-none flex items-center justify-between">
            <span>Model & Workflow</span>
            <span className="text-[rgba(255,255,255,0.30)] text-xs">▾</span>
          </summary>
          <div className="border-t border-[rgba(255,255,255,0.07)] px-5 py-4">
            <p className="text-sm font-medium text-[rgba(255,255,255,0.65)]">{result.workflowLabel}</p>
            <div className="mt-3 flex flex-col gap-2">
              {result.modelNames.map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3b82f6] shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                  <span className="font-mono text-xs text-[rgba(255,255,255,0.50)]">{m}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] px-3 py-2">
              <span className="text-[11px] text-[rgba(255,255,255,0.35)]">Processing time</span>
              <span className="ml-auto font-mono text-xs text-[#22d3ee]">{result.usageTimeSec.toFixed(1)}s</span>
            </div>
          </div>
        </details>

        {/* Image chips */}
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <span
              key={img.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs text-[rgba(255,255,255,0.45)]"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${img.kind === 'sar' ? 'bg-[#22d3ee]' : 'bg-[#3b82f6]'}`} />
              {img.name.split('.')[0]}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Button onClick={() => downloadReport(images, question, result)}>
            ↓ Download Report
          </Button>
          <Button variant="secondary" onClick={onRestart}>
            ← New Analysis
          </Button>
        </div>
      </div>
    </div>
  )
}

function layerColor(layer: MapLayer, index: number): string {
  if (layer.highlights.length === 0) return 'rgba(255,255,255,0.20)'
  const t = layer.highlights[0].type
  return index === 0 ? HIGHLIGHT_COLORS[t] : HIGHLIGHT_COLORS[t] + 'aa'
}