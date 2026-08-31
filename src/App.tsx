import { useEffect, useRef, useState } from 'react'
import type { AnalysisResult, UploadMode, UploadedImage } from './types'
import type { DemoScenario } from './data/mock'
import UploadScreen from './components/UploadScreen'
import AskScreen from './components/AskScreen'
import AnalyzingScreen from './components/AnalyzingScreen'
import ResultsScreen from './components/ResultsScreen'
import AmbientCanvas from './components/AmbientCanvas'
import Reveal from './components/Reveal'

type Step = 'upload' | 'ask' | 'analyzing' | 'results'

export default function App() {
  const [step, setStep] = useState<Step>('upload')
  const [mode, setMode] = useState<UploadMode>('twoDate')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const timersRef = useRef<number[]>([])

  useEffect(() => () => timersRef.current.forEach((t) => window.clearTimeout(t)), [])

  const schedule = (fn: () => void, ms: number) => {
    const t = window.setTimeout(() => {
      timersRef.current = timersRef.current.filter((x) => x !== t)
      fn()
    }, ms)
    timersRef.current.push(t)
  }

  /** Runs the mock AI pipeline, progressing through the analyzing steps. */
  const startAnalysis = (produce: () => AnalysisResult) => {
    setResult(null)
    setActiveStep(0)
    setStep('analyzing')
    schedule(() => setActiveStep(1), 800)
    schedule(() => setActiveStep(2), 1700)
    schedule(() => setActiveStep(3), 2600)
    schedule(() => {
      setResult(produce())
      setStep('results')
    }, 3400)
  }

  const runScenario = (scenario: DemoScenario) => {
    setMode(scenario.mode)
    setImages(scenario.images)
    setQuestion(scenario.suggestedQuestion)
    startAnalysis(() => scenario.result)
  }

  const goAsk = () => {
    setQuestion('')
    setStep('ask')
  }

  const reset = () => {
    setMode('twoDate')
    setImages([])
    setQuestion('')
    setResult(null)
    setActiveStep(0)
    setStep('upload')
  }

  return (
    <div className="flex min-h-full flex-col">
      {/* Visible-on-focus skip link for keyboard users */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6">
        {step === 'upload' && (
          <Reveal>
            <Hero />
            <div className="mt-6">
              <UploadScreen
                mode={mode}
                images={images}
                onSelectMode={setMode}
                onAddImages={(imgs) => setImages(imgs)}
                onRemoveImage={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
                onContinue={goAsk}
                onRunScenario={runScenario}
              />
            </div>
          </Reveal>
        )}
        {step === 'ask' && (
          <AskScreen
            mode={mode}
            images={images}
            question={question}
            onQuestionChange={setQuestion}
            onAnalyze={() => startAnalysis(() => defaultResultFor(question))}
            onBack={() => setStep('upload')}
          />
        )}
        {step === 'analyzing' && (
          <AnalyzingScreen
            question={question}
            activeStep={activeStep}
            workflowLabel="sat-query/router (demo)"
          />
        )}
        {step === 'results' && result && (
          <ResultsScreen images={images} question={question} result={result} onRestart={reset} />
        )}
      </main>

      <Footer />
    </div>
  )
}

function defaultResultFor(_q: string): AnalysisResult {
  return {
    answer: 'Auto analysis complete. Verify geolocation and revisit with ground data for operational decisions.',
    confidence: 0.7,
    workflowLabel: 'multi-modal router (demo fallback)',
    modelNames: ['sat-query/router', 'sat-query/vqa-base'],
    usageTimeSec: 9.2,
    layers: [],
  }
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-surface-50/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-card">
            <SatIcon />
          </div>
          <span className="font-display text-lg font-semibold text-ink-900">SatQuery AI</span>
        </div>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary">
          MVP Prototype
        </span>
      </div>
    </header>
  )
}

/** Calm hero band shown on the upload step with an animated aurora backdrop. */
function Hero() {
  return (
    <section className="relative overflow-hidden rounded-card ring-1 ring-edge">
      <AmbientCanvas />
      <div className="relative px-6 py-8 sm:px-8 sm:py-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Satellite image Q&amp;A
        </p>
        <h1 className="mt-2 max-w-2xl text-2xl font-semibold sm:text-3xl">
          Ask satellite imagery in plain English — see the evidence on the map.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-500 sm:text-base">
          Upload one image, a dated pair, or an optical + SAR combo. We route your question to the
          right model and show you highlighted map proof alongside a clear answer.
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-edge bg-surface-50/85 px-4 py-4 text-center text-xs text-ink-500">
      SatQuery AI — demo prototype. Results are simulated and not for operational use.
    </footer>
  )
}

function SatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}