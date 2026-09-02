import { useEffect, useRef, useState } from 'react'
import type { AnalysisResult, UploadMode, UploadedImage } from './types'
import type { DemoScenario } from './data/mock'
import UploadScreen from './components/UploadScreen'
import AskScreen from './components/AskScreen'
import AnalyzingScreen from './components/AnalyzingScreen'
import ResultsScreen from './components/ResultsScreen'
import GlobeHero from './components/GlobeHero'
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
    <div className="relative flex min-h-full flex-col bg-[#000000]">
      {/* Viewport glow frame */}
      <div className="glow-frame" aria-hidden />

      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#10b981] focus:px-5 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">
        {step === 'upload' && (
          <Reveal>
            <HeroSection />
            <div className="mt-8">
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
    <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.70)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#10b981] to-[#65a30d] shadow-[0_0_20px_-4px_rgba(16,185,129,0.7)]">
            <SatIcon />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
          </div>
          <div>
            <span className="font-display text-lg font-semibold tracking-tight text-white">SatQuery</span>
            <span className="ml-1 font-display text-lg font-light text-[rgba(255,255,255,0.45)]">AI</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-[rgba(16,185,129,0.35)] bg-[rgba(16,185,129,0.12)] px-3 py-1 text-xs font-semibold text-[#10b981] sm:inline-flex">
            MVP Prototype
          </span>
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.7)]" title="Online" />
        </div>
      </div>
    </header>
  )
}

/** Hero section: globe fills a wide full-row strip below the copy on mobile,
 *  and sits beside it on desktop — always contained within overflow-hidden. */
function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
      {/* Subtle gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[rgba(101,163,13,0.10)] via-transparent to-[rgba(16,185,129,0.08)]"
      />
      {/* Grid pattern overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/*
        Layout:
        - mobile / tablet (<lg):  copy stacked on top, then globe taking up 560px below
        - desktop (≥lg):  two-column side-by-side, globe column is wider (1.3fr)
      */}
      <div className="relative flex flex-col lg:grid lg:grid-cols-[1fr_1.3fr] lg:items-center">
        {/* Left: copy */}
        <div className="px-8 py-10 sm:px-10 sm:py-12 lg:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(101,163,13,0.35)] bg-[rgba(101,163,13,0.10)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#65a30d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#65a30d] animate-pulse" />
            Satellite Image Q&A
          </div>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.6rem]">
            Ask satellite imagery{' '}
            <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#65a30d]">
              in plain English
            </em>{' '}
            — see the evidence on the map.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[rgba(255,255,255,0.55)]">
            Upload one image, a dated pair, or an optical + SAR combo. We route your
            question to the right model and show you highlighted map proof alongside
            a clear answer.
          </p>

          {/* Stat pills */}
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              { icon: '🛰', label: 'Multi-spectral', color: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.30)', text: '#10b981' },
              { icon: '🔬', label: 'Sub-meter res.', color: 'rgba(101,163,13,0.15)', border: 'rgba(101,163,13,0.30)', text: '#65a30d' },
              { icon: '⚡', label: '<10s latency', color: 'rgba(134,239,172,0.15)', border: 'rgba(134,239,172,0.30)', text: '#86efac' },
            ].map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{ background: s.color, borderColor: s.border, color: s.text }}
              >
                <span>{s.icon}</span>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Right: globe — 560px on mobile/tablet, 680px on desktop, always inside card */}
        <div className="relative h-[560px] lg:h-[680px]">
          <GlobeHero className="h-full w-full" />
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-[rgba(255,255,255,0.07)] bg-[rgba(0,0,0,0.50)] px-4 py-5">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
        <span className="text-xs text-[rgba(255,255,255,0.30)]">
          SatQuery AI — demo prototype. Results are simulated and not for operational use.
        </span>
        <span className="text-xs text-[rgba(255,255,255,0.20)]">© 2024</span>
      </div>
    </footer>
  )
}

function SatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="text-white">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}