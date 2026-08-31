import type {
  AnalysisResult,
  Highlight,
  SuggestedQuestion,
  UploadedImage,
} from '../types'

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { id: 'describe', label: 'Describe this image', text: 'Describe this image.' },
  { id: 'water', label: 'Highlight water bodies', text: 'Highlight water bodies in this image.' },
  { id: 'change', label: 'What changed between these dates?', text: 'What changed between these two dates?' },
  { id: 'builtup', label: 'Has built-up area increased?', text: 'Has built-up area increased between these dates?' },
]

export const DEMO_LOCATION = 'Coastal district, Maharashtra'

// --- Mock highlight polygons (demo coordinates, coastal region) ---

const waterRing: [number, number][] = [
  [19.13, 72.9],
  [19.17, 72.94],
  [19.15, 72.99],
  [19.1, 72.97],
  [19.09, 72.93],
  [19.11, 72.9],
]

const floodNewRing: [number, number][] = [
  [19.03, 72.86],
  [19.07, 72.9],
  [19.05, 72.95],
  [19.01, 72.93],
  [19.0, 72.88],
  [19.015, 72.855],
]

const floodExtendRing: [number, number][] = [
  [18.99, 72.95],
  [19.02, 72.99],
  [19.0, 73.03],
  [18.965, 73.0],
  [18.955, 72.96],
]

const builtNewRing: [number, number][] = [
  [19.06, 72.8],
  [19.09, 72.82],
  [19.095, 72.86],
  [19.065, 72.87],
  [19.05, 72.845],
]

const vegetationRing: [number, number][] = [
  [19.11, 73.0],
  [19.14, 73.04],
  [19.12, 73.08],
  [19.08, 73.05],
  [19.07, 73.01],
]

const hil = (
  id: string,
  type: Highlight['type'],
  label: string,
  confidence: number,
  coords: [number, number][],
): Highlight => ({ id, type, label, confidence, coords })

// --- Demo scenarios ---

export interface DemoScenario {
  id: string
  title: string
  subtitle: string
  mode: 'single' | 'twoDate' | 'opticalSar'
  images: UploadedImage[]
  suggestedQuestion: string
  result: AnalysisResult
  demoConfidence: boolean
}
const opticalSarScenario: DemoScenario = {
  id: 'opsar',
  title: 'Built-up expansion (optical + SAR)',
  subtitle: 'Fused analysis · 18 Aug 2026',
  mode: 'opticalSar',
  images: [
    {
      id: 'img-1',
      name: 's1_optical.tif',
      kind: 'optical',
      date: '18 Aug 2026',
      location: DEMO_LOCATION,
    },
    {
      id: 'img-2',
      name: 's1_sentinel1_vv.saf',
      kind: 'sar',
      date: '18 Aug 2026',
      location: DEMO_LOCATION,
    },
  ],
  suggestedQuestion: 'Has built-up area increased?',
  demoConfidence: true,
  result: {
    answer:
      'We found evidence of new built-up settlement around the south-western edge. Note: SAR backscatter was partly ambiguous due to wet conditions, so confidence is lower. Please verify with ground data before acting.',
    confidence: 0.57,
    workflowLabel: 'Optical-SAR fusion · combined classification',
    modelNames: ['sat-query/fusion-unet-rs', 'sar-despk-hybrid'],
    usageTimeSec: 14.0,
    layers: [
      {
        id: 'built',
        label: 'New built-up (predicted)',
        opacity: 1,
        highlights: [hil('cu1', 'built', 'New built-up (low conf.)', 0.57, builtNewRing)],
      },
    ],
  },
}

const oneDateScenario: DemoScenario = {
  id: 'water',
  title: 'Water body mapping',
  subtitle: 'Single optical image · 24 Aug 2026',
  mode: 'single',
  images: [
    {
      id: 'img-1',
      name: 'scene_2026-08-24_optical.tif',
      kind: 'optical',
      date: '24 Aug 2026',
      location: DEMO_LOCATION,
    },
  ],
  suggestedQuestion: 'Highlight water bodies in this image.',
  demoConfidence: false,
  result: {
    answer:
      'We detected 5 major water bodies covering roughly 12.4 km² in this scene. The highlighted areas are rivers, reservoirs, and seasonal lakes. The largest extent is in the north-eastern part of the image.',
    confidence: 0.92,
    workflowLabel: 'Text-guided region segmentation · semantic segmentation',
    modelNames: ['sat-query/segformer-b0-bigearthnet', 'ClipSeg-guide-v1'],
    usageTimeSec: 6.4,
    layers: [
      {
        id: 'single',
        label: 'Water bodies detected',
        opacity: 1,
        highlights: [
          hil('w1', 'water', 'Reservoir', 0.94, waterRing),
          hil('w2', 'water', 'Seasonal lake', 0.89, vegetationRing),
        ],
      },
    ],
  },
}

const twoDateScenario: DemoScenario = {
  id: 'flood',
  title: 'Flood extent change',
  subtitle: 'Two-date comparison · 18 vs 24 Aug 2026',
  mode: 'twoDate',
  images: [
    {
      id: 'img-1',
      name: 'scene_2026-08-18_optical.tif',
      kind: 'optical',
      date: '18 Aug 2026',
      location: DEMO_LOCATION,
    },
    {
      id: 'img-2',
      name: 'scene_2026-08-24_optical.tif',
      kind: 'optical',
      date: '24 Aug 2026',
      location: DEMO_LOCATION,
    },
  ],
  suggestedQuestion: 'What changed between these two dates?',
  demoConfidence: false,
  result: {
    answer:
      'Between 18 and 24 August, newly flooded areas appeared along the central flood plain (≈ 3.1 km² new water) and existing inundation extended eastward (≈ 1.8 km²). No build-up change was detected in this tile.',
    confidence: 0.81,
    workflowLabel: 'Change detection · bi-temporal segmentation',
    modelNames: ['sat-query/changeformer-siamese', 'Raster-Register-v2'],
    usageTimeSec: 11.2,
    layers: [
      {
        id: 'before',
        label: '18 Aug 2026 (before)',
        opacity: 1,
        highlights: [hil('b1', 'water', 'Water (before)', 0.9, waterRing)],
      },
      {
        id: 'after',
        label: '24 Aug 2026 (after)',
        opacity: 0.6,
        highlights: [
          hil('a1', 'flood', 'Newly flooded', 0.84, floodNewRing),
          hil('a2', 'flood', 'Extent increased', 0.78, floodExtendRing),
        ],
      },
    ],
  },
}
export const DEMO_SCENARIOS: DemoScenario[] = [
  twoDateScenario,
  oneDateScenario,
  opticalSarScenario,
]

export const HIGHLIGHT_COLORS: Record<Highlight['type'], string> = {
  water: '#0f6bff',
  built: '#dc2626',
  flood: '#f59e0b',
  vegetation: '#16a34a',
  land: '#78350f',
}

export const HIGHLIGHT_LEGEND: { type: Highlight['type']; label: string }[] = [
  { type: 'water', label: 'Water' },
  { type: 'flood', label: 'Flood / new water' },
  { type: 'built', label: 'Built-up' },
  { type: 'vegetation', label: 'Vegetation' },
  { type: 'land', label: 'Land change' },
]

export const PLACEHOLDER_IMAGES: UploadedImage[] = [
  { id: 'p1', name: 'optical.tif', kind: 'optical', date: '24 Aug 2026', location: DEMO_LOCATION },
  { id: 'p2', name: 'sentinel1_sar.tif', kind: 'sar', date: '24 Aug 2026', location: DEMO_LOCATION },
]