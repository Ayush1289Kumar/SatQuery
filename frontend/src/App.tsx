import { useEffect, useRef, useState } from 'react'
import type { AnalysisResult, UploadMode, UploadedImage } from './types'
import type { DemoScenario } from './data/mock'
import UploadScreen from './components/UploadScreen'
import AskScreen from './components/AskScreen'
import AnalyzingScreen from './components/AnalyzingScreen'
import ResultsScreen from './components/ResultsScreen'

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
    <div className="flex h-full flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {step === 'upload' && (
          <UploadScreen
            mode={mode}
            images={images}
            onSelectMode={setMode}
            onAddImages={(imgs) => setImages(imgs)}
            onRemoveImage={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
            onContinue={goAsk}
            onRunScenario={runScenario}
          />
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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <SatIcon />
          </div>
          <span className="text-lg font-bold text-slate-900">SatQuery AI</span>
        </div>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary">
          MVP Prototype
        </span>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs text-slate-400">
      SatQuery AI — demo prototype. Results are simulated and not for operational use.
    </footer>
  )
}

function SatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}