export interface HistoricalData {
  year: number;
  vegetationIndex?: number;
  waterLevel?: number;
  urbanDensity?: number;
}

export interface CityData {
  id: string;
  name: string;
  coordinates: [number, number]; // [longitude, latitude]
  history: HistoricalData[];
  description: string;
}

export interface StateData {
  id: string;
  name: string;
  cities: CityData[];
}

export const INDIA_STATES: StateData[] = [
  {
    id: 'mh',
    name: 'Maharashtra',
    cities: [
      {
        id: 'mum',
        name: 'Mumbai',
        coordinates: [72.8777, 19.0760],
        description: 'Coastal megacity showing rapid urban expansion and changing coastline dynamics.',
        history: [
          { year: 2021, urbanDensity: 82, waterLevel: 100, vegetationIndex: 45 },
          { year: 2022, urbanDensity: 85, waterLevel: 98, vegetationIndex: 43 },
          { year: 2023, urbanDensity: 88, waterLevel: 102, vegetationIndex: 40 },
        ]
      },
      {
        id: 'pun',
        name: 'Pune',
        coordinates: [73.8567, 18.5204],
        description: 'Growing IT hub with significant shifts in peri-urban agricultural lands.',
        history: [
          { year: 2021, urbanDensity: 65, waterLevel: 80, vegetationIndex: 60 },
          { year: 2022, urbanDensity: 70, waterLevel: 78, vegetationIndex: 55 },
          { year: 2023, urbanDensity: 74, waterLevel: 75, vegetationIndex: 52 },
        ]
      }
    ]
  },
  {
    id: 'ka',
    name: 'Karnataka',
    cities: [
      {
        id: 'blr',
        name: 'Bengaluru',
        coordinates: [77.5946, 12.9716],
        description: 'Silicon Valley of India facing challenges with vanishing lakes and green cover loss.',
        history: [
          { year: 2021, urbanDensity: 78, waterLevel: 60, vegetationIndex: 50 },
          { year: 2022, urbanDensity: 82, waterLevel: 55, vegetationIndex: 45 },
          { year: 2023, urbanDensity: 86, waterLevel: 52, vegetationIndex: 41 },
        ]
      }
    ]
  },
  {
    id: 'dl',
    name: 'Delhi',
    cities: [
      {
        id: 'ndl',
        name: 'New Delhi',
        coordinates: [77.2090, 28.6139],
        description: 'Capital region exhibiting severe winter smog patterns visible from space.',
        history: [
          { year: 2021, urbanDensity: 90, waterLevel: 40, vegetationIndex: 30 },
          { year: 2022, urbanDensity: 92, waterLevel: 38, vegetationIndex: 32 },
          { year: 2023, urbanDensity: 94, waterLevel: 35, vegetationIndex: 28 },
        ]
      }
    ]
  },
  {
    id: 'wb',
    name: 'West Bengal',
    cities: [
      {
        id: 'kol',
        name: 'Kolkata',
        coordinates: [88.3639, 22.5726],
        description: 'Delta city highly vulnerable to sea-level rise and cyclone impacts.',
        history: [
          { year: 2021, urbanDensity: 85, waterLevel: 110, vegetationIndex: 55 },
          { year: 2022, urbanDensity: 86, waterLevel: 115, vegetationIndex: 52 },
          { year: 2023, urbanDensity: 88, waterLevel: 120, vegetationIndex: 48 },
        ]
      }
    ]
  },
  {
    id: 'gj',
    name: 'Gujarat',
    cities: [
      {
        id: 'ahd',
        name: 'Ahmedabad',
        coordinates: [72.5714, 23.0225],
        description: 'Rapid industrial growth along the Sabarmati river corridor.',
        history: [
          { year: 2021, urbanDensity: 75, waterLevel: 45, vegetationIndex: 35 },
          { year: 2022, urbanDensity: 79, waterLevel: 48, vegetationIndex: 33 },
          { year: 2023, urbanDensity: 82, waterLevel: 44, vegetationIndex: 30 },
        ]
      }
    ]
  }
];
