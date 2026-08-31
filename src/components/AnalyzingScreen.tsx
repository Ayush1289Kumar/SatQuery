import { StepBadge, Card } from './ui'

interface AnalyzingScreenProps {
  question: string
  activeStep: number
  workflowLabel: string
}

const STEPS = ['Validate', 'Route', 'Analyze', 'Explain']

export default function AnalyzingScreen({ question, activeStep, workflowLabel }: AnalyzingScreenProps) {
  // Smoothly grow the progress fill across the 4 steps (max ~94%, finishes at results).
  const progress = Math.min(94, ((activeStep + 1) / STEPS.length) * 100)

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="text-center">
        <div aria-busy="true" aria-live="polite" role="status" className="mx-auto flex h-14 w-14 items-center justify-center">
          <span className="animate-spin rounded-full border-4 border-primary/25 border-t-primary h-10 w-10" />
          <span className="sr-only">Analyzing: {STEPS[activeStep]} step running</span>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink-900">Analyzing your image</h2>
        <p className="mt-1 text-sm text-ink-500">
          &ldquo;<span className="font-medium text-ink-700">{question}</span>&rdquo;
        </p>

        {/* Animated progress bar */}
        <div
          className="mx-auto mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-edge"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Analysis progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-6 flex items-center justify-center gap-1 sm:gap-3">
          {STEPS.map((label, i) => (
            <StepBadge key={label} label={label} index={i} active={i === activeStep} complete={i < activeStep} />
          ))}
        </div>

        {activeStep === 1 && workflowLabel && (
          <div className="mx-auto mt-6 inline-flex max-w-md items-center gap-2 rounded-lg bg-primary-50 px-4 py-2 text-sm text-primary">
            <span className="font-semibold">Router:</span>
            <span className="truncate">{workflowLabel}</span>
          </div>
        )}

        <p className="mt-6 text-xs text-ink-500">
          Processing may take up to ~30 seconds for demo inputs.
        </p>
      </Card>
    </div>
  )
}