# SatQuery AI - Architecture Document

## 1. Architecture Overview

A three-tier web application:

- **Frontend (React + TypeScript + Tailwind)** - upload, ask, and visualise results.
- **Backend (Python FastAPI)** - APIs, validation, AI routing, analysis, reporting.
- **Storage & Data (PostgreSQL + PostGIS, local files; S3/MinIO in deployment).**

```
[Browser / React SPA]
        |
        |  HTTPS  (uploads, queries, results)
        v
[FastAPI Backend]
   |- Validation Service
   |- AI Router
   |- Analysis Workers (PyTorch / Hugging Face / OpenCV)
   |- Geospatial services (Rasterio / GDAL / GeoPandas)
   |- Report Service
        |
        v
[PostgreSQL + PostGIS]  [Local disk / S3 / MinIO]  [AI models / cache]
```

## 2. Component Breakdown

### 2.1 Frontend (React SPA)
- **Pages:** Upload, Ask, Results.
- **Globe Component:** `GlobeHero` using Three.js for real-time visualization of metrics and active processing states.
- **Map component:** MapLibre GL JS / Leaflet (CartoDB Dark Matter tiles) for overlays and before/after slider.
- **State:** lightweight client state for the current analysis session; auth token kept in memory (with refresh).
- **HTTP:** typed API client (auto-generated from OpenAPI schema).

### 2.2 API Gateway (FastAPI)
- REST endpoints under `/api/v1`.
- Endpoints: upload, validate, query/route, analysis status, results, report download, auth.
- Uses Pydantic schemas shared (mirrored) with the frontend types.
- OpenAPI auto-generated for the frontend client.

### 2.3 Validation Service
- Validates file type (GeoTIFF/TIFF, PNG/JPEG for demo).
- Validates size limits before upload.
- Extracts/validates date and location metadata.
- Checks pair compatibility (two-date, optical+SAR).

### 2.4 AI Router
- Parses the natural-language query and the uploaded image metadata.
- Routes to one of the specialist workflows.
- Returns the selected workflow/model name for display.

### 2.5 Analysis Workers
- **Single-image VQA:** image captioning / visual-question-answering model.
- **Change detection:** compares two dated images.
- **Optical-SAR combined:** fuses optical + SAR inputs.
- **Region highlighting:** runs text-guided segmentation/region detection.
- **Model adaptation:** at least one model fine-tuned on remote-sensing data (e.g. BigEarthNet).
- Heavy inference runs asynchronously via a job/task queue; results cached.

### 2.6 Geospatial Services
- RasterIO / GDAL for reading rasters and performing transformations.
- GeoPandas for vector geometry.
- PostGIS for spatial queries and geometry storage of highlights.

### 2.7 Report Service
- Generates a downloadable report (PDF/PNG) with answer, map evidence, confidence, workflow summary.

## 3. Data Model (PostgreSQL + PostGIS)

- **users:** id, email, password_hash, role (user | analyst | admin).
- **analysis_sessions:** id, user_id, created_at, status.
- **uploads:** id, session_id, secure_name, original_name, mime_type, size, date_meta, location_meta.
- **analysis_results:** id, session_id, question, answer_text, confidence, workflow, created_at.
- **geo_highlights:** id, result_id, class, geometry (PostGIS geometry), confidence.
- **audit_logs:** id, user_id, action, detail, created_at.

## 4. API Endpoints (v1) - Draft

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh token |
| POST | `/uploads` | Upload image(s) + validate |
| POST | `/sessions/{id}/ask` | Ask a question (triggers routing) |
| GET  | `/sessions/{id}/status` | Poll analysis progress |
| GET  | `/sessions/{id}/results` | Get results + geo highlights |
| GET  | `/sessions/{id}/report` | Download report |

## 5. Security & Operations

- **Auth:** JWT-based; roles user | analyst | admin.
- **Uploads:** private storage, secure randomised file names.
- **Secrets:** passwords/API keys in environment variables only, never committed.
- **HTTPS** after deployment.
- **Audit logging:** uploads, analysis runs, report downloads, admin actions.
- **Breach response:** block accounts + revoke sessions, rotate keys, preserve logs, notify admin, fix and document.
- **Data retention:** demo uploads deleted after a defined period.
- **Deployment:** Docker containers; GPU worker for inference when available.
- **Tech stack:** React, TypeScript, Tailwind, MapLibre/Leaflet, FastAPI, PyTorch, Hugging Face, OpenCV, Rasterio, GDAL, GeoPandas, PostgreSQL + PostGIS, S3/MinIO.