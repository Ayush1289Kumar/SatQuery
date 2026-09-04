export type Category = 'home' | 'agriculture' | 'disaster' | 'urban' | 'forest' | 'water' | 'infrastructure';

interface CategoryPanelProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

const CATEGORIES: { id: Category; label: string; icon: string }[] = [
  { id: 'home', label: 'India Dashboard', icon: '🇮🇳' },
  { id: 'agriculture', label: 'Agricultural Monitoring', icon: '🌾' },
  { id: 'disaster', label: 'Disaster Management', icon: '🚨' },
  { id: 'urban', label: 'Urban Planning', icon: '🏙️' },
  { id: 'forest', label: 'Forest Monitoring', icon: '🌲' },
  { id: 'water', label: 'Water Resource Assessment', icon: '💧' },
  { id: 'infrastructure', label: 'Infrastructure Mapping', icon: '🌉' }
];

export default function CategoryPanel({ activeCategory, onCategoryChange }: CategoryPanelProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
            activeCategory === cat.id
              ? 'bg-[var(--color-primary)] text-white shadow-[0_0_20px_var(--color-primary-glow)] scale-105'
              : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.1)] hover:text-white'
          }`}
        >
          <span className="text-lg">{cat.icon}</span>
          {cat.label}
        </button>
      ))}
    </div>
  );
}
