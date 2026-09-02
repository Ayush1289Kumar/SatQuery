import type { UploadedImage, UploadMode } from '../types'
import { SUGGESTED_QUESTIONS } from '../data/mock'
import { Button, Card } from './ui'

interface AskScreenProps {
  mode: UploadMode
  images: UploadedImage[]
  question: string
  onQuestionChange: (q: string) => void
  onAnalyze: () => void
  onBack: () => void
}

export default function AskScreen({
  images,
  question,
  onQuestionChange,
  onAnalyze,
  onBack,
}: AskScreenProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <Card glow="violet">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(101,163,13,0.18)] border border-[rgba(101,163,13,0.30)]">
            <span className="text-sm">②</span>
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Ask Your Question</h2>
            <p className="text-xs text-[rgba(255,255,255,0.40)]">
              Plain English — we route it to the right model automatically.
            </p>
          </div>
        </div>

        {/* Uploaded file chips */}
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] px-3 py-1.5 text-xs font-medium text-[rgba(255,255,255,0.70)]"
            >
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                img.kind === 'sar'
                  ? 'bg-[rgba(134,239,172,0.18)] text-[#86efac]'
                  : 'bg-[rgba(16,185,129,0.18)] text-[#10b981]'
              }`}>
                {i + 1}
              </span>
              <span className="max-w-[160px] truncate">{img.name}</span>
              <span className={`text-[10px] ${img.kind === 'sar' ? 'text-[#86efac]/60' : 'text-[#10b981]/60'}`}>
                {img.kind === 'sar' ? 'SAR' : 'optical'}
              </span>
            </div>
          ))}
        </div>

        {/* Question input */}
        <div className="relative mt-5">
          <textarea
            value={question}
            onChange={(e) => onQuestionChange(e.target.value)}
            rows={4}
            placeholder='e.g. "Which areas are newly flooded since last month?"'
            aria-label="Your question about the uploaded image"
            className="w-full resize-none rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] p-4 text-sm text-[rgba(255,255,255,0.85)] placeholder:text-[rgba(255,255,255,0.25)] transition-all duration-200 focus:border-[rgba(101,163,13,0.50)] focus:bg-[rgba(101,163,13,0.05)] focus:outline-none focus:shadow-[0_0_20px_-6px_rgba(101,163,13,0.45)]"
          />
          {question.trim() && (
            <div className="absolute bottom-3 right-3">
              <span className="text-[11px] text-[rgba(255,255,255,0.25)]">
                {question.length} chars
              </span>
            </div>
          )}
        </div>

        {/* Suggested questions */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[rgba(255,255,255,0.30)]">
            Suggested Questions
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => onQuestionChange(q.text)}
                className="rounded-full border border-[rgba(101,163,13,0.25)] bg-[rgba(101,163,13,0.08)] px-3.5 py-1.5 text-xs font-medium text-[#65a30d] transition-all duration-150 ease-out hover:border-[rgba(101,163,13,0.45)] hover:bg-[rgba(101,163,13,0.15)] hover:shadow-[0_0_12px_-4px_rgba(101,163,13,0.50)] active:scale-[0.97]"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button onClick={onAnalyze} disabled={!question.trim()} className="min-w-[120px]">
            Analyze →
          </Button>
        </div>
      </Card>
    </div>
  )
}