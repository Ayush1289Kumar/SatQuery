import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { INDIA_STATES, type CityData } from '../data/indiaMockData';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface IndiaMapHeroProps {
  theme: string;
  className?: string;
  selectedCityId: string | null;
  onCitySelect: (cityId: string | null) => void;
  selectedStateId: string | null;
}

export default function IndiaMapHero({ className, selectedCityId, onCitySelect, selectedStateId }: IndiaMapHeroProps) {
  
  const allCities: CityData[] = INDIA_STATES.flatMap(state => state.cities);

  return (
    <div className={`relative w-full h-full rounded-xl overflow-hidden glass-card flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.2)] to-transparent pointer-events-none" />
      
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 1000,
          center: [82.8, 22.5] // Center of India
        }}
        className="w-full h-full"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={geo.id === selectedStateId || geo.properties.name === selectedStateId ? "var(--color-primary-50)" : "rgba(255, 255, 255, 0.1)"}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth={0.5}
                style={{
                  default: { outline: "none" },
                  hover: { fill: "var(--color-primary-glow)", outline: "none", cursor: 'pointer' },
                  pressed: { fill: "var(--color-primary)", outline: "none" },
                }}
              />
            ))
          }
        </Geographies>

        {allCities.map((city) => (
          <Marker 
            key={city.id} 
            coordinates={city.coordinates}
            onClick={() => onCitySelect(city.id)}
            style={{
              default: { cursor: 'pointer' },
              hover: { cursor: 'pointer' }
            }}
          >
            <circle 
              r={selectedCityId === city.id ? 8 : 4} 
              fill={selectedCityId === city.id ? "var(--color-violet)" : "var(--color-primary)"} 
              stroke="#fff"
              strokeWidth={1}
            />
            {selectedCityId === city.id && (
              <text
                textAnchor="middle"
                y={-12}
                style={{ fontFamily: "var(--font-sans)", fill: "#fff", fontSize: 12, fontWeight: 600 }}
              >
                {city.name}
              </text>
            )}
          </Marker>
        ))}
      </ComposableMap>
    </div>
  );
}
