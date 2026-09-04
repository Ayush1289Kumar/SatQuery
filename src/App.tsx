import { useEffect, useRef, useState } from 'react'
import type { AnalysisResult, UploadMode, UploadedImage } from './types'
import type { DemoScenario } from './data/mock'
import UploadScreen from './components/UploadScreen'
import AskScreen from './components/AskScreen'
import AnalyzingScreen from './components/AnalyzingScreen'
import ResultsScreen from './components/ResultsScreen'
import Reveal from './components/Reveal'
import CategoryPanel, { type Category } from './components/CategoryPanel'
import IndiaMapHero from './components/IndiaMapHero'
import StateCityPanel from './components/StateCityPanel'
import AIQuerySuggestions from './components/AIQuerySuggestions'
import CategoryPage from './components/CategoryPage'
import { INDIA_STATES } from './data/indiaMockData'
import { Satellite, Microscope } from 'lucide-react'

type Step = 'upload' | 'ask' | 'analyzing' | 'results'

export default function App() {
  const [theme, setTheme] = useState('neon-flora')
  const [activeCategory, setActiveCategory] = useState<Category>('home')
  const [step, setStep] = useState<Step>('upload')
  const [mode, setMode] = useState<UploadMode>('twoDate')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const timersRef = useRef<number[]>([])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

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
    <div className="relative flex min-h-full flex-col bg-[var(--color-surface)]">
      {/* Viewport glow frame */}
      <div className="glow-frame" aria-hidden />

      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-primary)] focus:px-5 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Header theme={theme} onThemeChange={setTheme} />

      <main id="main" className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">
        {step === 'upload' && (
          <Reveal>
            <CategoryPanel activeCategory={activeCategory} onCategoryChange={setActiveCategory} />
            {activeCategory === 'home' ? (
              <HeroSection />
            ) : (
              <CategoryPage category={activeCategory} />
            )}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
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
              <div className="lg:col-span-1">
                <AIQuerySuggestions 
                  activeCategory={activeCategory} 
                  onSuggestionClick={(q) => { 
                    setQuestion(q); 
                    setStep('ask'); 
                  }} 
                />
              </div>
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

function Header({ theme, onThemeChange }: { theme: string, onThemeChange: (t: string) => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-[var(--color-surface-50)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-violet)] shadow-[0_0_20px_-4px_var(--color-primary-glow)]">
            <SatIcon />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
          </div>
          <div>
            <span className="font-display text-lg font-semibold tracking-tight text-white">SatQuery</span>
            <span className="ml-1 font-display text-lg font-light text-[rgba(255,255,255,0.45)]">AI</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeSwitcher theme={theme} onThemeChange={onThemeChange} />
          <span className="hidden rounded-full border border-[var(--color-primary-glow)] bg-[var(--color-primary-50)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] sm:inline-flex">
            MVP Prototype
          </span>
          <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary-glow)]" title="Online" />
        </div>
      </div>
    </header>
  )
}

function ThemeSwitcher({ theme, onThemeChange }: { theme: string, onThemeChange: (t: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const themes = [
    { id: 'neon-flora', name: 'Neon Flora' },
    { id: 'forest-canopy', name: 'Forest Canopy' },
    { id: 'olive-sage', name: 'Olive & Sage' },
    { id: 'mint-pine', name: 'Mint & Pine' },
    { id: 'jungle-night', name: 'Jungle Night' }
  ];
  const activeName = themes.find(t => t.id === theme)?.name || 'Theme';

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-full border border-[var(--color-primary-glow)] bg-[var(--color-primary-50)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] outline-none hover:bg-[var(--color-primary-glow)] transition-colors"
      >
        {activeName}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-36 z-50 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[var(--color-surface-50)] p-1.5 shadow-2xl backdrop-blur-xl">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  onThemeChange(t.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${
                  theme === t.id 
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary)] font-semibold' 
                    : 'text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HeroSection() {
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  const activeCity = INDIA_STATES.flatMap(s => s.cities).find(c => c.id === selectedCityId) || null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
      {/* Subtle gradient backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-[rgba(var(--primary-rgb),0.10)] via-transparent to-[rgba(var(--violet-rgb),0.08)]"
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

      <div className="relative flex flex-col lg:grid lg:grid-cols-[1fr_1fr_1fr] lg:items-stretch min-h-[500px]">
        {/* Left: copy */}
        <div className="px-6 py-8 sm:px-8 sm:py-10 flex flex-col justify-center">
          <div className="inline-flex self-start items-center gap-2 rounded-full border border-[var(--color-violet-50)] bg-[var(--color-violet-50)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--color-violet)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-violet)] animate-pulse" />
            India Analytics
          </div>
          <h1 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl lg:text-[2.2rem]">
            Ask satellite imagery{' '}
            <em className="not-italic text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-violet)]">
              in plain English
            </em>{' '}
            — see the evidence on the map.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-[rgba(255,255,255,0.55)]">
            Upload images or run a query. We route your question to the right AI model and show you highlighted map proof alongside a clear answer for regions across India.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { icon: Satellite, label: 'Multi-spectral', color: 'var(--color-primary-50)', border: 'var(--color-primary-glow)', text: 'var(--color-primary)' },
              { icon: Microscope, label: 'Sub-meter res.', color: 'var(--color-violet-50)', border: 'var(--color-violet-50)', text: 'var(--color-violet)' },
            ].map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold"
                style={{ background: s.color, borderColor: s.border, color: s.text }}
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Middle: Map */}
        <div className="relative p-2 sm:p-4 border-y lg:border-y-0 lg:border-x border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] min-h-[300px]">
          <IndiaMapHero 
            selectedCityId={selectedCityId} 
            onCitySelect={setSelectedCityId}
            selectedStateId={selectedStateId}
          />
        </div>

        {/* Right: State/City Panel */}
        <div className="relative bg-[rgba(255,255,255,0.01)] min-h-[300px]">
          <StateCityPanel
            selectedStateId={selectedStateId}
            onStateSelect={setSelectedStateId}
            selectedCityId={selectedCityId}
            onCitySelect={setSelectedCityId}
            activeCity={activeCity}
          />
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