import { useCallback, useState } from 'react'
import type { UploadMode, UploadedImage } from '../types'
import { DEMO_SCENARIOS, type DemoScenario } from '../data/mock'
import { Satellite, CalendarRange, Radar, UploadCloud, X, ArrowRight, Waves, Droplets, Building2, CircleCheck } from 'lucide-react'
import AmbientCanvas from './AmbientCanvas'
import Reveal from './Reveal'

const MODES: { id: UploadMode; label: string; desc: string; slots: number; Icon: typeof Satellite }[] = [
  { id: 'single', label: 'Single Image', desc: 'One optical satellite image', slots: 1, Icon: Satellite },
  { id: 'twoDate', label: 'Compare Dates', desc: 'Same area, two time points', slots: 2, Icon: CalendarRange },
  { id: 'opticalSar', label: 'Optical + SAR', desc: 'Fused multi-sensor analysis', slots: 2, Icon: Radar },
]

const MODE_LABEL: Record<UploadMode, string> = {
  single: 'Single Image',
  twoDate: 'Compare Dates',
  opticalSar: 'Optical + SAR',
}

// A little visual variety per demo scenario, keyed off its id.
const SCENARIO_ICON: Record<string, typeof Waves> = {
  flood: Waves,
  water: Droplets,
  opsar: Building2,
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
      {/* Left: Upload card — earthy/pastel, matching the map hero */}
      <div className="hero-earthy relative overflow-hidden rounded-2xl border border-[var(--he-border)] p-6 lg:col-span-2">
        <AmbientCanvas />
        <div className="relative">
          {/* Section header */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--he-accent-border)] bg-[var(--he-accent-50)]">
              <UploadCloud className="h-4.5 w-4.5 text-[var(--he-accent-strong)]" strokeWidth={2.25} />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--he-ink)]">Upload Satellite Image</h2>
              <p className="text-xs text-[var(--he-ink-soft)]">Choose an analysis mode, then drop your imagery.</p>
            </div>
          </div>

          {/* Mode picker */}
          <div className="grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => {
              const active = mode === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectMode(m.id)}
                  aria-pressed={active}
                  className={`group relative rounded-xl border p-4 text-left shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${
                    active
                      ? 'border-[var(--he-accent-strong)] bg-[var(--he-accent-strong)] shadow-md'
                      : 'border-[var(--he-border)] bg-[var(--he-accent-50)]/40 hover:border-[var(--he-accent-border)] hover:bg-[var(--he-accent-50)]'
                  }`}
                >
                  {active && (
                    <div className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-full bg-white/90">
                      <CircleCheck className="h-3.5 w-3.5 text-[var(--he-accent-strong)]" strokeWidth={2.5} />
                    </div>
                  )}
                  <div
                    className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                      active
                        ? 'border-white/30 bg-white/15'
                        : 'border-[var(--he-accent-border)] bg-white/40'
                    }`}
                  >
                    <m.Icon
                      className={`h-4.5 w-4.5 ${active ? 'text-white' : 'text-[var(--he-accent-strong)]'}`}
                      strokeWidth={2}
                    />
                  </div>
                  <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-[var(--he-ink)]'}`}>
                    {m.label}
                  </div>
                  <div className={`mt-0.5 text-xs ${active ? 'text-white/75' : 'text-[var(--he-ink-soft)]'}`}>
                    {m.desc}
                  </div>
                </button>
              )
            })}
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
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[var(--he-ink-soft)]">
                    {label}
                  </div>
                  {img ? (
                    <div className="flex items-center justify-between rounded-xl border border-[var(--he-border)] bg-white/50 p-3.5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                            img.kind === 'sar'
                              ? 'border-[var(--he-accent-border)] bg-[var(--he-accent-50)] text-[var(--he-accent-strong)]'
                              : 'border-[var(--he-accent-border)] bg-[var(--he-accent-50)] text-[var(--he-accent-strong)]'
                          }`}
                        >
                          {img.kind === 'sar' ? <Radar className="h-4.5 w-4.5" /> : <Satellite className="h-4.5 w-4.5" />}
                        </div>
                        <div>
                          <div className="max-w-[180px] truncate text-sm font-medium text-[var(--he-ink)]">
                            {img.name}
                          </div>
                          <div className="text-xs text-[var(--he-ink-soft)]">
                            {img.kind === 'sar' ? 'SAR · Synthetic aperture' : 'Optical · Multispectral'}
                            {img.date ? ` · ${img.date}` : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => onRemoveImage(img.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--he-ink-soft)] transition-all hover:scale-110 hover:bg-red-100 hover:text-red-600"
                        aria-label="Remove image"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
                      className={`flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center transition-all duration-200 ease-out ${
                        dragging
                          ? 'border-[var(--he-accent-strong)] bg-[var(--he-accent-50)] shadow-md'
                          : 'border-[var(--he-accent-border)] bg-white/30 hover:border-[var(--he-accent-strong)] hover:bg-[var(--he-accent-50)]'
                      }`}
                    >
                      <UploadCloud
                        className={`h-6 w-6 text-[var(--he-accent-strong)] transition-transform duration-300 ${dragging ? 'scale-125 -translate-y-1' : 'group-hover:-translate-y-0.5'}`}
                      />
                      <span className="mt-2 text-sm font-medium text-[var(--he-ink)]">Drop image here</span>
                      <span className="mt-0.5 text-xs text-[var(--he-ink-soft)]">or click to browse · GeoTIFF, PNG, JPEG</span>
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
            <p className="text-xs text-[var(--he-ink-soft)]">
              <span className={`font-semibold ${images.length >= required ? 'text-[var(--he-accent-strong)]' : 'text-[var(--he-ink-soft)]'}`}>
                {images.length}
              </span>
              <span>/{required} files ready</span>
            </p>
            <button
              onClick={onContinue}
              disabled={images.length < required}
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--he-accent-strong)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
            >
              Continue
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right: demo scenarios */}
      <div className="space-y-3">
        <div className="mb-1">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.55)]">
            Or try a demo
          </h2>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.30)]">Pre-generated scenarios with results</p>
        </div>
        {DEMO_SCENARIOS.map((s, idx) => {
          const Icon = SCENARIO_ICON[s.id] ?? Satellite
          return (
            <Reveal key={s.id} delay={idx * 90}>
              <button
                onClick={() => onRunScenario(s)}
                className="hero-earthy group w-full rounded-xl border border-[var(--he-border)] p-4 text-left shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--he-accent-border)] bg-[var(--he-accent-50)] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                    <Icon className="h-4.5 w-4.5 text-[var(--he-accent-strong)]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-[var(--he-ink)]">{s.title}</div>
                    <div className="mt-0.5 text-xs text-[var(--he-ink-soft)]">{s.subtitle}</div>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--he-accent-border)] bg-white/40 px-2.5 py-1 text-[11px] font-semibold text-[var(--he-accent-strong)]">
                      <span className="h-1 w-1 rounded-full bg-[var(--he-accent-strong)]" />
                      {MODE_LABEL[s.mode]}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[var(--he-accent-strong)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
              </button>
            </Reveal>
          )
        })}
      </div>
    </div>
  )
}
