# PrithviQ AI Backend Integration Guide

## 1. Purpose and Scope

This document is the implementation contract for connecting the current React/Vite frontend to a production-capable backend.

The product workflow is:

1. Select an analysis mode.
2. Upload one or two satellite images.
3. Ask a plain-English question.
4. Validate and normalize the inputs.
5. Route the request to the appropriate remote-sensing workflow.
6. Run asynchronous inference and geospatial post-processing.
7. Return an answer with confidence, model provenance, and map evidence.
8. Generate a downloadable report.

The current repository is a frontend-only prototype. The analysis timer, demo scenarios, result data, suggested questions, regional metrics, and report download are local or mock implementations. There is currently no API client, authentication state, backend proxy, persistent session, upload transport, job polling, or backend error state.

This guide uses the existing product name, UI states, and TypeScript types as the integration boundary.

## 2. Current Frontend Contract

### 2.1 Relevant files

| File | Current responsibility | Backend integration change |
|---|---|---|
| `src/App.tsx` | Owns upload, ask, analyzing, and results state | Replace local timers and `defaultResultFor` with API-backed session/job state |
| `src/types.ts` | Defines `UploadMode`, `UploadedImage`, `Highlight`, `MapLayer`, and `AnalysisResult` | Extend with stable server IDs, timestamps, provenance, geometry, and artifact URLs |
| `src/components/UploadScreen.tsx` | Selects mode and creates local `UploadedImage` records | Upload files to the server and retain `upload_id` values |
| `src/components/AskScreen.tsx` | Edits and submits the natural-language question | Create an analysis job through the API |
| `src/components/AnalyzingScreen.tsx` | Shows `Validate`, `Route`, `Analyze`, and `Explain` stages | Map these stages to real job status events |
| `src/components/ResultsScreen.tsx` | Displays answer, confidence, layers, models, processing time, and report action | Fetch the server result and request a report artifact |
| `src/components/MapView.tsx` | Draws `MapLayer.highlights` as Leaflet polygons | Consume GeoJSON or a normalized API geometry contract |
| `src/components/RegionMap.tsx` | Fetches city boundaries directly from Nominatim | Move geocoding/boundary lookup behind a backend proxy |
| `src/lib/report.ts` | Downloads a browser-generated TXT file | Use the backend report endpoint; retain local TXT only as fallback |
| `src/data/mock.ts` | Demo questions and three complete scenarios | Keep behind an explicit demo mode; never mix fixture IDs with production IDs |

### 2.2 Existing TypeScript types

The current frontend types are intentionally small:

```ts
export type UploadMode = 'single' | 'twoDate' | 'opticalSar'

export interface UploadedImage {
  id: string
  name: string
  kind: 'optical' | 'sar'
  date?: string
  location?: string
  previewUrl?: string
}

export interface Highlight {
  id: string
  type: 'water' | 'built' | 'flood' | 'vegetation' | 'land'
  label: string
  confidence: number
  coords: [number, number][]
}

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
```

Important coordinate warning: `Highlight.coords` is currently interpreted by Leaflet as `[latitude, longitude]`. GeoJSON uses `[longitude, latitude]`. The backend must standardize on GeoJSON coordinates and the frontend adapter must convert them once at the boundary, or the API must explicitly return a frontend-only coordinate array. Do not silently mix both conventions.

## 3. Recommended Backend Architecture

Use a modular FastAPI service with separate API, domain, worker, geospatial, and storage responsibilities.

```text
React SPA
  |
  | HTTPS / JSON / multipart / SSE or polling
  v
FastAPI API
  |- Auth and authorization
  |- Upload validation and presigned upload orchestration
  |- Analysis session and job API
  |- Result and report API
  |- Boundary/geocoding proxy
  |
  +--> PostgreSQL + PostGIS
  +--> S3 or MinIO object storage
  +--> Redis queue and job state
  +--> Analysis worker(s)
          |- Rasterio / GDAL normalization
          |- OpenCV / registration
          |- PyTorch / Hugging Face inference
          |- GeoPandas / Shapely vectorization
          |- Result and evidence artifact generation
```

### 3.1 Recommended services

| Service | Responsibility | Suggested technology |
|---|---|---|
| API | Authentication, validation, session and result endpoints | Python 3.12, FastAPI, Pydantic v2 |
| Database | Users, sessions, jobs, metadata, geometries, audit records | PostgreSQL 16, PostGIS |
| Object storage | Original uploads, normalized rasters, evidence, reports | S3 or MinIO |
| Queue | Durable asynchronous processing | Redis + Celery, RQ, or Dramatiq |
| Worker | CPU/GPU analysis and geospatial processing | Python, PyTorch, Rasterio, GDAL, GeoPandas, Shapely |
| Cache | Job status, boundary lookups, rate-limit counters | Redis |
| Observability | Logs, metrics, traces, error reporting | OpenTelemetry, Prometheus, Grafana, Sentry |

The API must remain responsive while inference runs. Do not run GPU inference inside the request handler.

## 4. API Conventions

### 4.1 Base URL and versioning

All production endpoints use:

```text
/api/v1
```

The frontend receives the base URL from a Vite environment variable:

```text
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

The backend should expose OpenAPI at `/docs` and `/openapi.json` outside the production public surface or protect it with authentication.

### 4.2 Common response envelope

Successful JSON responses should use this shape:

```json
{
  "data": {},
  "request_id": "req_01J..."
}
```

Errors should use RFC 7807-style details:

```json
{
  "type": "https://api.prithviq.example/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "The two-date mode requires two images with different acquisition dates.",
  "code": "INVALID_IMAGE_PAIR",
  "request_id": "req_01J...",
  "field_errors": [
    { "field": "uploads", "message": "Two files are required." }
  ]
}
```

Every response must include or propagate a request ID. Job responses must include a stable `job_id`.

### 4.3 Authentication

Use short-lived JWT access tokens and rotating refresh tokens.

- Access token: 15 minutes, sent as `Authorization: Bearer <token>`.
- Refresh token: 7 to 30 days, stored in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.
- Do not store access or refresh tokens in `localStorage`.
- Revoke refresh-token families on logout, suspected compromise, or password reset.
- Roles: `user`, `analyst`, `admin`.

The initial demo can permit anonymous analysis behind a feature flag, but production uploads and results must be owned by an authenticated user or an explicitly scoped public demo session.

## 5. API Endpoints

### 5.1 Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate a user and return an access token |
| POST | `/auth/refresh` | Rotate the refresh token and return a new access token |
| POST | `/auth/logout` | Revoke the refresh-token family |
| GET | `/auth/me` | Return the current user and roles |

`POST /auth/login` request:

```json
{
  "email": "analyst@example.com",
  "password": "..."
}
```

Response:

```json
{
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 900,
    "user": {
      "id": "usr_123",
      "email": "analyst@example.com",
      "role": "analyst"
    }
  },
  "request_id": "req_01J..."
}
```

### 5.2 Upload initiation

Recommended production flow is presigned upload. It avoids routing large GeoTIFF files through the API process.

#### `POST /uploads/initiate`

Request:

```json
{
  "filename": "scene_2026-08-24_optical.tif",
  "content_type": "image/tiff",
  "size_bytes": 184320000,
  "sha256": "optional-client-computed-hash",
  "kind": "optical",
  "mode": "twoDate"
}
```

Response:

```json
{
  "data": {
    "upload_id": "upl_01J...",
    "object_key": "private/usr_123/upl_01J.../original.tif",
    "upload_url": "https://storage.example/presigned-url",
    "upload_headers": {
      "Content-Type": "image/tiff"
    },
    "expires_at": "2026-09-09T12:00:00Z",
    "max_size_bytes": 1073741824
  },
  "request_id": "req_01J..."
}
```

The browser uploads directly to `upload_url`, then confirms it:

#### `POST /uploads/{upload_id}/complete`

```json
{
  "etag": "storage-etag",
  "sha256": "sha256-after-upload"
}
```

The backend must verify object existence, size, checksum, content sniffing, malware scan status, and raster metadata before marking an upload `ready`.

#### `GET /uploads/{upload_id}`

Returns normalized metadata:

```json
{
  "data": {
    "upload_id": "upl_01J...",
    "original_name": "scene_2026-08-24_optical.tif",
    "kind": "optical",
    "status": "ready",
    "mime_type": "image/tiff",
    "size_bytes": 184320000,
    "sha256": "...",
    "acquisition_time": "2026-08-24T05:22:00Z",
    "crs": "EPSG:4326",
    "bbox": [72.8, 19.0, 73.1, 19.2],
    "width": 4096,
    "height": 4096,
    "resolution_m": 10,
    "bands": ["B02", "B03", "B04", "B08"],
    "nodata": 0
  },
  "request_id": "req_01J..."
}
```

A simpler MVP may use `POST /uploads` with `multipart/form-data`, but the field and validation behavior must be identical.

### 5.3 Create an analysis session

#### `POST /sessions`

Request:

```json
{
  "mode": "twoDate",
  "upload_ids": ["upl_before", "upl_after"],
  "category": "disaster",
  "region": {
    "state": "Maharashtra",
    "city": "Mumbai"
  },
  "metadata": {
    "client": "web",
    "demo": false
  }
}
```

Rules:

- `single`: exactly one upload.
- `twoDate`: exactly two compatible uploads, usually same area and different acquisition dates.
- `opticalSar`: exactly two uploads, one `optical` and one `sar`, with compatible footprint and acquisition window.
- Uploads must be owned by the user or the session's signed demo scope.
- The session is created only after uploads are `ready`.

Response:

```json
{
  "data": {
    "session_id": "ses_01J...",
    "mode": "twoDate",
    "status": "created",
    "uploads": ["upl_before", "upl_after"],
    "created_at": "2026-09-09T11:45:00Z"
  },
  "request_id": "req_01J..."
}
```

### 5.4 Ask a question and enqueue analysis

#### `POST /sessions/{session_id}/analyses`

Headers:

```text
Authorization: Bearer <access-token>
Idempotency-Key: <unique-key-per-submit>
```

Request:

```json
{
  "question": "What changed between these two dates?",
  "requested_outputs": ["answer", "map_evidence", "report"],
  "language": "en",
  "category": "disaster"
}
```

Response status: `202 Accepted`

```json
{
  "data": {
    "job_id": "job_01J...",
    "session_id": "ses_01J...",
    "status": "queued",
    "stage": "validate",
    "progress": 0,
    "created_at": "2026-09-09T11:46:00Z",
    "estimated_seconds": 30
  },
  "request_id": "req_01J..."
}
```

The same idempotency key must return the original job instead of creating a duplicate analysis.

### 5.5 Job status

#### `GET /jobs/{job_id}`

Recommended status enum:

```text
created | validating | queued | routing | processing | explaining | completed | failed | cancelled | expired
```

Response:

```json
{
  "data": {
    "job_id": "job_01J...",
    "session_id": "ses_01J...",
    "status": "processing",
    "stage": "analyze",
    "progress": 68,
    "workflow_label": "Change detection · bi-temporal segmentation",
    "message": "Generating geospatial evidence polygons.",
    "started_at": "2026-09-09T11:46:04Z",
    "updated_at": "2026-09-09T11:46:15Z",
    "error": null
  },
  "request_id": "req_01J..."
}
```

The frontend should poll every 1 to 2 seconds while the tab is visible, back off to 5 seconds in the background, stop after a server-defined timeout, and support cancellation.

#### `POST /jobs/{job_id}/cancel`

Cancellation is best effort. A queued job should be removed before execution; a running GPU operation should be marked for cancellation and its temporary outputs deleted when safe.

Optional real-time alternative: expose `GET /jobs/{job_id}/events` as Server-Sent Events. Keep polling as the fallback for browsers, proxies, and local development.

### 5.6 Result retrieval

#### `GET /sessions/{session_id}/results/latest`

Response:

```json
{
  "data": {
    "result_id": "res_01J...",
    "session_id": "ses_01J...",
    "job_id": "job_01J...",
    "question": "What changed between these two dates?",
    "answer": "Between 18 and 24 August, newly flooded areas appeared along the central flood plain.",
    "confidence": 0.81,
    "confidence_band": "high",
    "workflow": {
      "id": "change_detection",
      "label": "Change detection · bi-temporal segmentation",
      "router_version": "router-2026.09.1"
    },
    "models": [
      {
        "name": "sat-query/changeformer-siamese",
        "version": "2026.08.3",
        "role": "change segmentation"
      },
      {
        "name": "Raster-Register-v2",
        "version": "2.0.1",
        "role": "image registration"
      }
    ],
    "usage_time_sec": 11.2,
    "created_at": "2026-09-09T11:46:21Z",
    "completed_at": "2026-09-09T11:46:32Z",
    "inputs": [
      {
        "upload_id": "upl_before",
        "original_name": "scene_2026-08-18_optical.tif",
        "kind": "optical",
        "acquisition_time": "2026-08-18T05:22:00Z"
      }
    ],
    "layers": [
      {
        "id": "before",
        "label": "18 Aug 2026 (before)",
        "opacity": 1,
        "geometry_format": "geojson",
        "features": [
          {
            "id": "feat_01J...",
            "type": "water",
            "label": "Water (before)",
            "confidence": 0.9,
            "area_m2": 2200000,
            "geometry": {
              "type": "Polygon",
              "coordinates": [[[72.9, 19.13], [72.94, 19.17], [72.9, 19.13]]]
            }
          }
        ]
      }
    ],
    "artifacts": {
      "evidence_geojson_url": "https://storage.example/signed-url",
      "thumbnail_url": "https://storage.example/signed-url",
      "before_after_preview_url": "https://storage.example/signed-url"
    }
  },
  "request_id": "req_01J..."
}
```

The backend result should include the fields needed by the current UI plus provenance that is necessary for trustworthy analysis. Do not return only a generated sentence.

Confidence requirements:

- Use a normalized range from `0.0` to `1.0`.
- Return the aggregate result confidence and per-feature confidence.
- Preserve the model's calibration version or evaluation reference.
- The frontend currently shows a warning below `0.6`; keep this threshold configurable from the API or frontend config.
- Never represent a low-confidence result as a definitive operational decision.

### 5.7 Reports and evidence

#### `POST /results/{result_id}/reports`

Request:

```json
{
  "format": "pdf",
  "include": ["summary", "input_metadata", "map_evidence", "model_provenance", "confidence_warning"]
}
```

Response status: `202 Accepted` if generation is asynchronous:

```json
{
  "data": {
    "report_id": "rpt_01J...",
    "status": "queued",
    "format": "pdf"
  },
  "request_id": "req_01J..."
}
```

#### `GET /reports/{report_id}`

Returns report status and, when ready, an authenticated signed download URL:

```json
{
  "data": {
    "report_id": "rpt_01J...",
    "status": "ready",
    "format": "pdf",
    "download_url": "https://storage.example/signed-url",
    "expires_at": "2026-09-09T12:15:00Z"
  },
  "request_id": "req_01J..."
}
```

Supported formats should be `pdf`, `png`, `geojson`, and `json`. The report must contain report ID, request ID, source upload metadata, acquisition dates, CRS, question, answer, confidence, warning status, layer legend, map evidence, workflow, model versions, timestamps, and a clear statement that the output is decision support rather than an autonomous decision.

### 5.8 Regional boundary and suggestion APIs

#### `GET /regions/states`

Returns the states used by `StateCityPanel`.

#### `GET /regions/{region_id}/cities`

Returns city IDs, display names, coordinates, metrics, and optional historical data.

#### `GET /regions/{region_id}/boundary`

Returns cached GeoJSON from an approved provider or an owned dataset. This replaces direct browser calls to public Nominatim.

#### `GET /suggestions?category=disaster`

Returns category-specific suggested questions. Keep the existing local suggestions as an offline fallback.

The backend proxy must enforce provider attribution, caching, rate limits, a descriptive user agent where required, and a provider fallback policy. Do not send uncontrolled high-volume requests from every browser to Nominatim.

## 6. Input Validation and Normalization

### 6.1 Accepted files

MVP accepted formats:

- GeoTIFF: `.tif`, `.tiff`, MIME `image/tiff`.
- Demo raster images: `.png`, `.jpg`, `.jpeg`.
- SAR formats must be explicitly supported by the reader; do not infer SAR solely from a filename.

Production should prefer Cloud Optimized GeoTIFF where possible.

Recommended initial limits:

- Maximum file size: 1 GiB per file, configurable by environment.
- Maximum pixels: 100 million per file.
- Maximum upload count: two per analysis session.
- Maximum question length: 2,000 Unicode characters.
- Maximum rendered feature count: 5,000 per result layer.
- Maximum geometry payload: configurable and enforced before serialization.

### 6.2 File safety

1. Require authentication or a signed demo scope.
2. Enforce request and multipart size limits at the reverse proxy and API.
3. Check extension, declared MIME type, and magic bytes.
4. Store with a random object key; never use the original filename as a path.
5. Run malware scanning before processing.
6. Reject archives, executable content, malformed TIFFs, decompression bombs, and unsupported CRS values.
7. Compute a server-side SHA-256 checksum.
8. Parse metadata in a sandbox with CPU, memory, and execution limits.
9. Strip unsafe metadata from public artifacts.
10. Never expose private object keys directly to the browser.

### 6.3 Geospatial validation

For every raster, inspect and persist:

- CRS and transform.
- Bounding box.
- Width, height, band count, data types, and nodata values.
- Acquisition date/time and timezone if available.
- Ground sample distance.
- Sensor/platform and band names where available.
- Percentage of nodata/cloud-covered pixels.

For pairs:

- Check footprint intersection and minimum overlap.
- Check acquisition dates are ordered for `twoDate`.
- Check date separation is meaningful for the selected workflow.
- Check optical/SAR footprint compatibility and acquisition-window tolerance.
- Register images to a common grid before pixel comparison.
- Record all rejected pair reasons for UI display and audit logs.

PNG/JPEG demo files without georeferencing must require a supplied location or be clearly marked as non-geospatial. They must not produce a map with fabricated geographic accuracy.

## 7. Analysis Routing and Worker Pipeline

### 7.1 Router inputs

The router receives:

- Upload mode.
- Validated sensor kinds.
- Band and metadata inventory.
- Acquisition dates and overlap.
- Natural-language question.
- Optional product category and selected region.
- Available model versions and worker capabilities.

### 7.2 Minimum workflow mapping

| Condition | Workflow | Expected outputs |
|---|---|---|
| One optical image + describe/caption question | `single_image_vqa` | Answer, global confidence, optional thumbnail evidence |
| One image + water/vegetation/built-up request | `semantic_segmentation` | Answer, polygons or raster mask, class confidence, area |
| Two dated compatible images + change question | `change_detection` | Before/after layers, change classes, areas, confidence |
| Optical + SAR pair + built-up/flood/change question | `optical_sar_fusion` | Fused class layers, per-feature confidence, sensor diagnostics |

The router must return a workflow ID, human-readable label, router version, reason or routing features, and the selected model versions. Do not expose hidden chain-of-thought; return concise operational metadata only.

### 7.3 Worker stages

The UI's four visible stages map to:

1. **Validate**: upload existence, security scan, metadata extraction, pair checks.
2. **Route**: question classification, workflow selection, model availability.
3. **Analyze**: preprocessing, registration, inference, segmentation, vectorization.
4. **Explain**: confidence aggregation, plain-language answer, evidence packaging, provenance.

Each stage should emit structured progress events. The job record must preserve stage start/end times, worker ID, model versions, errors, retry count, and resource usage.

### 7.4 Retry policy

- Retry transient storage, queue, and worker infrastructure errors with exponential backoff.
- Do not blindly retry invalid input, unsupported CRS, malformed raster, or model validation errors.
- Use a maximum attempt count, such as three.
- Preserve failed attempt details and surface a useful user-safe error.
- Make each stage idempotent using job ID and content hashes.

## 8. Persistence Model

Use UUID or ULID-style IDs with prefixes at the API boundary. Internal numeric keys are acceptable but must never be exposed if they reveal row counts.

### 8.1 Core tables

```sql
users
- id
- email
- password_hash
- role
- is_active
- created_at
- updated_at

refresh_tokens
- id
- user_id
- token_family_id
- token_hash
- expires_at
- revoked_at
- created_at

analysis_sessions
- id
- user_id
- mode
- category
- status
- created_at
- expires_at

uploads
- id
- session_id
- owner_id
- original_name
- object_key
- mime_type
- size_bytes
- sha256
- kind
- status
- acquisition_time
- crs
- bbox geometry(Polygon, 4326)
- width
- height
- resolution_m
- bands jsonb
- nodata
- metadata jsonb
- created_at
- deleted_at

analysis_jobs
- id
- session_id
- status
- stage
- progress
- idempotency_key
- router_version
- attempt_count
- error_code
- error_detail
- queued_at
- started_at
- completed_at

model_executions
- id
- job_id
- model_name
- model_version
- role
- device
- started_at
- completed_at
- metrics jsonb

analysis_results
- id
- job_id
- session_id
- question
- answer_text
- confidence
- confidence_band
- workflow_id
- workflow_label
- usage_time_sec
- provenance jsonb
- created_at

result_layers
- id
- result_id
- layer_key
- label
- opacity
- source_upload_id
- raster_artifact_key

result_features
- id
- layer_id
- feature_key
- class
- label
- confidence
- area_m2
- geometry geometry(Geometry, 4326)
- properties jsonb

reports
- id
- result_id
- format
- object_key
- status
- expires_at
- created_at

audit_logs
- id
- user_id
- action
- resource_type
- resource_id
- request_id
- detail jsonb
- created_at
```

### 8.2 Database rules

- Add GiST indexes to `uploads.bbox` and `result_features.geometry`.
- Add indexes on `analysis_jobs.session_id`, `analysis_jobs.status`, and `analysis_results.session_id`.
- Use PostGIS `ST_IsValid` before storing result geometries.
- Simplify geometries for display using a tolerance appropriate to the map zoom, while preserving the full-resolution artifact privately.
- Store canonical geometries in EPSG:4326 and preserve source CRS in metadata.
- Use foreign keys and deletion policies so session deletion removes database metadata and schedules object cleanup.
- Run migrations with Alembic.

## 9. Storage Layout and Lifecycle

Suggested private object layout:

```text
private/{owner_id}/{upload_id}/original/{random-name}
private/{owner_id}/{upload_id}/normalized/{sha256}.cog.tif
private/{owner_id}/{job_id}/evidence/{layer-id}.geojson
private/{owner_id}/{job_id}/previews/{name}.png
private/{owner_id}/{result_id}/reports/{report-id}.pdf
```

Rules:

- Original uploads are immutable.
- Normalized rasters and intermediate outputs are private and short-lived.
- Results and reports are accessible only through authorization checks and short-lived signed URLs.
- Configure lifecycle deletion for demo inputs and intermediate artifacts.
- Retain audit records separately from user content where policy requires it.
- Back up PostgreSQL and critical result metadata; object storage must have versioning or a backup policy for production.

## 10. Frontend Integration Plan

### Phase 1: API foundation

1. Create `src/lib/api.ts` with typed `fetch` helpers.
2. Add `VITE_API_BASE_URL` and an environment example file.
3. Add auth bootstrap and token refresh handling.
4. Generate or hand-maintain TypeScript types from the backend OpenAPI schema.
5. Add a request ID to client-side error logs.

### Phase 2: Upload flow

1. Replace the local `URL.createObjectURL` identity with server `upload_id` values.
2. Keep `previewUrl` local-only and revoke it when an image is removed.
3. Initiate, upload, complete, and validate each file.
4. Display per-file upload and validation status.
5. Block Continue until all required uploads are `ready`.
6. Display the backend's specific validation error for invalid pairs.

### Phase 3: Ask and job flow

1. Replace `startAnalysis(() => defaultResultFor(question))` with `POST /sessions/{id}/analyses`.
2. Replace the fixed 800/1700/2600/3400 ms timers with polling or SSE.
3. Map server stages to `Validate`, `Route`, `Analyze`, and `Explain`.
4. Add retry, cancel, timeout, and failed-job states.
5. Prevent duplicate submissions with an idempotency key and disabled submit state.

### Phase 4: Results and map

1. Fetch `GET /sessions/{session_id}/results/latest` after job completion.
2. Adapt GeoJSON `[lng, lat]` coordinates to the Leaflet input expected by `MapView`, or update `MapView` to consume GeoJSON directly.
3. Fit the map to the result bounding box instead of the current fixed Mumbai view.
4. Show feature area, source date, and confidence in popups.
5. Render signed raster evidence URLs when available.
6. Keep the current `0.6` warning behavior, but make it API-configurable.

### Phase 5: Reports and regional data

1. Replace `downloadReport` with report creation and signed download.
2. Retain the local TXT export only when the network is unavailable and label it as a local fallback.
3. Replace direct Nominatim access with `/regions/{region_id}/boundary`.
4. Replace hard-coded regional metrics and suggestions with API responses, with local fixtures only in demo mode.

### 10.1 Suggested client-side state shape

```ts
interface AnalysisSessionState {
  sessionId: string | null
  mode: UploadMode
  uploads: UploadedImage[]
  question: string
  job: {
    id: string
    status: JobStatus
    stage: AnalysisStage
    progress: number
    error?: ApiError
  } | null
  result: AnalysisResult | null
}
```

Add explicit states for `uploading`, `validating`, `submitting`, `polling`, `completed`, `failed`, `cancelled`, and `expired`. A blank result is not an error state.

## 11. Environment Configuration

### Backend

```text
APP_ENV=development
APP_NAME=prithviq-api
API_PREFIX=/api/v1
DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/prithviq
REDIS_URL=redis://redis:6379/0
S3_ENDPOINT_URL=http://minio:9000
S3_BUCKET=prithviq-private
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
JWT_SECRET=...
JWT_ISSUER=prithviq-api
ACCESS_TOKEN_MINUTES=15
REFRESH_TOKEN_DAYS=14
MAX_UPLOAD_BYTES=1073741824
ALLOWED_ORIGINS=http://localhost:5173
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
NOMINATIM_USER_AGENT=PrithviQ/1.0 contact@example.com
MODEL_REGISTRY_URL=...
SENTRY_DSN=...
```

### Frontend

```text
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_MAP_TILE_URL=https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
VITE_MAP_ATTRIBUTION=...
VITE_DEMO_MODE=false
```

Never commit real credentials. Commit only `.env.example` with placeholders.

## 12. Security, Privacy, and Governance

### 12.1 Access control

- Enforce ownership on every upload, session, result, job, and report lookup.
- Never trust a client-provided `user_id`, role, object key, or session ID.
- Analysts may access only scopes explicitly granted to them.
- Admin operations require separate authorization and audit records.
- Signed URLs must be short-lived and scoped to one object.

### 12.2 Abuse controls

- Rate-limit login, upload initiation, question submission, and report generation.
- Limit concurrent jobs per user and globally.
- Validate question length and reject prompt-injection attempts aimed at infrastructure secrets or internal prompts.
- Do not pass raw user questions into shell commands, SQL, file paths, or model configuration without strict boundaries.
- Use timeouts for all provider and storage calls.

### 12.3 Privacy and retention

- Treat uploaded imagery and derived geospatial outputs as private by default.
- Document whether source images contain sensitive locations or personal data.
- Provide deletion at session level and ensure object storage cleanup is eventually consistent and observable.
- Define retention periods separately for originals, derived artifacts, reports, and audit logs.
- Keep model prompts and outputs out of general logs unless redacted and explicitly required.

### 12.4 Operational incident response

1. Revoke affected sessions and tokens.
2. Disable suspicious accounts or job sources.
3. Rotate compromised storage, database, model, and provider credentials.
4. Preserve request, audit, and worker logs.
5. Identify affected uploads and report artifacts.
6. Notify the responsible administrator according to the deployment policy.
7. Patch, test, redeploy, and document the incident.

## 13. Observability and Operations

Every request and job should carry:

- `request_id`.
- `session_id` when applicable.
- `job_id` when applicable.
- `user_id` or anonymous demo scope.
- Worker and model version.

Track metrics for:

- Upload bytes, rejection reasons, and validation latency.
- Queue depth and job age.
- Job success, failure, cancellation, and retry rates.
- Per-workflow latency and GPU/CPU/memory usage.
- Model confidence distribution and calibration drift.
- Report generation latency and download failures.
- Boundary provider latency, cache hit rate, and rate-limit responses.

Use structured JSON logs. Redact access tokens, signed URLs, passwords, raw image contents, and sensitive coordinates when logs are exported.

## 14. Local Development

Recommended local services:

```text
Frontend: Vite at http://localhost:5173
API: FastAPI at http://localhost:8000
PostgreSQL/PostGIS: localhost:5432
Redis: localhost:6379
MinIO: localhost:9000 and console at localhost:9001
Worker: same Python package, separate process
```

A useful development sequence is:

1. Start PostgreSQL/PostGIS, Redis, and MinIO with Docker Compose.
2. Run Alembic migrations.
3. Start the FastAPI API.
4. Start one worker without GPU requirements.
5. Start the Vite frontend.
6. Upload a small GeoTIFF fixture.
7. Submit a question and verify the complete job lifecycle.
8. Verify result GeoJSON, signed artifacts, report creation, deletion, and audit events.

The first backend milestone should support one deterministic mock workflow through the real API and queue. This proves the upload, authentication, session, job, polling, result, and report contracts before expensive model integration.

## 15. Testing Strategy

### 15.1 API and contract tests

- Generate client types from OpenAPI in CI.
- Validate every documented request and response against JSON Schema.
- Test authentication, role checks, ownership checks, token refresh, and revocation.
- Test idempotency for repeated analysis submissions.
- Test pagination or limits if history endpoints are added.

### 15.2 Upload tests

- Valid GeoTIFF, PNG, and JPEG demo files.
- Unsupported extension and MIME mismatch.
- Oversized file and pixel-count limit.
- Corrupted or malicious TIFF.
- Missing CRS and missing acquisition date.
- Valid and invalid two-date pairs.
- Valid and invalid optical/SAR pairs.
- Duplicate checksum behavior.
- Upload cancellation and cleanup.

### 15.3 Analysis tests

- One-image VQA routing.
- Water, vegetation, and built-up segmentation routing.
- Two-date registration and change detection.
- Optical/SAR fusion routing.
- Empty or ambiguous questions.
- Worker retry and permanent failure.
- Cancellation and timeout.
- Confidence aggregation and low-confidence warning threshold.

### 15.4 Geospatial tests

- CRS conversion to EPSG:4326.
- GeoJSON coordinate order.
- Invalid polygon repair or rejection.
- Geometry simplification without self-intersections.
- Bounding-box map fitting.
- Area calculations in a suitable projected CRS before returning square meters or square kilometers.
- Feature-count and payload-size limits.

### 15.5 End-to-end acceptance test

Given two compatible GeoTIFF uploads and the question `What changed between these two dates?`:

1. Both uploads reach `ready`.
2. The session is created in `twoDate` mode.
3. The analysis returns `202 Accepted` and a `job_id`.
4. Job stages progress through validate, route, analyze, and explain.
5. The completed result contains an answer, confidence, workflow, model versions, and at least one valid GeoJSON layer.
6. The frontend renders map evidence without swapping latitude and longitude.
7. A low-confidence result displays the warning.
8. A PDF report is generated and downloadable through a signed URL.
9. The audit log includes upload, analysis, and report events.
10. Deleting the session removes or schedules deletion of all private artifacts.

## 16. Deployment Topology

For a first deployment:

```text
Reverse proxy / TLS
  |
  +--> Frontend static assets
  +--> FastAPI API replicas
           |
           +--> PostgreSQL + PostGIS
           +--> Redis
           +--> S3 / MinIO
           +--> CPU worker pool
           +--> GPU worker pool
```

Deployment requirements:

- TLS termination at the reverse proxy.
- Separate API and worker scaling.
- Health endpoints for API, database, queue, storage, and model readiness.
- Migration step before application rollout.
- Rolling deployment with job compatibility across versions.
- GPU node monitoring and model warm-up checks.
- Database backups and restore drills.
- Object-storage lifecycle rules and backup policy.
- CORS restricted to known frontend origins.
- Content Security Policy and secure response headers.

## 17. Definition of Done

Backend integration is complete when:

- The frontend no longer relies on analysis timers for the real path.
- Uploaded files have server-owned IDs and validated metadata.
- All three upload modes enforce their correct pair rules.
- Authentication and resource ownership are enforced.
- Analysis runs asynchronously with observable status and useful failure states.
- Results include answer, confidence, map evidence, provenance, and stable IDs.
- GeoJSON geometry and CRS conventions are explicit and tested.
- The map fits to returned evidence instead of a hard-coded demo location.
- Reports are generated by the backend and downloaded through authorized URLs.
- Nominatim and other third-party services are proxied and cached server-side.
- Demo fixtures are isolated behind a demo flag.
- OpenAPI contract tests, worker tests, geospatial tests, and an end-to-end workflow pass in CI.
- Logs, metrics, retention, backups, and incident procedures are documented.

## 18. Recommended Implementation Order

1. Scaffold FastAPI, configuration, OpenAPI, health checks, and error envelope.
2. Add PostgreSQL/PostGIS migrations and user/session/upload tables.
3. Add authentication and ownership checks.
4. Add MinIO/S3 upload initiation, completion, checksum validation, and metadata extraction.
5. Add a deterministic mock worker behind the real queue and job API.
6. Add the frontend API client and replace the timer-based analyzing flow.
7. Add the real single-image segmentation/VQA workflow.
8. Add two-date registration and change detection.
9. Add optical/SAR fusion.
10. Add GeoJSON result persistence, map fitting, and evidence artifacts.
11. Add backend reports and replace the local TXT download.
12. Add regional boundary/suggestion APIs and remove direct browser geocoding.
13. Add production security hardening, observability, retention, backups, and load testing.

This order keeps the integration testable at every stage and proves the API contract before model complexity becomes the dominant risk.
