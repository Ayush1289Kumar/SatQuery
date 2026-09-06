import { ArrowDown } from 'lucide-react';
import Logo from './Logo';
import EarthObservationScene from './three/EarthObservationScene';

interface LandingHeroProps {
  onGetStarted: () => void;
}

export default function LandingHero({ onGetStarted }: LandingHeroProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050604]">
      {/* Background radial gradient to give depth without being busy */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background: 'radial-gradient(ellipse at 70% 50%, rgba(20, 40, 30, 0.4) 0%, transparent 60%)',
        }}
      />
      
      {/* Brand lockup */}
      <div className="absolute left-6 top-6 z-20 flex items-center sm:left-10 sm:top-8">
        <Logo />
      </div>

      <div className="flex h-full w-full flex-col md:flex-row">
        {/* Left side: Content (approx 45%) */}
        <div className="relative z-10 flex h-full flex-col justify-center px-6 pt-32 pb-12 md:pt-32 md:pb-16 md:w-[45%] md:pl-16 xl:pl-24">
          <div className="max-w-lg">
            <span className="mb-4 inline-block text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-primary)]">
              India &middot; Satellite Intelligence
            </span>
            <h1 className="font-display text-3xl font-medium leading-[1.15] text-white sm:text-4xl lg:text-5xl">
              Purposeful, evidence-based
              <br />
              <span className="italic text-[var(--color-primary)]">land &amp; disaster</span> intelligence.
            </h1>
            <p className="mt-4 text-xs font-light leading-relaxed text-white/70 sm:text-sm max-w-md">
              Explore the subcontinent, ask a satellite image a plain-English question,
              and get an answer backed by visual proof on the map.
            </p>
            
            <button
              onClick={onGetStarted}
              className="group mt-10 flex items-center gap-2.5 w-fit rounded-full border border-[var(--color-primary-glow)] bg-black/30 px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-xl transition-all duration-300 hover:bg-[var(--color-primary)] hover:text-black hover:shadow-[0_0_40px_-4px_var(--color-primary-glow)]"
            >
              Get Started
              <ArrowDown className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </button>
          </div>
        </div>

        {/* Right side: 3D Visualization (approx 55%) */}
        <div className="relative z-0 h-[50vh] w-full md:h-full md:w-[55%]">
          <EarthObservationScene />
        </div>
      </div>
      
      {/* Mobile-only subtle gradient to separate text from 3D object */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-32 bg-gradient-to-b from-[#050604] to-transparent md:hidden" aria-hidden />
    </div>
  );
}
