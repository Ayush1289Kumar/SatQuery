import { useCallback, useState } from 'react'
import type { UploadMode, UploadedImage } from '../types'
import { DEMO_SCENARIOS, type DemoScenario } from '../data/mock'
import { Button, Card } from './ui'

const MODES: { id: UploadMode; label: string; desc: string; slots: number; icon: string }[] = [
  { id: 'single',     label: 'Single Image',     desc: 'One optical satellite image',  slots: 1, icon: '🛰' },
  { id: 'twoDate',    label: 'Compare Dates',     desc: 'Same area, two time points',   slots: 2, icon: '📅' },
  { id: 'opticalSar', label: 'Optical + SAR',     desc: 'Fused multi-sensor analysis',  slots: 2, icon: '🔬' },
]

const MODE_LABEL: Record<UploadMode, string> = {
  single: 'Single Image',
  twoDate: 'Compare Dates',
  opticalSar: 'Optical + SAR',
}

interface UploadScreenProps {
  mode: UploadMode
  images: UploadedImage[]
  onSelectMode: (m: UploadMode) => void
  onAddImages: (imgs: UploadedImage[]) => void
  onRemoveImage: (id: string) => void
  onContinue: () => void
  onRunScenario: (s: DemoScenario) => void
}

export default function UploadScreen({
  mode,
  images,
  onSelectMode,
  onAddImages,
  onRemoveImage,
  onContinue,
  onRunScenario,
}: UploadScreenProps) {
  const [dragging, setDragging] = useState(false)
  const required = MODES.find((m) => m.id === mode)?.slots ?? 1

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const next: UploadedImage[] = Array.from(fileList).slice(0, required).map((f, i) => ({
        id: `${Date.now()}-${i}-${f.name}`,
        name: f.name,
        kind: mode === 'opticalSar' && i === 1 ? 'sar' : 'optical',
        date: undefined,
        location: undefined,
        previewUrl: URL.createObjectURL(f),
      }))
      onAddImages(next)
    },
    [required, mode, onAddImages],
  )

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left: Upload card */}
      <Card className="lg:col-span-2">
        {/* Section header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(var(--primary-rgb),0.18)] border border-[rgba(var(--primary-rgb),0.30)]">
            <span className="text-sm">①</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Upload Satellite Image</h2>
            <p className="text-xs text-[rgba(255,255,255,0.45)]">Choose an analysis mode, then drop your imagery.</p>
          </div>
        </div>

        {/* Mode picker */}
        <div className="grid gap-2.5 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              aria-pressed={mode === m.id}
              className={`group relative rounded-xl border p-4 text-left transition-all duration-200 ease-out ${
                mode === m.id
                  ? 'border-[rgba(var(--primary-rgb),0.50)] bg-[rgba(var(--primary-rgb),0.12)] shadow-[0_0_20px_-6px_rgba(var(--primary-rgb),0.50)]'
                  : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {mode === m.id && (
                <div className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_6px_rgba(var(--primary-rgb),0.9)]" />
              )}
              <div className="text-xl mb-2">{m.icon}</div>
              <div className={`text-sm font-semibold ${mode === m.id ? 'text-[var(--color-primary)]' : 'text-[rgba(255,255,255,0.80)]'}`}>
                {m.label}
              </div>
              <div className="mt-0.5 text-xs text-[rgba(255,255,255,0.40)]">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Drop zones */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: required }).map((_, i) => {
            const img = images[i]
            const label =
              mode === 'opticalSar'
                ? i === 0 ? 'Optical Band' : 'SAR Band'
                : i === 0 ? 'Image (Earlier Date)' : 'Image (Later Date)'
            return (
              <div key={`${mode}-${i}`}>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.35)]">
                  {label}
                </div>
                {img ? (
                  <div className="flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] p-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold ${
                        img.kind === 'sar'
                          ? 'bg-[rgba(var(--cyan-rgb),0.15)] text-[var(--color-cyan)] border border-[rgba(var(--cyan-rgb),0.25)]'
                          : 'bg-[rgba(var(--primary-rgb),0.15)] text-[var(--color-primary)] border border-[rgba(var(--primary-rgb),0.25)]'
                      }`}>
                        {img.kind === 'sar' ? 'SAR' : 'OPT'}
                      </div>
                      <div>
                        <div className="max-w-[180px] truncate text-sm font-medium text-[rgba(255,255,255,0.85)]">
                          {img.name}
                        </div>
                        <div className="text-xs text-[rgba(255,255,255,0.40)]">
                          {img.kind === 'sar' ? 'SAR · Synthetic aperture' : 'Optical · Multispectral'}
                          {img.date ? ` · ${img.date}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveImage(img.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[rgba(255,255,255,0.30)] transition-all hover:bg-[rgba(248,113,113,0.15)] hover:text-[#f87171]"
                      aria-label="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                    className={`flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center transition-all duration-200 ease-out ${
                      dragging
                        ? 'border-[var(--color-primary)] bg-[rgba(var(--primary-rgb),0.10)] shadow-[0_0_20px_-4px_rgba(var(--primary-rgb),0.40)]'
                        : 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(var(--primary-rgb),0.40)] hover:bg-[rgba(var(--primary-rgb),0.06)]'
                    }`}
                  >
                    <div className={`text-2xl transition-transform duration-200 ${dragging ? 'scale-125' : ''}`}>
                      ⬆
                    </div>
                    <span className="mt-2 text-sm font-medium text-[rgba(255,255,255,0.65)]">Drop image here</span>
                    <span className="mt-0.5 text-xs text-[rgba(255,255,255,0.35)]">or click to browse · GeoTIFF, PNG, JPEG</span>
                    <input
                      type="file"
                      accept=".tif,.tiff,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
                    />
                  </label>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-[rgba(255,255,255,0.35)]">
            <span className={`font-semibold ${images.length >= required ? 'text-[var(--color-primary)]' : 'text-[rgba(255,255,255,0.50)]'}`}>
              {images.length}
            </span>
            <span>/{required} files ready</span>
          </p>
          <Button onClick={onContinue} disabled={images.length < required}>
            Continue →
          </Button>
        </div>
      </Card>

      {/* Right: demo scenarios */}
      <div className="space-y-3">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-[rgba(255,255,255,0.55)] uppercase tracking-widest">
            Or try a demo
          </h2>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.30)]">Pre-generated scenarios with results</p>
        </div>
        {DEMO_SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onRunScenario(s)}
            className="group w-full rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-left transition-all duration-200 ease-out hover:border-[rgba(var(--violet-rgb),0.35)] hover:bg-[rgba(var(--violet-rgb),0.07)] hover:shadow-[0_0_20px_-8px_rgba(var(--violet-rgb),0.40)] active:scale-[0.99]"
          >
            <div className="text-sm font-semibold text-[rgba(255,255,255,0.85)] group-hover:text-white transition-colors">
              {s.title}
            </div>
            <div className="mt-0.5 text-xs text-[rgba(255,255,255,0.40)]">{s.subtitle}</div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[rgba(var(--violet-rgb),0.30)] bg-[rgba(var(--violet-rgb),0.12)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-violet)]">
              <span className="h-1 w-1 rounded-full bg-[var(--color-violet)]" />
              {MODE_LABEL[s.mode]}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}