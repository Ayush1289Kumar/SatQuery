import { useCallback, useState } from 'react'
import type { UploadMode, UploadedImage } from '../types'
import { DEMO_SCENARIOS, type DemoScenario } from '../data/mock'
import { Button, Card } from './ui'

const MODES: { id: UploadMode; label: string; desc: string; slots: number }[] = [
  { id: 'single', label: 'Single image', desc: 'One optical satellite image', slots: 1 },
  { id: 'twoDate', label: 'Compare two dates', desc: 'Same area, two dates', slots: 2 },
  { id: 'opticalSar', label: 'Optical + SAR', desc: 'Fused analysis pair', slots: 2 },
]

const MODE_LABEL: Record<UploadMode, string> = {
  single: 'Single image',
  twoDate: 'Compare two dates',
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
      <Card className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-ink-900">1. Upload satellite image</h2>
        <p className="mt-1 text-sm text-ink-500">Choose an analysis type, then drop one or two images.</p>

        {/* Mode picker */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onSelectMode(m.id)}
              aria-pressed={mode === m.id}
              className={`rounded-lg border-2 p-3 text-left transition duration-150 ease-out ${
                mode === m.id
                  ? 'border-primary bg-primary-50'
                  : 'border-edge bg-surface-50 hover:border-primary/40 active:scale-[0.99]'
              }`}
            >
              <div className="text-sm font-semibold text-ink-900">{m.label}</div>
              <div className="mt-0.5 text-xs text-ink-500">{m.desc}</div>
            </button>
          ))}
        </div>

        {/* Drop zones */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: required }).map((_, i) => {
            const img = images[i]
            const label =
              mode === 'opticalSar'
                ? i === 0 ? 'Optical' : 'SAR'
                : i === 0 ? 'Image (earlier date)' : 'Image (later date)'
            return (
              <div key={`${mode}-${i}`}>
                <div className="mb-1 text-xs font-medium text-ink-500">{label}</div>
                {img ? (
                  <div className="flex items-center justify-between rounded-lg border border-edge bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-50 text-primary">
                        <span className="text-xs font-bold">{img.kind === 'sar' ? 'SAR' : 'OPT'}</span>
                      </div>
                      <div>
                        <div className="max-w-[200px] truncate text-sm font-medium text-ink-800">{img.name}</div>
                        <div className="text-xs text-ink-500">
                          {img.kind === 'sar' ? 'SAR' : 'Optical'}
                          {img.date ? ` · ${img.date}` : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveImage(img.id)}
                      className="text-ink-500 transition hover:text-danger"
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
                    className={`flex h-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-3 text-center transition duration-150 ease-out ${
                      dragging ? 'border-primary bg-primary-50' : 'border-edge bg-surface hover:border-primary/50'
                    }`}
                  >
                    <span className="text-2xl text-primary" aria-hidden="true">⬆</span>
                    <span className="mt-1 text-sm font-medium text-ink-700">Drop image here</span>
                    <span className="text-xs text-ink-500">or click to browse · GeoTIFF/TIFF, PNG, JPEG</span>
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
          <p className="text-xs text-ink-500">{`Files: ${images.length}/${required}`}</p>
          <Button onClick={onContinue} disabled={images.length < required}>
            Continue →
          </Button>
        </div>
      </Card>

      {/* Right: sample scenarios */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-600">Or run a demo</h2>
        {DEMO_SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => onRunScenario(s)}
            className="w-full rounded-xl bg-surface-50 p-4 text-left shadow-card ring-1 ring-edge transition duration-150 ease-out hover:ring-primary/50 active:scale-[0.99]"
          >
            <div className="text-sm font-semibold text-ink-900">{s.title}</div>
            <div className="mt-0.5 text-xs text-ink-500">{s.subtitle}</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-medium text-primary">
              {MODE_LABEL[s.mode]}
            </div>
          </button>
        ))}
        <p className="text-xs text-ink-500">Demo scenarios play through the full flow with pre-generated results.</p>
      </div>
    </div>
  )
}