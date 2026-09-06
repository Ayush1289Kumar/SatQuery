import type { Category } from './CategoryPanel';
import { Sparkles, ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

interface AIQuerySuggestionsProps {
  activeCategory: Category;
  onSuggestionClick: (query: string) => void;
}

const SUGGESTIONS: Record<Category, string[]> = {
  home: [
    "Analyze overall vegetation changes in India over the past year.",
    "Highlight major infrastructure developments across states.",
    "Show national water resource levels and anomaly zones."
  ],
  agriculture: [
    "Analyze crop yield patterns in Punjab over the last 3 years.",
    "Show me vegetation index changes in Maharashtra during monsoon.",
    "Identify drought-affected agricultural zones in Gujarat."
  ],
  disaster: [
    "Highlight flood inundation areas in Assam from July 2023.",
    "Show earthquake damage assessment in Nepal border region.",
    "Detect wildfire scars in Uttarakhand forests."
  ],
  urban: [
    "Track urban sprawl in Bengaluru from 2018 to 2023.",
    "Analyze green cover loss in New Delhi metropolitan area.",
    "Identify new infrastructure development in Pune suburbs."
  ],
  forest: [
    "Show deforestation rates in the Western Ghats.",
    "Monitor illegal logging activities in central India.",
    "Analyze forest canopy density in the Himalayas."
  ],
  water: [
    "Assess shrinking water bodies in Chennai.",
    "Monitor glacial retreat in the northern Himalayas.",
    "Analyze groundwater depletion indicators in Punjab."
  ],
  infrastructure: [
    "Track construction progress of the new Mumbai coastal road.",
    "Identify major highway expansions in Gujarat.",
    "Monitor solar farm developments in Rajasthan."
  ]
};

export default function AIQuerySuggestions({ activeCategory, onSuggestionClick }: AIQuerySuggestionsProps) {
  const suggestions = SUGGESTIONS[activeCategory] || [];

  return (
    <Reveal className="region-panel relative mt-4 w-full overflow-hidden rounded-2xl border border-[var(--rp-border)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--rp-border)] bg-white/40">
          <Sparkles className="h-3.5 w-3.5 text-[var(--rp-accent-strong)] animate-pulse" strokeWidth={2.25} />
        </div>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--rp-ink)]">
          AI Query Suggestions
        </h4>
      </div>
      <div className="flex flex-col gap-2.5">
        {suggestions.map((query, idx) => (
          <Reveal key={idx} delay={idx * 80}>
            <button
              onClick={() => onSuggestionClick(query)}
              className="group flex w-full items-center justify-between gap-3 rounded-lg border border-[var(--rp-border)] bg-white/40 px-4 py-3 text-left text-sm text-[var(--rp-ink-soft)] shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-[var(--rp-accent)] hover:bg-[var(--rp-card-bg)] hover:text-[var(--rp-ink)] hover:shadow-md"
            >
              <span>{query}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-[var(--rp-accent-strong)] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
            </button>
          </Reveal>
        ))}
      </div>
    </Reveal>
  );
}
