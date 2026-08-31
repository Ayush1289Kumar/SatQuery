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
      <Card>
        <h2 className="text-lg font-semibold text-ink-900">2. Ask your question</h2>
        <p className="mt-1 text-sm text-ink-500">Ask in plain English. We route it to the right model automatically.</p>

        {/* Uploaded strip */}
        <div className="mt-4 flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 ring-1 ring-edge"
            >
              <span className="rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {i + 1}
              </span>
              <span className="max-w-[180px] truncate">{img.name}</span>
              <span className="text-ink-500">{img.kind === 'sar' ? 'SAR' : 'optical'}</span>
            </div>
          ))}
        </div>

        {/* Question input */}
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          rows={3}
          placeholder='e.g. "Which areas are newly flooded?"'
          aria-label="Your question about the uploaded image"
          className="mt-5 w-full resize-none rounded-md border border-edge p-3 text-base text-ink-900 placeholder:text-ink-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />

        {/* Suggested questions */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-ink-500">Suggested questions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => onQuestionChange(q.text)}
                className="rounded-full border border-primary/30 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary transition duration-150 ease-out hover:bg-primary-100 active:scale-[0.98]"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            ← Back
          </Button>
          <Button onClick={onAnalyze} disabled={!question.trim()} className="px-6">
            Analyze
          </Button>
        </div>
      </Card>
    </div>
  )
}