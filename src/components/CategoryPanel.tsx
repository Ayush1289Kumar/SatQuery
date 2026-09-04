import { Map, Sprout, Siren, Building2, Trees, Droplets, Route, type LucideIcon } from 'lucide-react';

export type Category = 'home' | 'agriculture' | 'disaster' | 'urban' | 'forest' | 'water' | 'infrastructure';

interface CategoryPanelProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

const CATEGORIES: { id: Category; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'India Dashboard', icon: Map },
  { id: 'agriculture', label: 'Agricultural Monitoring', icon: Sprout },
  { id: 'disaster', label: 'Disaster Management', icon: Siren },
  { id: 'urban', label: 'Urban Planning', icon: Building2 },
  { id: 'forest', label: 'Forest Monitoring', icon: Trees },
  { id: 'water', label: 'Water Resource Assessment', icon: Droplets },
  { id: 'infrastructure', label: 'Infrastructure Mapping', icon: Route }
];

export default function CategoryPanel({ activeCategory, onCategoryChange }: CategoryPanelProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-8">
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-md border text-sm font-medium transition-all duration-200 shadow-sm ${
            activeCategory === cat.id
              ? 'bg-[var(--color-primary-50)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-[0_2px_10px_var(--color-primary-glow)] scale-[1.02]'
              : 'bg-black/20 border-white/10 text-white/70 hover:bg-white/10 hover:text-white hover:border-white/20'
          }`}
        >
          <cat.icon className={`w-4 h-4 ${activeCategory === cat.id ? 'text-[var(--color-primary)]' : 'text-white/60 group-hover:text-white'}`} />
          {cat.label}
        </button>
      ))}
    </div>
  );
}
