import { StepBadge } from './ui'

interface AnalyzingScreenProps {
  question: string
  activeStep: number
  workflowLabel: string
}

const STEPS = ['Validate', 'Route', 'Analyze', 'Explain']

export default function AnalyzingScreen({ question, activeStep, workflowLabel }: AnalyzingScreenProps) {
  const progress = Math.min(94, ((activeStep + 1) / STEPS.length) * 100)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="glass-card-elevated p-8 text-center">
        {/* Neon pulse spinner */}
        <div
          aria-busy="true"
          aria-live="polite"
          role="status"
          className="mx-auto flex h-20 w-20 items-center justify-center"
        >
          {/* Outer glow ring */}
          <div className="absolute h-20 w-20 rounded-full border-2 border-[rgba(var(--primary-rgb),0.20)] shadow-[0_0_30px_rgba(var(--primary-rgb),0.30)]" />
          {/* Spinning ring */}
          <div
            className="h-16 w-16 rounded-full border-4 border-transparent"
            style={{
              borderTopColor: 'var(--color-primary)',
              borderRightColor: 'rgba(var(--violet-rgb),0.50)',
              animation: 'spin-neon 0.9s linear infinite',
              boxShadow: '0 0 20px rgba(var(--primary-rgb),0.60)',
            }}
          />
          {/* Inner static ring */}
          <div className="absolute h-8 w-8 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--primary-rgb),0.10)]" />
          <span className="sr-only">Analyzing: {STEPS[activeStep]} step running</span>
        </div>

        <h2 className="mt-6 text-xl font-semibold text-white">Analyzing Imagery</h2>
        <p className="mt-2 text-sm text-[rgba(255,255,255,0.45)]">
          &ldquo;<span className="font-medium text-[rgba(255,255,255,0.75)]">{question}</span>&rdquo;
        </p>

        {/* Gradient progress bar */}
        <div
          className="mx-auto mt-8 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[rgba(255,255,255,0.07)]"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Analysis progress"
        >
          <div
            className="h-full rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-violet) 50%, var(--color-cyan) 100%)',
              boxShadow: '0 0 12px rgba(var(--primary-rgb),0.60)',
            }}
          />
        </div>
        <p className="mt-1.5 text-right text-[11px] text-[rgba(255,255,255,0.25)] max-w-md mx-auto">
          {Math.round(progress)}%
        </p>

        {/* Step badges */}
        <div className="mt-6 flex items-center justify-center gap-2 sm:gap-2.5">
          {STEPS.map((label, i) => (
            <StepBadge key={label} label={label} index={i} active={i === activeStep} complete={i < activeStep} />
          ))}
        </div>

        {/* Router label */}
        {activeStep === 1 && workflowLabel && (
          <div className="mx-auto mt-6 inline-flex max-w-md items-center gap-2.5 rounded-xl border border-[rgba(var(--primary-rgb),0.25)] bg-[rgba(var(--primary-rgb),0.10)] px-5 py-2.5 text-sm">
            <span className="font-semibold text-[var(--color-primary)]">Router:</span>
            <span className="truncate text-[rgba(255,255,255,0.65)]">{workflowLabel}</span>
          </div>
        )}

        <p className="mt-6 text-xs text-[rgba(255,255,255,0.25)]">
          Processing may take up to ~30 seconds for demo inputs.
        </p>
      </div>
    </div>
  )
}