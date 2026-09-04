import { INDIA_STATES, type CityData } from '../data/indiaMockData';

interface StateCityPanelProps {
  selectedStateId: string | null;
  onStateSelect: (stateId: string | null) => void;
  selectedCityId: string | null;
  onCitySelect: (cityId: string | null) => void;
  activeCity: CityData | null;
}

export default function StateCityPanel({
  selectedStateId,
  onStateSelect,
  selectedCityId,
  onCitySelect,
  activeCity
}: StateCityPanelProps) {
  
  const selectedState = INDIA_STATES.find(s => s.id === selectedStateId);
  const cities = selectedState ? [...selectedState.cities].sort((a, b) => a.name.localeCompare(b.name)) : [];

  return (
    <div className="flex flex-col gap-4 w-full h-full p-6 glass-card-elevated overflow-y-auto">
      <div>
        <h3 className="text-xl font-semibold mb-3">Region Focus</h3>
        <p className="text-sm text-[rgba(255,255,255,0.6)] mb-4">
          Select a state and city to view localized satellite analytics and historical data.
        </p>
        
        <label className="block text-xs font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
          State
        </label>
        <select 
          className="w-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-lg p-2.5 text-white mb-4 outline-none focus:border-[var(--color-primary)] transition-colors"
          value={selectedStateId || ''}
          onChange={(e) => {
            onStateSelect(e.target.value || null);
            onCitySelect(null);
          }}
        >
          <option value="" className="bg-[var(--color-surface)]">-- Select State --</option>
          {INDIA_STATES.map(s => (
            <option key={s.id} value={s.id} className="bg-[var(--color-surface)]">{s.name}</option>
          ))}
        </select>

        {selectedStateId && (
          <>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[rgba(255,255,255,0.5)] mb-2">
              City
            </label>
            <div className="flex flex-col gap-2">
              {cities.map(city => (
                <button
                  key={city.id}
                  onClick={() => onCitySelect(city.id)}
                  className={`text-left px-4 py-3 rounded-lg border transition-all duration-200 ${
                    selectedCityId === city.id 
                      ? 'bg-[var(--color-primary-50)] border-[var(--color-primary)] text-white' 
                      : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.08)]'
                  }`}
                >
                  <div className="font-semibold">{city.name}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {activeCity && (
        <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)] reveal is-visible">
          <h4 className="text-lg font-display text-[var(--color-primary)] mb-2">{activeCity.name} Analytics</h4>
          <p className="text-sm text-[rgba(255,255,255,0.7)] mb-4">{activeCity.description}</p>
          
          <div className="space-y-3">
            {activeCity.history.map(record => (
              <div key={record.year} className="bg-[rgba(0,0,0,0.3)] rounded-lg p-3 border border-[rgba(255,255,255,0.05)]">
                <div className="font-semibold text-[var(--color-violet)] mb-2">{record.year}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {record.urbanDensity !== undefined && (
                    <div><span className="text-[rgba(255,255,255,0.5)]">Urban:</span> {record.urbanDensity}%</div>
                  )}
                  {record.waterLevel !== undefined && (
                    <div><span className="text-[rgba(255,255,255,0.5)]">Water:</span> {record.waterLevel}%</div>
                  )}
                  {record.vegetationIndex !== undefined && (
                    <div><span className="text-[rgba(255,255,255,0.5)]">Veg:</span> {record.vegetationIndex}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
