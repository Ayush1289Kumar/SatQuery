export type UploadMode = 'single' | 'twoDate' | 'opticalSar'

export type HighlightType = 'water' | 'built' | 'flood' | 'vegetation' | 'land'

/** A raster cell (polygon) highlight returned by an analysis. */
export interface Highlight {
  id: string
  type: HighlightType
  label: string
  confidence: number
  /** Ring of [lat, lng] vertices. */
  coords: [number, number][]
}

/** A map layer used for the map viewer / before-after comparison. */
export interface MapLayer {
  id: string
  label: string
  highlights: Highlight[]
  opacity: number
}

export interface AnalysisResult {
  answer: string
  confidence: number
  workflowLabel: string
  modelNames: string[]
  layers: MapLayer[]
  usageTimeSec: number
}

export interface UploadedImage {
  id: string
  name: string
  kind: 'optical' | 'sar'
  date?: string
  location?: string
  /** Optional object URL for a locally previewed image. */
  previewUrl?: string
}

export interface SuggestedQuestion {
  id: string
  label: string
  text: string
}
