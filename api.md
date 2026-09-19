# PrithviQ AI API Reference

## Base Configuration

```text
Development: http://localhost:8000/api/v1
Production:  https://api.example.com/api/v1
```

Frontend environment variable:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

All JSON responses should include a request ID:

```json
{
  "data": {},
  "request_id": "req_01J..."
}
```

Use `Authorization: Bearer <access_token>` for protected endpoints. Use `Idempotency-Key` on analysis submissions.

## Implementation Status

### Stage 1 - Backend foundation

Implemented in `backend/`:

- FastAPI application with `/health` and `/api/v1/health`.
- Dependency-aware readiness checks at `/health/ready` and `/api/v1/health/ready`.
- Environment-based configuration using `.env` and `backend/.env.example`.
- CORS configuration for the Vite frontend.
- Consistent `{ data, request_id }` response envelope for health responses.

The upload, authentication, session, analysis, result, report, regional, and worker APIs below are the target contracts for the next stages. They are not implemented yet.

Run the implemented backend from the repository root after installing `backend/requirements.txt`:

```powershell
python -m uvicorn backend.app.main:app --reload --port 8000
```

Check `http://localhost:8000/api/v1/health`. Readiness returns `503` until the database, Redis, object storage, and worker settings are configured.

### Next stage

Implement authentication, upload initiation/completion, and upload metadata validation before adding the analysis queue.

## Required Keys and Services

For instructions on obtaining and securely storing each value, see [api_key.md](api_key.md).

No external API key is required for the current `/health` endpoint. The following values are needed as implementation progresses:

| Variable | Required when | Secret? | Purpose |
|---|---|---:|---|
| `JWT_SECRET` | Authentication stage | Yes | Signs access tokens; use a long random value |
| `DATABASE_URL` | Persistence stage | Yes | PostgreSQL/PostGIS connection string; contains credentials |
| `REDIS_URL` | Queue stage | Usually | Redis connection string for jobs and rate limits |
| `OBJECT_STORAGE_ENDPOINT` | Upload stage | No | S3/MinIO endpoint |
| `OBJECT_STORAGE_BUCKET` | Upload stage | No | Private bucket name |
| `OBJECT_STORAGE_ACCESS_KEY` | Upload stage | Yes | S3/MinIO access credential |
| `OBJECT_STORAGE_SECRET_KEY` | Upload stage | Yes | S3/MinIO secret credential |
| `MODEL_REGISTRY_URL` | Real model stage | No | Model registry or inference service URL |
| `MODEL_REGISTRY_TOKEN` | Real model stage | Yes | Token for a private model registry |
| `NOMINATIM_USER_AGENT` | Region boundary stage | No | Identifies the backend when proxying Nominatim |
| `SENTRY_DSN` | Observability stage | No | Optional error-reporting project DSN |

Do not send passwords, JWT secrets, storage secrets, or model tokens in chat or commit them to Git. Put them in a local `.env` file or deployment secret manager. The committed `backend/.env.example` contains placeholders only.

## API List

### Required for the first integration

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Log in a user |
| `POST` | `/auth/refresh` | Refresh an expired access token |
| `POST` | `/auth/logout` | Revoke the refresh-token session |
| `GET` | `/auth/me` | Get the current user |
| `POST` | `/uploads/initiate` | Request a presigned upload URL |
| `POST` | `/uploads/{upload_id}/complete` | Confirm that a file was uploaded |
| `GET` | `/uploads/{upload_id}` | Get validation and raster metadata |
| `POST` | `/sessions` | Create an analysis session |
| `POST` | `/sessions/{session_id}/analyses` | Submit a question and create an analysis job |
| `GET` | `/jobs/{job_id}` | Poll analysis progress |
| `POST` | `/jobs/{job_id}/cancel` | Cancel a queued or running job |
| `GET` | `/sessions/{session_id}/results/latest` | Get the completed analysis result |
| `POST` | `/results/{result_id}/reports` | Generate a report |
| `GET` | `/reports/{report_id}` | Get report status and download URL |

### Recommended supporting APIs

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Basic API health check |
| `GET` | `/health/ready` | Check database, queue, storage, and worker readiness |
| `GET` | `/jobs/{job_id}/events` | Optional Server-Sent Events progress stream |
| `GET` | `/regions/states` | Load state selector data |
| `GET` | `/regions/{region_id}/cities` | Load city selector data |
| `GET` | `/regions/{region_id}/boundary` | Load cached GeoJSON region boundaries |
| `GET` | `/suggestions?category={category}` | Load category-specific questions |

## 1. Authentication APIs

### `POST /auth/login`

Authenticates the user.

Request:

```json
{
  "email": "analyst@example.com",
  "password": "user-password"
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

### `POST /auth/refresh`

Refreshes the access token. The refresh token should be an `HttpOnly`, `Secure` cookie.

Response:

```json
{
  "data": {
    "access_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 900
  },
  "request_id": "req_01J..."
}
```

### `POST /auth/logout`

Revokes the current refresh-token family.

Response status: `204 No Content`.

### `GET /auth/me`

Returns the authenticated user.

Response:

```json
{
  "data": {
    "id": "usr_123",
    "email": "analyst@example.com",
    "role": "analyst"
  },
  "request_id": "req_01J..."
}
```

Supported roles: `user`, `analyst`, `admin`.

## 2. Upload APIs

Supported frontend modes:

- `single`: one optical image.
- `twoDate`: two compatible images from different dates.
- `opticalSar`: one optical image and one SAR image.

### `POST /uploads/initiate`

Requests a presigned object-storage upload URL.

Request:

```json
{
  "filename": "scene_2026-08-24_optical.tif",
  "content_type": "image/tiff",
  "size_bytes": 184320000,
  "sha256": "optional-client-checksum",
  "kind": "optical",
  "mode": "twoDate"
}
```

Allowed `kind` values: `optical`, `sar`.

Allowed `mode` values: `single`, `twoDate`, `opticalSar`.

Response:

```json
{
  "data": {
    "upload_id": "upl_01J...",
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

The frontend uploads the file directly to `upload_url` using the returned headers.

Accepted MVP formats:

- `.tif`, `.tiff`, `image/tiff`
- `.png`, `.jpg`, `.jpeg` for demo/non-geospatial input

Recommended initial limit: 1 GiB per file.

### `POST /uploads/{upload_id}/complete`

Confirms the direct upload and starts server-side validation.

Request:

```json
{
  "etag": "storage-etag",
  "sha256": "server-or-client-checksum"
}
```

Response:

```json
{
  "data": {
    "upload_id": "upl_01J...",
    "status": "validating"
  },
  "request_id": "req_01J..."
}
```

Upload statuses:

```text
initiated | uploading | validating | ready | rejected | expired
```

### `GET /uploads/{upload_id}`

Returns validation status and normalized raster metadata.

Response when ready:

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
    "nodata": 0,
    "validation_errors": []
  },
  "request_id": "req_01J..."
}
```

Validation must check file signature, malware status, file size, pixel count, CRS, acquisition metadata, readable raster structure, and sensor kind.

## 3. Analysis Session APIs

### `POST /sessions`

Creates a session after all uploads are ready.

Request:

```json
{
  "mode": "twoDate",
  "upload_ids": ["upl_before", "upl_after"],
  "category": "disaster",
  "region": {
    "state": "Maharashtra",
    "city": "Mumbai"
  }
}
```

Validation rules:

| Mode | Required uploads |
|---|---:|
| `single` | Exactly one |
| `twoDate` | Exactly two, same compatible area, different dates |
| `opticalSar` | Exactly two, one optical and one SAR |

Response:

```json
{
  "data": {
    "session_id": "ses_01J...",
    "mode": "twoDate",
    "status": "created",
    "upload_ids": ["upl_before", "upl_after"],
    "created_at": "2026-09-09T11:45:00Z"
  },
  "request_id": "req_01J..."
}
```

Session statuses:

```text
created | active | completed | failed | cancelled | expired
```

## 4. Analysis APIs

### `POST /sessions/{session_id}/analyses`

Submits the user question and places an asynchronous job on the worker queue.

Headers:

```text
Authorization: Bearer <access_token>
Idempotency-Key: unique-key-per-submit
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

Response status: `202 Accepted`.

```json
{
  "data": {
    "job_id": "job_01J...",
    "session_id": "ses_01J...",
    "status": "queued",
    "stage": "validate",
    "progress": 0,
    "estimated_seconds": 30,
    "created_at": "2026-09-09T11:46:00Z"
  },
  "request_id": "req_01J..."
}
```

The same idempotency key must return the existing job instead of creating a duplicate analysis.

### `GET /jobs/{job_id}`

Returns analysis progress for `AnalyzingScreen`.

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
    "updated_at": "2026-09-09T11:46:15Z",
    "error": null
  },
  "request_id": "req_01J..."
}
```

Job status values:

```text
created | validating | queued | routing | processing | explaining |
completed | failed | cancelled | expired
```

Frontend stage mapping:

| API stage | Current UI label |
|---|---|
| `validate` | Validate |
| `route` | Route |
| `analyze` | Analyze |
| `explain` | Explain |

The frontend should poll this endpoint every 1 to 2 seconds, or use the optional SSE endpoint below.

### `POST /jobs/{job_id}/cancel`

Requests cancellation.

Response:

```json
{
  "data": {
    "job_id": "job_01J...",
    "status": "cancelled"
  },
  "request_id": "req_01J..."
}
```

### `GET /jobs/{job_id}/events` optional

Server-Sent Events stream for real-time progress.

```text
event: progress
data: {"stage":"analyze","progress":68}

event: completed
data: {"result_id":"res_01J..."}
```

Polling should remain the fallback.

## 5. Result APIs

### `GET /sessions/{session_id}/results/latest`

Returns the data required by `ResultsScreen` and `MapView`.

Response:

```json
{
  "data": {
    "result_id": "res_01J...",
    "session_id": "ses_01J...",
    "job_id": "job_01J...",
    "question": "What changed between these two dates?",
    "answer": "Newly flooded areas appeared along the central flood plain.",
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
      }
    ],
    "usage_time_sec": 11.2,
    "created_at": "2026-09-09T11:46:21Z",
    "completed_at": "2026-09-09T11:46:32Z",
    "layers": [
      {
        "id": "after",
        "label": "24 Aug 2026 (after)",
        "opacity": 0.6,
        "geometry_format": "geojson",
        "features": [
          {
            "id": "feature_01J...",
            "type": "flood",
            "label": "Newly flooded",
            "confidence": 0.84,
            "area_m2": 3100000,
            "geometry": {
              "type": "Polygon",
              "coordinates": [
                [[72.86, 19.03], [72.90, 19.07], [72.86, 19.03]]
              ]
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

### Result requirements

- `confidence` is a number from `0` to `1`.
- Return both aggregate confidence and per-feature confidence.
- Return model and router versions for provenance.
- Return all source upload IDs and acquisition dates.
- Return geometry as GeoJSON using `EPSG:4326`.
- GeoJSON coordinates are `[longitude, latitude]`.
- The current Leaflet `MapView` expects `[latitude, longitude]`; convert once in the frontend adapter or update `MapView` to render GeoJSON directly.
- Preserve the existing low-confidence warning threshold of `0.6` unless product configuration changes it.

Supported highlight types:

```text
water | built | flood | vegetation | land
```

## 6. Report APIs

### `POST /results/{result_id}/reports`

Creates a downloadable report.

Request:

```json
{
  "format": "pdf",
  "include": [
    "summary",
    "input_metadata",
    "map_evidence",
    "model_provenance",
    "confidence_warning"
  ]
}
```

Response status: `202 Accepted`.

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

Supported formats: `pdf`, `png`, `geojson`, `json`.

### `GET /reports/{report_id}`

Returns report status and a short-lived signed download URL.

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

Report statuses:

```text
queued | generating | ready | failed | expired
```

The report should include the question, answer, confidence, warning, input filenames and dates, CRS, map evidence, layer legend, workflow, model versions, timestamps, result ID, and provenance.

## 7. Regional Data APIs

These APIs replace the current local fixtures and direct browser request to Nominatim.

### `GET /regions/states`

Response:

```json
{
  "data": [
    {
      "id": "mh",
      "name": "Maharashtra"
    }
  ],
  "request_id": "req_01J..."
}
```

### `GET /regions/{region_id}/cities`

Response:

```json
{
  "data": [
    {
      "id": "mumbai",
      "name": "Mumbai",
      "coordinates": [72.8777, 19.0760],
      "state_id": "mh"
    }
  ],
  "request_id": "req_01J..."
}
```

Regional coordinates should use `[longitude, latitude]` consistently in API responses.

### `GET /regions/{region_id}/boundary`

Returns a cached, authorized GeoJSON boundary.

```json
{
  "data": {
    "region_id": "mumbai",
    "geometry": {
      "type": "MultiPolygon",
      "coordinates": []
    },
    "source": "openstreetmap",
    "retrieved_at": "2026-09-09T10:00:00Z"
  },
  "request_id": "req_01J..."
}
```

The backend must provide attribution, caching, rate limiting, and a provider fallback policy.

### `GET /suggestions?category=disaster`

Returns questions for `AIQuerySuggestions` and `AskScreen`.

```json
{
  "data": [
    {
      "id": "flood-change",
      "label": "What changed between these dates?",
      "text": "What changed between these two dates?"
    }
  ],
  "request_id": "req_01J..."
}
```

## 8. Health APIs

### `GET /health`

Basic process health. Returns `200` if the API process is running.

### `GET /health/ready`

Checks dependencies.

```json
{
  "data": {
    "api": "ok",
    "database": "ok",
    "redis": "ok",
    "object_storage": "ok",
    "worker": "ok"
  },
  "request_id": "req_01J..."
}
```

Return `503` when a required dependency is unavailable.

## 9. Common Error Responses

Use an RFC 7807-style error body:

```json
{
  "type": "https://api.prithviq.example/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "detail": "The two-date mode requires two images with different acquisition dates.",
  "code": "INVALID_IMAGE_PAIR",
  "request_id": "req_01J...",
  "field_errors": [
    {
      "field": "upload_ids",
      "message": "Two compatible uploads are required."
    }
  ]
}
```

Important status codes:

| Status | Meaning |
|---:|---|
| `400` | Malformed request |
| `401` | Missing or expired authentication |
| `403` | Authenticated but not authorized |
| `404` | Resource does not exist or is not visible to the user |
| `409` | Duplicate/idempotency conflict or invalid state transition |
| `413` | File or request is too large |
| `415` | Unsupported media type |
| `422` | Valid JSON but invalid business or raster data |
| `429` | Rate limit exceeded |
| `500` | Unexpected backend error |
| `503` | Dependency or worker unavailable |

The frontend should show user-safe `detail` text and log the `request_id` for support.

## 10. Frontend Integration Order

1. Add `VITE_API_BASE_URL` and a typed API client.
2. Add login, refresh, logout, and current-user state.
3. Replace local image IDs with `/uploads/initiate`, direct upload, `/complete`, and `/uploads/{id}`.
4. Create a session with `POST /sessions`.
5. Submit the question with `POST /sessions/{id}/analyses`.
6. Replace the timer-based `AnalyzingScreen` with `/jobs/{job_id}` polling.
7. Fetch `/sessions/{id}/results/latest` when the job completes.
8. Adapt GeoJSON to the Leaflet map or update `MapView` to accept GeoJSON.
9. Replace the browser TXT report with report creation and signed download.
10. Replace direct Nominatim access and local region fixtures with region APIs.
11. Keep `src/data/mock.ts` only behind an explicit demo mode.

## 11. Minimum Backend Milestone

The first backend milestone should implement these endpoints with a deterministic mock worker:

```text
POST /auth/login
POST /auth/refresh
POST /uploads/initiate
POST /uploads/{upload_id}/complete
GET  /uploads/{upload_id}
POST /sessions
POST /sessions/{session_id}/analyses
GET  /jobs/{job_id}
GET  /sessions/{session_id}/results/latest
POST /results/{result_id}/reports
GET  /reports/{report_id}
GET  /health
GET  /health/ready
```

Once this complete lifecycle works, replace the mock worker with the real VQA, segmentation, change-detection, and optical-SAR workflows.
