# GEO-NIUS Frontend Technology Stack

> Audit of the actual frontend implementation (project: `satquery-ai-frontend`, version 0.1.0).
> Every technology listed below was verified against the source code — no assumptions or defaults.

## 1. Project Overview

GEO-NIUS is a single-page React application that simulates a satellite-imagery analysis platform. Users pick a category, upload imagery, ask a question, and view results on an interactive map. There is no backend — all analysis results are mock data driven by timed state transitions. Navigation is state-driven (no router), styling is Tailwind v4 plus one global CSS file with a `data-theme` token system, and the hero section features a real-time Three.js cinematic environment with dynamic shaders and smooth scrolling physics.

## 2. Technology Stack Summary

| Category | Technology | Version | Status | Purpose |
|----------|------------|---------|--------|---------|
| UI Framework | React | ^19.1.0 | Actively Used | Component model, hooks, rendering |
| Language | TypeScript | ~5.8.3 | Actively Used | All app code is `.ts`/`.tsx` |
| Build Tool | Vite | ^6.3.5 | Actively Used | Dev server + production bundling |
| Styling | Tailwind CSS | ^4.1.4 | Actively Used | Utility classes, `@theme` tokens |
| Global CSS | Hand-written CSS | — | Actively Used | Theme tokens, glass components, Vengeance UI grids |
| 3D | three | ^0.185.1 | Actively Used | 3D brand logo & terrain |
| 3D React Binding | @react-three/fiber | ^9.7.0 | Actively Used | `<Canvas>` + `useFrame` |
| 3D Helpers | @react-three/drei | ^9.112.0 | Actively Used | `CameraControls` for cinematic fly-bys |
| Mapping | Leaflet | ^1.9.4 | Actively Used | Landing map, region map, results map |
| Smooth Scroll | lenis | ^1.1.0 | Actively Used | Smooth inertia scrolling across the app |
| Icons | lucide-react | ^1.41.0 | Actively Used | All UI icons |
| Fonts | @fontsource-variable | ^5.3.0 | Actively Used | inter, playfair-display, fraunces |

*(Note: Unused dependencies like react-simple-maps and extra fonts have been completely purged from the codebase).*

## 3. Core Framework & Build System

- **React 19** (`react`, `react-dom` ^19.1.0) rendered through `createRoot` in `src/main.tsx` inside `<StrictMode>`.
- **Vite 6** (`vite.config.ts`) with `@vitejs/plugin-react` and `@tailwindcss/vite`.
- Build command: `tsc -b && vite build` — TypeScript project references (`tsconfig.app.json`, `tsconfig.node.json`) with `strict`. Output goes to `dist/`.

## 4. Styling & Design System

Primary: **Tailwind CSS v4** using the CSS-first configuration.

Secondary (significant): hand-written CSS in `src/index.css` providing:
- **Theme token system** — `@theme` colors/fonts/radii plus per-category palettes switched by `data-theme` attributes.
- **Reusable glass classes** — `.glass-card`, `.glass-card-elevated`, `.glass-btn`.
- **Premium UI Effects** — "Vengeance UI" style animated background grids and floating buttons.

## 5. 3D & Graphics Technologies

| Technology | Where | Purpose |
|---|---|---|
| **three** + **@react-three/fiber** | `TerrainTile.tsx`, `EarthObservationScene.tsx` | Real-time 3D terrain with custom WebGL Shaders for Materialization Holograms, geological strata, and LIDAR data particle point-clouds. |
| **@react-three/drei** | `EarthObservationScene.tsx` | `CameraControls` for dramatic, cinematic camera fly-bys on load. |
| **HTML Canvas 2D** | `AmbientCanvas.tsx` | Decorative ambient background blobs. |
| **Leaflet (raster tiles)** | `LandingMap`, `RegionMap`, `MapView` | Satellite imagery display (Esri World Imagery) and dark basemaps. |

## 6. Animation Technologies

- **Lenis Smooth Scroll** — Hooks into `requestAnimationFrame` for buttery-smooth page physics, wrapped around `App.tsx`.
- **CSS keyframes** — scroll-reveal (`reveal-stagger`), button floating (`animate-bounce`), water environment drift/caustics.
- **Three.js Shaders** — Holographic wave sweeps, point-cloud swirls, and material blending.

## 7. State Management & Data Fetching

- **React local state only** — `useState`/`useRef` lifted into `App.tsx` (`step`, `theme`, `activeCategory`, etc.). No Redux/Context.
- **Single real network call:** native `fetch` to Nominatim (OpenStreetMap) geocoder.
- **Mock data:** `src/data/mock.ts` simulates analysis pipelines.
