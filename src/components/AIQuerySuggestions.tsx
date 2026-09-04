import type { Category } from './CategoryPanel';

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
    <div className="w-full glass-card p-5 mt-4 reveal is-visible">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--color-primary)]">✨</span>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.7)]">
          AI Query Suggestions
        </h4>
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((query, idx) => (
          <button
            key={idx}
            onClick={() => onSuggestionClick(query)}
            className="text-left px-4 py-2.5 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.06)] hover:border-[var(--color-primary-50)] transition-all duration-200 text-sm text-[rgba(255,255,255,0.85)] hover:text-white group flex items-center justify-between"
          >
            <span>{query}</span>
            <span className="opacity-0 group-hover:opacity-100 text-[var(--color-primary)] transition-opacity">
              →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
