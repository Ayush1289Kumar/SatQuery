import type { Category } from './CategoryPanel'
import { BarChart3 } from 'lucide-react'

interface CategoryPageProps {
  category: Category;
}

export default function CategoryPage({ category }: CategoryPageProps) {
  const titleMap: Record<string, string> = {
    agriculture: 'Agricultural Monitoring',
    disaster: 'Disaster Management',
    urban: 'Urban Planning',
    forest: 'Forest Monitoring',
    water: 'Water Resource Assessment',
    infrastructure: 'Infrastructure Mapping',
  };

  const getMetricData = (cat: string) => {
    switch(cat) {
      case 'forest': return [
        { label: 'Deforestation Rate', value: '-2.4%', trend: 'good' },
        { label: 'Canopy Density', value: '78%', trend: 'neutral' },
        { label: 'Protected Area', value: '1.2M ha', trend: 'good' },
      ];
      case 'water': return [
        { label: 'Reservoir Levels', value: '64%', trend: 'bad' },
        { label: 'Flood Risk Areas', value: '12', trend: 'bad' },
        { label: 'Water Quality Index', value: '85', trend: 'good' },
      ];
      default: return [
        { label: 'Active Scans', value: '142', trend: 'good' },
        { label: 'Anomalies Detected', value: '3', trend: 'neutral' },
        { label: 'Area Covered', value: '450k sq km', trend: 'good' },
      ];
    }
  }

  const metrics = getMetricData(category);

  return (
    <div data-theme={category} className="mt-8 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Area */}
      <div className="flex items-center justify-between p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[var(--color-surface-50)]">
        <div>
          <h2 className="text-3xl font-display font-semibold text-white">
            {titleMap[category] || 'Category Dashboard'}
          </h2>
          <p className="mt-2 text-[rgba(255,255,255,0.6)]">
            Viewing specialized metrics and AI analysis tools for {titleMap[category]}.
          </p>
        </div>
        <div className="h-14 w-14 rounded-md bg-[var(--color-primary-50)] border border-[var(--color-primary)] flex items-center justify-center shadow-[0_4px_20px_var(--color-primary-glow)]">
          <BarChart3 className="w-6 h-6 text-[var(--color-primary)]" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="p-5 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
            <div className="text-[rgba(255,255,255,0.5)] text-sm font-medium mb-1">{m.label}</div>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-semibold text-[var(--color-primary)]">{m.value}</div>
              <div className={`text-xs mb-1 font-medium px-2 py-0.5 rounded-full ${
                m.trend === 'good' ? 'bg-green-500/20 text-green-400' :
                m.trend === 'bad' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {m.trend === 'good' ? '↑' : m.trend === 'bad' ? '↓' : '→'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dummy Visualization Area */}
      <div className="h-[400px] w-full rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)] relative overflow-hidden flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-white">Spatial Analysis Engine</h3>
          <div className="flex gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
            <span className="text-xs text-[var(--color-primary)]">Live Sync</span>
          </div>
        </div>
        
        {/* Mock Chart Area */}
        <div className="flex-1 flex items-end gap-2 sm:gap-4 px-2 pb-8 border-b border-l border-[rgba(255,255,255,0.1)]">
          {[40, 65, 30, 80, 50, 90, 75, 45, 85, 60].map((val, i) => (
            <div key={i} className="flex-1 bg-[var(--color-primary)] rounded-t-sm opacity-80 hover:opacity-100 transition-all cursor-pointer relative group" style={{ height: `${val}%` }}>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-surface-50)] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {val}%
              </div>
            </div>
          ))}
        </div>
        
        {/* X-axis labels mock */}
        <div className="flex justify-between mt-3 text-xs text-[rgba(255,255,255,0.4)] px-2">
          <span>Region Alpha</span>
          <span>Region Beta</span>
          <span>Region Gamma</span>
        </div>
      </div>

    </div>
  )
}
