import { useEffect, useRef, useState } from 'react'
import type { AnalysisResult, UploadMode, UploadedImage } from './types'
import type { DemoScenario } from './data/mock'
import UploadScreen from './components/UploadScreen'
import AskScreen from './components/AskScreen'
import AnalyzingScreen from './components/AnalyzingScreen'
import ResultsScreen from './components/ResultsScreen'
import Reveal from './components/Reveal'
import CategoryPanel, { type Category } from './components/CategoryPanel'
import RegionMap from './components/RegionMap'
import StateCityPanel from './components/StateCityPanel'
import AmbientCanvas from './components/AmbientCanvas'
import AIQuerySuggestions from './components/AIQuerySuggestions'
import CategoryPage from './components/CategoryPage'
import LandingHero from './components/LandingHero'
import Logo from './components/Logo'
import { INDIA_STATES } from './data/indiaMockData'
import { Satellite, Microscope } from 'lucide-react'

type Step = 'landing' | 'upload' | 'ask' | 'analyzing' | 'results'

// Each category gets its own palette pulled from the existing theme set:
// earthy tones for land-facing categories, dusty misty blue for water/flood.
const CATEGORY_THEME: Record<Category, string> = {
  home: 'moss-forestry',
  agriculture: 'olive-sage',
  forest: 'forest-canopy',
  disaster: 'aqua-teal',
  water: 'aqua-teal',
  urban: 'mint-pine',
  infrastructure: 'jungle-night',
}

export default function App() {
  const [theme, setTheme] = useState('moss-forestry')
  const [activeCategory, setActiveCategory] = useState<Category>('home')

  const selectCategory = (cat: Category) => {
    setActiveCategory(cat)
    setTheme(CATEGORY_THEME[cat])
  }
  const [step, setStep] = useState<Step>('upload')
  const [mode, setMode] = useState<UploadMode>('twoDate')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  // Visual-only flag: the flood-extent demo runs inside an aquatic environment.
  const [waterAnalysis, setWaterAnalysis] = useState(false)
  const [waterVariant, setWaterVariant] = useState<'azure' | 'teal'>('azure')
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
    // Aquatic analysis environments: flood extent (deep ocean) + water body mapping (deep teal)
    setWaterAnalysis(scenario.id === 'flood' || scenario.id === 'water')
    setWaterVariant(scenario.id === 'water' ? 'teal' : 'azure')
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
    setWaterAnalysis(false)
    setWaterVariant('azure')
    setStep('upload')
  }

  return (
    <div className="app-shell relative flex min-h-full flex-col bg-[var(--color-surface)]">
      {/* Viewport glow frame */}
      <div className="glow-frame" aria-hidden />

      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-primary)] focus:px-5 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <LandingHero onGetStarted={() => {
        document.getElementById('main')?.scrollIntoView({ behavior: 'smooth' })
      }} />

      <Header />

      <main id="main" className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6">
        {step === 'upload' && (
          <Reveal>
            <CategoryPanel activeCategory={activeCategory} onCategoryChange={selectCategory} />
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
            water={waterAnalysis}
            variant={waterVariant}
          />
        )}
        {step === 'results' && result && (
          <ResultsScreen images={images} question={question} result={result} onRestart={reset} water={waterAnalysis} variant={waterVariant} />
        )}
      </main>

      {step !== 'landing' && <Footer />}
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
    <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-[var(--color-surface-50)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3.5">
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full border border-[var(--color-primary-glow)] bg-[var(--color-primary-50)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] sm:inline-flex">
            MVP Prototype
          </span>
          <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary-glow)]" title="Online" />
        </div>
      </div>
    </header>
  )
}

function HeroSection() {
  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  const activeCity = INDIA_STATES.flatMap(s => s.cities).find(c => c.id === selectedCityId) || null;

  return (
    <section className="hero-earthy relative overflow-hidden rounded-2xl border border-[var(--he-border)]">
      {/* Animated aurora backdrop — drifting moss/sand/sage blobs read nicely against the cream backdrop */}
      <AmbientCanvas />

      <div className="relative flex flex-col gap-8 px-6 py-8 sm:px-8 sm:py-10">
        {/* Top: intro copy, full width */}
        <Reveal className="reveal-stagger flex max-w-3xl flex-col gap-4" as="div">
          <div className="inline-flex self-start items-center gap-2 rounded-full border border-[var(--he-accent-border)] bg-[var(--he-accent-50)] px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[var(--he-accent-strong)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--he-accent-strong)] animate-pulse" />
            India Analytics
          </div>
          <h1 className="font-display text-2xl font-semibold leading-tight text-[var(--he-ink)] sm:text-3xl lg:text-[2.2rem]">
            Ask satellite imagery{' '}
            <em className="italic text-[var(--he-accent-strong)]">in plain English</em>{' '}
            — see the evidence on the map.
          </h1>
          <p className="text-sm leading-relaxed text-[var(--he-ink-soft)]">
            Upload images or run a query. We route your question to the right AI model and show you highlighted map proof alongside a clear answer for regions across India.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Satellite, label: 'Multi-spectral' },
              { icon: Microscope, label: 'Sub-meter res.' },
            ].map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--he-accent-border)] bg-[var(--he-accent-50)] px-3 py-1.5 text-xs font-semibold text-[var(--he-accent-strong)]"
              >
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </span>
            ))}
          </div>
        </Reveal>

        {/* Bottom: map (left, larger) + region panel (right) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr] lg:items-stretch">
          <Reveal
            delay={80}
            className="relative min-h-[360px] overflow-hidden rounded-xl border border-[var(--he-border)] shadow-xl lg:min-h-[440px]"
          >
            <RegionMap activeCity={activeCity} activeStateName={INDIA_STATES.find(s => s.id === selectedStateId)?.name ?? null} />
          </Reveal>

          <Reveal
            delay={160}
            className="relative min-h-[360px] overflow-hidden rounded-xl border border-[var(--he-border)] shadow-xl lg:min-h-[440px]"
          >
            <StateCityPanel
              selectedStateId={selectedStateId}
              onStateSelect={setSelectedStateId}
              selectedCityId={selectedCityId}
              onCitySelect={setSelectedCityId}
              activeCity={activeCity}
            />
          </Reveal>
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
          GEO-NIUS — demo prototype. Results are simulated and not for operational use.
        </span>
        <span className="text-xs text-[rgba(255,255,255,0.20)]">© 2024</span>
      </div>
    </footer>
  )
}




