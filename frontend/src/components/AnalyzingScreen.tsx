import { StepBadge, Card } from './ui'

interface AnalyzingScreenProps {
  question: string
  activeStep: number
  workflowLabel: string
}

const STEPS = ['Validate', 'Route', 'Analyze', 'Explain']

export default function AnalyzingScreen({ question, activeStep, workflowLabel }: AnalyzingScreenProps) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center">
          <span className="animate-spin rounded-full border-4 border-primary/30 border-t-primary h-10 w-10" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Analyzing your image</h2>
        <p className="mt-1 text-sm text-slate-500">
          "<span className="font-medium text-slate-700">{question}</span>"
        </p>

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

        <p className="mt-6 text-xs text-slate-400">
          Processing may take up to ~30 seconds for demo inputs.
        </p>
      </Card>
    </div>
  )
}