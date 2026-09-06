import { useMemo, useState } from 'react';
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
  activeCity,
}: StateCityPanelProps) {
  // Free-text value shown in the input — kept separate from selectedStateId
  // so people can type/search by keyboard before a valid state is matched.
  const [stateQuery, setStateQuery] = useState('');

  const selectedState = INDIA_STATES.find((s) => s.id === selectedStateId);
  const cities = selectedState ? [...selectedState.cities].sort((a, b) => a.name.localeCompare(b.name)) : [];

  const sortedStates = useMemo(
    () => [...INDIA_STATES].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const handleStateInput = (value: string) => {
    setStateQuery(value);
    const match = sortedStates.find((s) => s.name.toLowerCase() === value.trim().toLowerCase());
    if (match) {
      onStateSelect(match.id);
      onCitySelect(null);
    } else if (value.trim() === '') {
      onStateSelect(null);
      onCitySelect(null);
    }
  };

  return (
    <div className="region-panel flex h-full w-full flex-col gap-4 overflow-y-auto p-6">
      <div>
        <h3 className="mb-2 font-display text-xl font-semibold text-[var(--rp-ink)]">Region Focus</h3>
        <p className="mb-4 text-sm leading-relaxed text-[var(--rp-ink-soft)]">
          Type any Indian state or union territory, then pick a city to view localized satellite analytics.
        </p>

        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--rp-ink-faint)]">
          State or Union Territory
        </label>
        <input
          type="text"
          list="india-states-list"
          placeholder="Start typing e.g. Kerala, Punjab..."
          value={stateQuery || selectedState?.name || ''}
          onChange={(e) => handleStateInput(e.target.value)}
          className="mb-4 w-full rounded-lg border border-[var(--rp-border)] bg-[var(--rp-input-bg)] p-2.5 text-[var(--rp-ink)] placeholder:text-[var(--rp-ink-faint)] outline-none transition-colors focus:border-[var(--rp-accent)]"
        />
        <datalist id="india-states-list">
          {sortedStates.map((s) => (
            <option key={s.id} value={s.name} />
          ))}
        </datalist>

        {selectedStateId && (
          <>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--rp-ink-faint)]">
              City
            </label>
            <div className="flex flex-col gap-2">
              {cities.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onCitySelect(c.id)}
                  className={`rounded-lg border px-4 py-3 text-left transition-all duration-200 ${
                    selectedCityId === c.id
                      ? 'border-[var(--rp-accent)] bg-[var(--rp-accent)] text-white shadow-sm'
                      : 'border-[var(--rp-border)] bg-[var(--rp-card-bg)] text-[var(--rp-ink-soft)] hover:border-[var(--rp-accent)] hover:bg-[var(--rp-card-bg-hover)]'
                  }`}
                >
                  <div className="font-semibold">{c.name}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {activeCity && (
        <div className="reveal is-visible mt-2 border-t border-[var(--rp-border)] pt-5">
          <h4 className="mb-2 font-display text-lg text-[var(--rp-accent-strong)]">{activeCity.name} Analytics</h4>
          <p className="mb-4 text-sm text-[var(--rp-ink-soft)]">{activeCity.description}</p>

          <div className="space-y-3">
            {activeCity.history.map((record) => (
              <div key={record.year} className="rounded-lg border border-[var(--rp-border)] bg-[var(--rp-card-bg)] p-3">
                <div className="mb-2 font-semibold text-[var(--rp-accent-strong)]">{record.year}</div>
                <div className="grid grid-cols-2 gap-2 text-xs text-[var(--rp-ink)]">
                  {record.urbanDensity !== undefined && (
                    <div><span className="text-[var(--rp-ink-faint)]">Urban:</span> {record.urbanDensity}%</div>
                  )}
                  {record.waterLevel !== undefined && (
                    <div><span className="text-[var(--rp-ink-faint)]">Water:</span> {record.waterLevel}%</div>
                  )}
                  {record.vegetationIndex !== undefined && (
                    <div><span className="text-[var(--rp-ink-faint)]">Veg:</span> {record.vegetationIndex}</div>
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
