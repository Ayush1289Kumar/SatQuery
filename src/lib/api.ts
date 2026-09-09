/**
 * Typed API client for the PrithviQ backend (contract: ../api.md).
 *
 * - Base URL comes from VITE_API_BASE_URL (default: local FastAPI server).
 * - Successful responses use the { data, request_id } envelope.
 * - Errors use the RFC 7807-style problem body, surfaced as ApiError.
 * - The ONLY place GeoJSON [longitude, latitude] is converted to the
 *   Leaflet-friendly [latitude, longitude] is `mapResultToAnalysisResult`.
 */
import type { AnalysisResult, Highlight, HighlightType, MapLayer } from '../types'

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}

const API_BASE = (env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/+$/, '')

/** When true, the app keeps the pre-existing client-side demo flow (src/data/mock.ts). */
export function isDemoMode(): boolean {
  return (env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'
}

export type UploadModeStr = 'single' | 'twoDate' | 'opticalSar'
export type JobStage = 'validate' | 'route' | 'analyze' | 'explain'
export type JobStatus =
  | 'created' | 'validating' | 'queued' | 'routing' | 'processing' | 'explaining'
  | 'completed' | 'failed' | 'cancelled' | 'expired'

export interface UploadInitiateResult {
  upload_id: string
  upload_url: string
  upload_headers: Record<string, string>
  expires_at: string
  max_size_bytes: number
}

export interface SessionCreated {
  session_id: string
  mode: UploadModeStr
  status: string
  upload_ids: string[]
  created_at: string
}

export interface AnalysisAccepted {
  job_id: string
  session_id: string
  status: string
  stage: JobStage
  progress: number
  estimated_seconds: number
  created_at: string
}

export interface JobStatusView {
  job_id: string
  session_id: string
  status: JobStatus
  stage: JobStage
  progress: number
  workflow_label: string
  message: string
  updated_at: string
  error: string | null
}

export interface ResultFeaturePayload {
  id: string
  type: string
  label: string
  confidence: number
  area_m2: number
  geometry: { type: string; coordinates: unknown }
}

export interface ResultLayerPayload {
  id: string
  label: string
  opacity: number
  geometry_format: string
  features: ResultFeaturePayload[]
}

export interface ResultPayload {
  result_id: string
  session_id: string
  job_id: string
  question: string
  answer: string
  confidence: number
  confidence_band: string
  workflow: { id: string; label: string; router_version: string }
  models: { name: string; version: string; role: string }[]
  usage_time_sec: number
  created_at: string
  completed_at: string
  inputs: { upload_id: string; original_name: string; kind: string; acquisition_time: string | null }[]
  layers: ResultLayerPayload[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | null

  constructor(status: number, code: string, message: string, requestId: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

interface Envelope<T> {
  data: T
  request_id: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<{ data: T; requestId: string }> {
  let resp: Response
  try {
    resp = await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      `Cannot reach the analysis server (${API_BASE}). Is the backend running?`,
    )
  }
  if (!resp.ok) {
    let code = `HTTP_${resp.status}`
    let detail = `Request failed with status ${resp.status}.`
    let requestId: string | null = resp.headers.get('X-Request-ID')
    try {
      const problem = (await resp.json()) as { code?: string; detail?: string; request_id?: string }
      if (problem.code) code = problem.code
      if (problem.detail) detail = problem.detail
      if (problem.request_id) requestId = problem.request_id
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(resp.status, code, detail, requestId)
  }
  const body = (await resp.json()) as Envelope<T>
  return { data: body.data, requestId: body.request_id }
}

/** Mock storage returns relative URLs; a real presigned URL is absolute. */
function resolveStorageUrl(uploadUrl: string): string {
  if (/^https?:\/\//i.test(uploadUrl)) return uploadUrl
  return new URL(uploadUrl, new URL(API_BASE).origin).toString()
}

/** ---------- Upload lifecycle (api.md section 2) ---------- */

export async function initiateUpload(input: {
  filename: string
  contentType: string
  sizeBytes: number
  kind: 'optical' | 'sar'
  mode: UploadModeStr
}): Promise<UploadInitiateResult> {
  const { data } = await request<UploadInitiateResult>('/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: input.filename,
      content_type: input.contentType,
      size_bytes: input.sizeBytes,
      kind: input.kind,
      mode: input.mode,
    }),
  })
  return data
}

/** Direct PUT to the (mock) presigned storage target returned by initiate. */
export async function uploadBytesToStorage(upload: UploadInitiateResult, file: File): Promise<void> {
  const resp = await fetch(resolveStorageUrl(upload.upload_url), {
    method: 'PUT',
    headers: upload.upload_headers,
    body: file,
  })
  if (!resp.ok) {
    throw new ApiError(resp.status, 'STORAGE_UPLOAD_FAILED', `Direct upload failed with status ${resp.status}.`)
  }
}

export async function completeUpload(
  uploadId: string,
  etag?: string,
): Promise<{ upload_id: string; status: string }> {
  const { data } = await request<{ upload_id: string; status: string }>(
    `/uploads/${uploadId}/complete`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(etag ? { etag } : {}),
    },
  )
  return data
}

export interface UploadMetadata {
  upload_id: string
  original_name: string
  kind: 'optical' | 'sar'
  status: string
  mime_type: string
  size_bytes: number
  acquisition_time: string | null
  crs: string | null
  bbox: number[] | null
  width: number | null
  height: number | null
  resolution_m: number | null
  bands: string[]
  validation_errors: string[]
}

export async function getUpload(uploadId: string): Promise<UploadMetadata> {
  const { data } = await request<UploadMetadata>(`/uploads/${uploadId}`)
  return data
}

/** ---------- Sessions & analyses (api.md sections 3-4) ---------- */

export async function createSession(
  mode: UploadModeStr,
  uploadIds: string[],
  category?: string,
): Promise<SessionCreated> {
  const { data } = await request<SessionCreated>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, upload_ids: uploadIds, ...(category ? { category } : {}) }),
  })
  return data
}

function idempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `key-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export async function submitAnalysis(
  sessionId: string,
  question: string,
  category?: string,
): Promise<AnalysisAccepted> {
  const { data } = await request<AnalysisAccepted>(`/sessions/${sessionId}/analyses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey() },
    body: JSON.stringify({ question, ...(category ? { category } : {}) }),
  })
  return data
}

export async function getJob(jobId: string): Promise<JobStatusView> {
  const { data } = await request<JobStatusView>(`/jobs/${jobId}`)
  return data
}

export async function getLatestResult(sessionId: string): Promise<ResultPayload> {
  const { data } = await request<ResultPayload>(`/sessions/${sessionId}/results/latest`)
  return data
}

/** ---------- Polling: API stages -> existing AnalyzingScreen steps ---------- */

const STAGE_TO_STEP: Record<JobStage, number> = { validate: 0, route: 1, analyze: 2, explain: 3 }

export interface PollHandlers {
  onStage: (stage: JobStage, step: number, job: JobStatusView) => void
}

export async function pollJobUntilCompleted(
  jobId: string,
  handlers: PollHandlers,
  signal?: AbortSignal,
  intervalMs = 1000,
  timeoutMs = 180_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new ApiError(499, 'ABORTED', 'Analysis polling cancelled.')
    const job = await getJob(jobId)
    if (job.status === 'completed') {
      handlers.onStage('explain', STAGE_TO_STEP.explain, job)
      return
    }
    if (job.status === 'failed') {
      throw new ApiError(500, 'ANALYSIS_FAILED', job.error ?? 'The analysis failed on the server.')
    }
    if (job.status === 'cancelled' || job.status === 'expired') {
      throw new ApiError(409, `JOB_${job.status.toUpperCase()}`, `The analysis was ${job.status}.`)
    }
    handlers.onStage(job.stage, STAGE_TO_STEP[job.stage] ?? 0, job)
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(resolve, intervalMs)
      signal?.addEventListener(
        'abort',
        () => {
          window.clearTimeout(timer)
          reject(new ApiError(499, 'ABORTED', 'Analysis polling cancelled.'))
        },
        { once: true },
      )
    })
  }
  throw new ApiError(504, 'ANALYSIS_TIMEOUT', 'The analysis is taking too long. Please try again.')
}

/** ---------- Result mapping — the single GeoJSON conversion point ---------- */

function geometryRingToLatLng(geometry: ResultFeaturePayload['geometry']): [number, number][] {
  const asPolygon = geometry.coordinates as [number, number][][]
  const asMulti = geometry.coordinates as [number, number][][][]
  const ring = geometry.type === 'MultiPolygon' ? (asMulti[0]?.[0] ?? []) : (asPolygon[0] ?? [])
  return ring.map(([lng, lat]) => [lat, lng])
}

function toHighlight(feature: ResultFeaturePayload): Highlight {
  return {
    id: feature.id,
    type: feature.type as HighlightType,
    label: feature.label,
    confidence: feature.confidence,
    coords: geometryRingToLatLng(feature.geometry),
  }
}

export function mapResultToAnalysisResult(payload: ResultPayload): AnalysisResult {
  const layers: MapLayer[] = payload.layers.map((layer) => ({
    id: layer.id,
    label: layer.label,
    highlights: layer.features.map(toHighlight),
    opacity: layer.opacity,
  }))
  return {
    answer: payload.answer,
    confidence: payload.confidence,
    workflowLabel: payload.workflow.label,
    modelNames: payload.models.map((model) => model.name),
    layers,
    usageTimeSec: payload.usage_time_sec,
  }
}


