# PrithviQ AI - Change Log

This file records changes to the project. Newest entries appear at the top.

## [Unreleased] - 2026-09-08

### Added
- **Documentation alignment**: Updated the README, frontend stack audit, architecture, PRD, and design specification to reflect the FastAPI backend foundation, staged API integration, credential guide, and live-vs-demo boundaries.
- **API key guide**: Added `api_key.md` with provider sources, local generation instructions, environment examples, secret-handling rules, and a staged list of which credentials are needed.
- **Backend configuration contract**: Added environment settings and `.env.example` placeholders for JWT authentication, PostgreSQL/PostGIS, Redis, S3/MinIO, model registry, Nominatim identification, and optional Sentry reporting.
- **Backend foundation**: Added a FastAPI service under `backend/` with environment configuration, CORS support, versioned health endpoints, readiness checks, and initial Python dependencies.
- **Backend documentation**: Recorded Stage 1 implementation status and the next integration boundary in `api.md` and `backend-integration.md`.

### Notes
- The backend health and readiness routes are implemented. No external key is needed for `/health`; authentication, uploads, persistence, analysis workers, results, and reports remain scheduled for later stages.

### Security
- **Environment secrets**: Updated `.gitignore` to exclude local `.env` files while keeping `.env.example` templates tracked.

### Previously Added
- **3D Satellite**: Added a new interactive satellite model to the `EarthObservationScene` 3D environment.
- **Lighting & Design**: Improved satellite lighting and model design.

### Fixed
- **Analysis Markers**: Fixed `AnalysisMarker` layout and 3D positioning.
- **Build & TypeScript**: Resolved strict type errors in `AnalysisMarkers`, `EarthObservationScene`, and `ErrorBoundary` that were blocking Vercel builds.

## [MVP - Frontend Prototype] - 2026-09-02

### Changed
- **Redesign**: Completely overhauled the UI to an Obsidian dark theme with glassmorphism (`backdrop-blur-xl`, semi-transparent borders).
- **Hero Section**: Added an interactive 3D `GlobeHero` component using `three.js` to visualize satellite metrics (Coverage, Resolution, Confidence, Processing Time).
- **Typography**: Migrated from `Public Sans` to `Plus Jakarta Sans` for body text, keeping `Fraunces` for display headings.
- **Map Integration**: Updated Leaflet maps to use CartoDB Dark Matter tiles to match the new dark aesthetic.
- **Docs**: Updated `DESIGN.md`, `architecture.md`, and `prd.md` to reflect the new visual identity.

## [MVP - Frontend Prototype] - 2026-08-31

### Added
- Scaffolded the React + TypeScript + Tailwind CSS v4 application in `src/` (Vite build tool).
- Leaflet map integration for rendering geospatial analysis overlays.
- Four-screen user flow matching the design doc:
  - **Upload** - analysis mode picker (single, two-date, optical+SAR), drag-and-drop file inputs with inline validation, demo scenario launcher.
  - **Ask** - plain-language question input with suggested-question chips.
  - **Analyzing** - staged progress (Validate → Route → Analyze → Explain) with a simulated AI router badge.
  - **Results** - text answer, confidence score, low-confidence warning banner, map evidence with before/after layer comparison, legend, collapsible model/workflow summary.
- Mock demo data in `src/data/mock.ts` with three scenarios (flood change, water mapping, optical+SAR built-up expansion) covering the PRD's supported use cases.
- Downloadable report generation (text file) from the results screen.

### Notes
- At the time of this MVP entry, the backend was intentionally **not** part of the prototype; all analysis results were simulated client-side. The current repository now contains the Stage 1 FastAPI foundation.
- Analysis pipeline (router/model selection) is stubbed with timed steps; a real AI router and inference workers will replace it in a later phase.

---

_Notable conventions: changes are grouped into Added / Changed / Deprecated / Removed / Fixed / Security sections where applicable.