import { useCallback, useEffect, useRef, useState } from 'react'
import type { UploadMode, UploadedImage } from '../types'
import { DEMO_SCENARIOS, type DemoScenario } from '../data/mock'
import { Satellite, CalendarRange, Radar, UploadCloud, X, ArrowRight, Waves, Droplets, Building2, CircleCheck, AlertTriangle } from 'lucide-react'
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

const ALLOWED_EXTENSIONS = ['tif', 'tiff', 'png', 'jpg', 'jpeg', 'webp']

async function validateFile(file: File): Promise<{ ok: boolean; error?: string }> {
  if (!file || file.size === 0) {
    return { ok: false, error: `The selected file "${file?.name || 'File'}" is empty (0 bytes). Please upload a valid image.` }
  }

  // Check file size (max 50 MB)
  if (file.size > 50 * 1024 * 1024) {
    return { ok: false, error: `"${file.name}" exceeds the 50MB size limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).` }
  }

  // Check extension
  const extMatch = file.name.match(/\.([a-z0-9]+)$/i)
  if (!extMatch) {
    return { ok: false, error: `"${file.name}" does not have an image extension. Supported: GeoTIFF (.tif/.tiff), PNG, JPEG, WebP.` }
  }
  const ext = extMatch[1].toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      ok: false,
      error: `Invalid file format ".${ext}". Please upload a valid satellite image (.tif, .tiff, .png, .jpg, .jpeg, or .webp).`,
    }
  }

  // Binary magic bytes inspection (first 16 bytes)
  try {
    const slice = await file.slice(0, 16).arrayBuffer()
    const bytes = new Uint8Array(slice)
    if (bytes.length < 4) {
      return { ok: false, error: `"${file.name}" file content is corrupted or incomplete.` }
    }

    const isTiff =
      (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) || // little endian II*
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a) || // big endian MM*
      (bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2b && bytes[3] === 0x00) || // BigTIFF
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2b)

    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47

    const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff

    const isWebp =
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // 'RIFF'
      bytes.length >= 12 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // 'WEBP'

    if (!isTiff && !isPng && !isJpg && !isWebp) {
      return {
        ok: false,
        error: `"${file.name}" is not a valid image. The file content does not match any recognized image format header.`,
      }
    }
  } catch {
    return { ok: false, error: `Unable to read "${file.name}". Please verify file permissions.` }
  }

  return { ok: true }
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
  onContinue: (orderedImages?: UploadedImage[]) => void
  onRunScenario: (s: DemoScenario) => void
  apiError?: string | null
  onDismissApiError?: () => void
}

export default function UploadScreen({
  mode,
  images,
  onSelectMode,
  onAddImages,
  onRemoveImage: _onRemoveImage,
  onContinue,
  onRunScenario,
  apiError,
  onDismissApiError,
}: UploadScreenProps) {
  const [draggingSlot, setDraggingSlot] = useState<number | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const required = MODES.find((m) => m.id === mode)?.slots ?? 1
  const createdUrlsRef = useRef<Set<string>>(new Set())

  // Cleanup object URLs on unmount to prevent browser memory leaks
  useEffect(() => {
    const urls = createdUrlsRef.current
    return () => {
      urls.forEach((u) => {
        try { URL.revokeObjectURL(u) } catch { /* ignore */ }
      })
      urls.clear()
    }
  }, [])

  // Resolve which image corresponds to slot index (0 or 1)
  const getSlotImage = useCallback(
    (slotIdx: number): UploadedImage | undefined => {
      const explicit = images.find((img) => img.slot === slotIdx)
      if (explicit) return explicit

      const hasExplicitSlots = images.some((img) => typeof img.slot === 'number')
      if (!hasExplicitSlots) {
        return images[slotIdx]
      }
      return undefined
    },
    [images],
  )

  const handleModeChange = useCallback(
    (newMode: UploadMode) => {
      onSelectMode(newMode)
      setFileError(null)
      const newSlots = MODES.find((m) => m.id === newMode)?.slots ?? 1
      if (newSlots === 1) {
        // Keep only slot 0
        const slot0 = getSlotImage(0)
        onAddImages(slot0 ? [{ ...slot0, slot: 0, kind: 'optical' }] : [])
      } else {
        // Adjust kinds for opticalSar vs twoDate
        const slot0 = getSlotImage(0)
        const slot1 = getSlotImage(1)
        const updated: UploadedImage[] = []
        if (slot0) updated.push({ ...slot0, slot: 0, kind: 'optical' })
        if (slot1) updated.push({ ...slot1, slot: 1, kind: newMode === 'opticalSar' ? 'sar' : 'optical' })
        onAddImages(updated)
      }
    },
    [getSlotImage, onAddImages, onSelectMode],
  )

  const handleSlotFiles = useCallback(
    async (targetSlot: number, fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      setFileError(null)

      const files = Array.from(fileList)

      // Multiple files dropped at once (e.g. 2 files dropped on slot 0)
      if (files.length > 1) {
        const validated: { file: File; slot: number }[] = []
        for (let i = 0; i < Math.min(files.length, required); i++) {
          const res = await validateFile(files[i])
          if (!res.ok) {
            setFileError(res.error || 'Invalid image file.')
            return // Reject batch, do not update slots
          }
          validated.push({ file: files[i], slot: i })
        }

        const newImages: UploadedImage[] = validated.map(({ file, slot }) => {
          const previewUrl = URL.createObjectURL(file)
          createdUrlsRef.current.add(previewUrl)
          return {
            id: `${Date.now()}-${slot}-${file.name}`,
            name: file.name,
            slot,
            kind: mode === 'opticalSar' && slot === 1 ? 'sar' : 'optical',
            date: undefined,
            location: undefined,
            previewUrl,
            file,
          }
        })

        onAddImages(newImages)
        return
      }

      // Single file provided for targetSlot
      const file = files[0]
      const res = await validateFile(file)
      if (!res.ok) {
        setFileError(res.error || 'Invalid image file.')
        return // Reject invalid file: do not update or show in slot!
      }

      const previewUrl = URL.createObjectURL(file)
      createdUrlsRef.current.add(previewUrl)

      const newImage: UploadedImage = {
        id: `${Date.now()}-${targetSlot}-${file.name}`,
        name: file.name,
        slot: targetSlot,
        kind: mode === 'opticalSar' && targetSlot === 1 ? 'sar' : 'optical',
        date: undefined,
        location: undefined,
        previewUrl,
        file,
      }

      // Preserve the other slot's image
      const otherSlot = targetSlot === 0 ? 1 : 0
      const existingOther = required > 1 ? getSlotImage(otherSlot) : undefined

      const nextList: UploadedImage[] = []
      if (targetSlot === 0) {
        nextList.push(newImage)
        if (existingOther) nextList.push({ ...existingOther, slot: otherSlot })
      } else {
        const currentSlot0 = getSlotImage(0)
        if (currentSlot0) nextList.push({ ...currentSlot0, slot: 0 })
        nextList.push(newImage)
      }

      onAddImages(nextList)
    },
    [required, mode, onAddImages, getSlotImage],
  )

  const handleRemoveSlot = useCallback(
    (slotIdx: number) => {
      setFileError(null)
      const target = getSlotImage(slotIdx)
      if (target?.previewUrl && createdUrlsRef.current.has(target.previewUrl)) {
        try { URL.revokeObjectURL(target.previewUrl) } catch { /* ignore */ }
        createdUrlsRef.current.delete(target.previewUrl)
      }
      const remaining = images
        .map((img, idx) => ({ ...img, slot: img.slot ?? idx }))
        .filter((img) => img.slot !== slotIdx)
      onAddImages(remaining)
    },
    [images, onAddImages, getSlotImage],
  )

  // Count how many required slots are populated with valid images
  const readyCount = Array.from({ length: required }).filter((_, i) => Boolean(getSlotImage(i))).length

  const handleContinueClick = useCallback(() => {
    // Ensure images are strictly ordered by slot [0, 1]
    const ordered = Array.from({ length: required })
      .map((_, i) => getSlotImage(i))
      .filter((x): x is UploadedImage => Boolean(x))

    if (ordered.length < required) return
    onAddImages(ordered)
    onContinue(ordered)
  }, [required, getSlotImage, onAddImages, onContinue])

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
                  onClick={() => handleModeChange(m.id)}
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

          {/* Validation Error Banner */}
          {fileError && (
            <div className="mt-4 flex items-start justify-between rounded-xl border border-red-300/80 bg-red-50/95 p-3.5 text-sm text-red-800 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" strokeWidth={2} />
                <div className="leading-snug">
                  <span className="font-semibold text-red-900">Upload Rejected: </span>
                  {fileError}
                </div>
              </div>
              <button
                onClick={() => setFileError(null)}
                className="ml-3 shrink-0 rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-700 transition-colors"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* API Error (inline, specific to the upload section) */}
          {apiError && (
            <div
              role="alert"
              className="mt-4 flex items-start justify-between rounded-xl border border-red-300/80 bg-red-50 p-3.5 text-sm text-red-800 shadow-md animate-in fade-in duration-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" strokeWidth={2} />
                <div className="leading-snug text-black">
                  <span className="font-semibold text-red-600">API error: </span>
                  {apiError}
                </div>
              </div>
              {onDismissApiError && (
                <button
                  onClick={onDismissApiError}
                  className="ml-3 shrink-0 rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-700 transition-colors"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Drop zones */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: required }).map((_, i) => {
              const img = getSlotImage(i)
              const isDraggingThis = draggingSlot === i
              const label =
                mode === 'opticalSar'
                  ? i === 0 ? 'Optical Band (Slot 1)' : 'SAR Band (Slot 2)'
                  : i === 0 ? 'Earlier Date (Slot 1)' : 'Later Date (Slot 2)'
              return (
                <div key={`${mode}-${i}`}>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-[var(--he-ink-soft)]">
                    <span>{label}</span>
                    {img && (
                      <span className="text-[10px] lowercase tracking-normal text-emerald-600 font-medium">✓ loaded</span>
                    )}
                  </div>
                  {img ? (
                    <div className="flex items-center justify-between rounded-xl border border-[var(--he-border)] bg-white/60 p-3.5 shadow-sm transition-shadow duration-200 hover:shadow-md">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                            img.kind === 'sar'
                              ? 'border-[var(--he-accent-border)] bg-[var(--he-accent-50)] text-[var(--he-accent-strong)]'
                              : 'border-[var(--he-accent-border)] bg-[var(--he-accent-50)] text-[var(--he-accent-strong)]'
                          }`}
                        >
                          {img.kind === 'sar' ? <Radar className="h-4.5 w-4.5" /> : <Satellite className="h-4.5 w-4.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-[var(--he-ink)]" title={img.name}>
                            {img.name}
                          </div>
                          <div className="text-xs text-[var(--he-ink-soft)]">
                            {img.kind === 'sar' ? 'SAR · Synthetic aperture' : 'Optical · Multispectral'}
                            {img.date ? ` · ${img.date}` : ''}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSlot(i)}
                        className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--he-ink-soft)] transition-all hover:scale-110 hover:bg-red-100 hover:text-red-600"
                        aria-label={`Remove image in slot ${i + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      onDragOver={(e) => { e.preventDefault(); setDraggingSlot(i) }}
                      onDragLeave={() => setDraggingSlot(null)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDraggingSlot(null)
                        handleSlotFiles(i, e.dataTransfer.files)
                      }}
                      className={`flex h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-3 text-center transition-all duration-200 ease-out ${
                        isDraggingThis
                          ? 'border-[var(--he-accent-strong)] bg-[var(--he-accent-50)] shadow-md'
                          : 'border-[var(--he-accent-border)] bg-white/30 hover:border-[var(--he-accent-strong)] hover:bg-[var(--he-accent-50)]'
                      }`}
                    >
                      <UploadCloud
                        className={`h-6 w-6 text-[var(--he-accent-strong)] transition-transform duration-300 ${
                          isDraggingThis ? 'scale-125 -translate-y-1' : 'group-hover:-translate-y-0.5'
                        }`}
                      />
                      <span className="mt-2 text-sm font-medium text-[var(--he-ink)]">
                        Drop {mode === 'opticalSar' ? (i === 0 ? 'Optical' : 'SAR') : (i === 0 ? 'Earlier' : 'Later')} Image
                      </span>
                      <span className="mt-0.5 text-xs text-[var(--he-ink-soft)]">or click to browse · GeoTIFF, PNG, JPEG, WebP</span>
                      <input
                        type="file"
                        accept=".tif,.tiff,.png,.jpg,.jpeg,.webp"
                        className="hidden"
                        onChange={(e) => {
                          handleSlotFiles(i, e.target.files)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-[var(--he-ink-soft)]">
              <span className={`font-semibold ${readyCount >= required ? 'text-[var(--he-accent-strong)]' : 'text-[var(--he-ink-soft)]'}`}>
                {readyCount}
              </span>
              <span>/{required} files ready</span>
            </p>
            <button
              onClick={handleContinueClick}
              disabled={readyCount < required}
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
