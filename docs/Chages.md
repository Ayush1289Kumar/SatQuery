# SatQuery AI - Change Log

This file records changes to the project. Newest entries appear at the top.

## [Unreleased] - 2026-09-02

### Changed
- **Redesign**: Completely overhauled the UI to an Obsidian dark theme with glassmorphism (`backdrop-blur-xl`, semi-transparent borders).
- **Hero Section**: Added an interactive 3D `GlobeHero` component using `three.js` to visualize satellite metrics (Coverage, Resolution, Confidence, Processing Time).
- **Typography**: Migrated from `Public Sans` to `Plus Jakarta Sans` for body text, keeping `Fraunces` for display headings.
- **Map Integration**: Updated Leaflet maps to use CartoDB Dark Matter tiles to match the new dark aesthetic.
- **Docs**: Updated `DESIGN.md`, `architecture.md`, and `prd.md` to reflect the new visual identity.

## [MVP - Frontend Prototype] - 2026-08-31

### Added
- Scaffolded a React + TypeScript + Tailwind CSS v4 application in `frontend/` (Vite build tool).
- Leaflet map integration for rendering geospatial analysis overlays.
- Four-screen user flow matching the design doc:
  - **Upload** - analysis mode picker (single, two-date, optical+SAR), drag-and-drop file inputs with inline validation, demo scenario launcher.
  - **Ask** - plain-language question input with suggested-question chips.
  - **Analyzing** - staged progress (Validate → Route → Analyze → Explain) with a simulated AI router badge.
  - **Results** - text answer, confidence score, low-confidence warning banner, map evidence with before/after layer comparison, legend, collapsible model/workflow summary.
- Mock demo data in `frontend/src/data/mock.ts` with three scenarios (flood change, water mapping, optical+SAR built-up expansion) covering the PRD's supported use cases.
- Downloadable report generation (text file) from the results screen.

### Notes
- Backend is intentionally **not** part of this MVP; all analysis results are simulated client-side.
- Analysis pipeline (router/model selection) is stubbed with timed steps; a real AI router and inference workers will replace it in a later phase.

---

_Notable conventions: changes are grouped into Added / Changed / Deprecated / Removed / Fixed / Security sections where applicable.