import { StepBadge } from './ui'

interface AnalyzingScreenProps {
  question: string
  activeStep: number
  workflowLabel: string
  /** Visual-only: immersive aquatic environment for water/flood analyses. */
  water?: boolean
  /** Aquatic identity: 'azure' = flood extent (deep indigo/azure), 'teal' = water mapping (deep teal). */
  variant?: 'azure' | 'teal'
}

const STEPS = ['Validate', 'Route', 'Analyze', 'Explain']

/* Water-themed pipeline badge (same information as StepBadge, aquatic styling). */
function WaterStepBadge({ label, active, complete }: { label: string; active: boolean; complete: boolean }) {
  const base = 'flood-badge flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-all duration-300'
  if (complete) {
    return (
      <span className={`${base} flood-done border border-[rgba(150,222,250,0.38)] bg-[rgba(74,150,196,0.26)] text-[rgba(214,240,252,0.92)] shadow-[inset_0_1px_0_rgba(220,244,254,0.22),0_0_12px_-4px_rgba(125,211,252,0.45)]`}>
        <span className="text-[10px] text-[#9BE4FF]">✓</span> {label}
      </span>
    )
  }
  if (active) {
    return (
      <span className={`${base} water-step-active border border-[rgba(168,233,255,0.60)] bg-[rgba(56,130,180,0.35)] text-[#E6F9FF]`}>
        <span className="water-step-dot inline-block h-1.5 w-1.5 rounded-full bg-[#BDEFFF]" />
        {label}
      </span>
    )
  }
  return (
    <span className={`${base} flood-up border border-[rgba(160,196,228,0.22)] bg-[rgba(70,110,150,0.16)] text-[rgba(198,224,244,0.62)] shadow-[inset_0_1px_0_rgba(210,236,250,0.10)]`}>
      {label}
    </span>
  )
}

export default function AnalyzingScreen({ question, activeStep, workflowLabel, water = false, variant = 'azure' }: AnalyzingScreenProps) {
  const progress = Math.min(94, ((activeStep + 1) / STEPS.length) * 100)
  const Step = water ? WaterStepBadge : StepBadge

  return (
    <div className={`relative mx-auto max-w-2xl ${water ? (variant === 'teal' ? 'water--teal' : 'water--indigo') : ''}`}>
      {water && (
        <div aria-hidden className={`water-env ${variant === 'teal' ? 'water--teal' : 'water--indigo'}`}>
          {/* Layer 1 — deep ocean base gradient */}
          <div className="water-base" />
          {/* Layer 2 — large blurred organic current shapes */}
          <div className="water-blob water-blob-a" />
          <div className="water-blob water-blob-b" />
          <div className="water-blob water-blob-c" />
          {/* Layer 3 — atmospheric mist */}
          <div className="water-mist" />
          {/* Layer 4 — faint bathymetric contour lines */}
          <div className="water-contours" />
          {/* Layer 5 — fine grain to break flat gradients */}
          <div className="water-grain" />
          {/* Center spotlight — draws the eye to the analysis panel */}
          <div className="water-spot" />
          {/* Extremely subtle underwater caustic light */}
          <div className="water-caustics" />
          {/* Flood-only: occasional deep-surface disturbance ripples */}
          {variant !== 'teal' && (
            <>
              <span className="flood-ripple flood-ripple-1" />
              <span className="flood-ripple flood-ripple-2" />
            </>
          )}
          {/* Sparse floating light particles */}
          <span className="water-mote water-mote-1" />
          <span className="water-mote water-mote-2" />
          <span className="water-mote water-mote-3" />
          <span className="water-mote water-mote-4" />
        </div>
      )}

      <div className={`relative z-10 ${water ? 'water-card water-in' : 'glass-card-elevated p-8 text-center'}`}>
        {/* Loader — orbital scan + expanding ripple */}
        <div
          aria-busy="true"
          aria-live="polite"
          role="status"
          className={`relative mx-auto flex h-24 w-24 items-center justify-center ${water ? 'water-in water-in-1' : ''}`}
        >
          {water ? (
            <>
              {/* Occasional expanding ripple */}
              <span className="water-ripple absolute h-24 w-24 rounded-full" />
              {/* Outer slow-rotating scan ring */}
              <span className="water-ring-scan absolute h-24 w-24 rounded-full" />
              {/* Static deep-blue ring with inner radial depth */}
              <span
                className="absolute h-20 w-20 rounded-full border border-[rgba(150,220,250,0.26)]"
                style={{ background: 'radial-gradient(closest-side, rgba(24,72,112,0.55) 0%, rgba(10,34,60,0.30) 70%, rgba(125,211,252,0.10) 100%)', boxShadow: '0 0 18px -4px rgba(125,211,252,0.35), inset 0 0 14px rgba(125,211,252,0.12)' }}
              />
              {/* Traveling aqua light on inner orbit */}
              <span className="water-orbit absolute h-16 w-16">
                <span className="water-orbit-dot absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#BDEFFF]" />
              </span>
              {/* Gentle pulsing inner ring */}
              <span className="water-ring-pulse absolute h-10 w-10 rounded-full border border-[rgba(125,211,252,0.35)]" />
              <span className="sr-only">Analyzing: {STEPS[activeStep]} step running</span>
            </>
          ) : (
            <>
              <div className="absolute h-20 w-20 rounded-full border-2 border-[rgba(var(--primary-rgb),0.20)] shadow-[0_0_30px_rgba(var(--primary-rgb),0.30)]" />
              <div
                className="h-16 w-16 rounded-full border-4 border-transparent"
                style={{
                  borderTopColor: 'var(--color-primary)',
                  borderRightColor: 'rgba(var(--violet-rgb),0.50)',
                  animation: 'spin-neon 0.9s linear infinite',
                  boxShadow: '0 0 20px rgba(var(--primary-rgb),0.60)',
                }}
              />
              <div className="absolute h-8 w-8 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(var(--primary-rgb),0.10)]" />
              <span className="sr-only">Analyzing: {STEPS[activeStep]} step running</span>
            </>
          )}
        </div>

        <h2 className={`mt-7 text-xl font-semibold ${water ? 'water-title water-in water-in-2' : 'text-white'}`}>
          Analyzing Imagery
        </h2>
        <p className={`mt-2 text-sm ${water ? 'water-subtitle water-in water-in-3' : 'text-[rgba(255,255,255,0.45)]'}`}>
          &ldquo;<span className="font-medium">{question}</span>&rdquo;
        </p>

        {/* Progress — water flowing through a channel */}
        <div
          className={`mx-auto mt-8 h-1.5 w-full max-w-md overflow-hidden rounded-full ${water ? 'water-track water-in water-in-4' : 'bg-[rgba(255,255,255,0.07)]'}`}
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Analysis progress"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ease-out ${water ? 'water-fill' : ''}`}
            style={
              water
                ? undefined
                : {
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-violet) 50%, var(--color-cyan) 100%)',
                    boxShadow: '0 0 12px rgba(var(--primary-rgb),0.60)',
                  }
            }
          >
            {water && <span className="water-fill-flow block h-full rounded-full" style={{ width: `${progress}%` }} />}
          </div>
        </div>
        <p className={`mt-1.5 max-w-md mx-auto text-right text-[11px] ${water ? 'water-pct water-in water-in-4' : 'text-[rgba(255,255,255,0.25)]'}`}>
          {Math.round(progress)}%
        </p>

        {/* Pipeline stages */}
        <div className={`mt-6 flex items-center justify-center gap-2 sm:gap-2.5 ${water ? 'water-in water-in-5' : ''}`}>
          {STEPS.map((label, i) => (
            <Step key={label} label={label} index={i} active={i === activeStep} complete={i < activeStep} />
          ))}
        </div>

        {/* Router label */}
        {activeStep === 1 && workflowLabel && (
          <div
            className={`mx-auto mt-6 inline-flex max-w-md items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm ${
              water
                ? 'water-in water-in-5 flood-router border border-[rgba(125,211,252,0.22)] bg-[rgba(30,80,130,0.18)]'
                : 'border border-[rgba(var(--primary-rgb),0.25)] bg-[rgba(var(--primary-rgb),0.10)]'
            }`}
          >
            <span className={`font-semibold ${water ? 'text-[#8FD8F7]' : 'text-[var(--color-primary)]'}`}>Router:</span>
            <span className={`truncate ${water ? 'text-[rgba(200,228,250,0.70)]' : 'text-[rgba(255,255,255,0.65)]'}`}>{workflowLabel}</span>
          </div>
        )}

        <p className={`mt-6 text-xs ${water ? 'water-note water-in water-in-6' : 'text-[rgba(255,255,255,0.25)]'}`}>
          Processing may take up to ~30 seconds for demo inputs.
        </p>
      </div>
    </div>
  )
}