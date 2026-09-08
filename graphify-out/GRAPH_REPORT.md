# Graph Report - SatQuery  (2026-09-08)

## Corpus Check
- 40 files · ~20,598 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 329 nodes · 436 edges · 19 communities (18 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fea4be7f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mock.ts
- dependencies
- devDependencies
- SatQuery AI - Product Requirements Document
- compilerOptions
- Logo.tsx
- RegionMap.tsx
- compilerOptions
- App.tsx
- EarthObservationScene.tsx
- replace_vars.cjs
- tsconfig.json
- 2. Component Breakdown
- 🛰️ SatQuery AI — Satellite Image Q&A
- SatQuery AI - Change Log
- GEO-NIUS Frontend Technology Stack
- ErrorBoundary
- SatQuery AI — Design System Specification

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 15 edges
3. `UploadedImage` - 11 edges
4. `SatQuery AI - Product Requirements Document` - 11 edges
5. `GeoScene()` - 9 edges
6. `GEO-NIUS Frontend Technology Stack` - 8 edges
7. `🛰️ SatQuery AI — Satellite Image Q&A` - 8 edges
8. `2. Component Breakdown` - 8 edges
9. `AnalysisResult` - 7 edges
10. `SatQuery AI — Design System Specification` - 7 edges

## Surprising Connections (you probably didn't know these)
- `AIQuerySuggestionsProps` --references--> `Category`  [EXTRACTED]
  src/components/AIQuerySuggestions.tsx → src/components/CategoryPanel.tsx
- `CategoryPageProps` --references--> `Category`  [EXTRACTED]
  src/components/CategoryPage.tsx → src/components/CategoryPanel.tsx
- `RegionMapProps` --references--> `CityData`  [EXTRACTED]
  src/components/RegionMap.tsx → src/data/indiaMockData.ts
- `StateCityPanelProps` --references--> `CityData`  [EXTRACTED]
  src/components/StateCityPanel.tsx → src/data/indiaMockData.ts
- `AmbientCanvas()` --calls--> `usePrefersReducedMotion()`  [EXTRACTED]
  src/components/AmbientCanvas.tsx → src/hooks/usePrefersReducedMotion.ts

## Import Cycles
- None detected.

## Communities (19 total, 1 thin omitted)

### Community 0 - "mock.ts"
Cohesion: 0.07
Nodes (43): AskScreen(), AskScreenProps, MapView(), MapViewProps, layerColor(), ResultsScreen(), ResultsScreenProps, WATER_LEGEND_COLORS (+35 more)

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (29): @fontsource-variable/fraunces, @fontsource-variable/inter, @fontsource-variable/playfair-display, leaflet, lenis, lucide-react, dependencies, @fontsource-variable/fraunces (+21 more)

### Community 2 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, tailwindcss, @tailwindcss/vite, @types/leaflet, @types/react, @types/react-dom, typescript, vite (+17 more)

### Community 3 - "SatQuery AI - Product Requirements Document"
Cohesion: 0.11
Nodes (17): 10. Presentation Line, 1. Product Goal, 2. Problem We Solve, 3. Users, 4. Main Requirements, 5. User Flow, 6. Security Requirements, 7. Tech Stack (+9 more)

### Community 4 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx (+15 more)

### Community 5 - "Logo.tsx"
Cohesion: 0.16
Nodes (17): AmbientCanvas(), LandingHero(), LandingHeroProps, buildBaseLeaf(), buildGlowTexture(), buildGridPositions(), buildOutline(), buildProtectiveLeaf() (+9 more)

### Community 6 - "RegionMap.tsx"
Cohesion: 0.16
Nodes (16): approximateCityBoundary(), boundaryCache, fetchCityBoundary(), hashSeed(), INDIA_CENTER, mulberry32(), RegionMap(), RegionMapProps (+8 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (18): ES2023, vite.config.ts, compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 8 - "App.tsx"
Cohesion: 0.09
Nodes (24): App(), CATEGORY_THEME, defaultResultFor(), Step, AIQuerySuggestions(), AIQuerySuggestionsProps, SUGGESTIONS, AnalyzingScreen() (+16 more)

### Community 9 - "EarthObservationScene.tsx"
Cohesion: 0.24
Nodes (4): AnalysisMarkers(), MarkerProps, Satellite(), TerrainTile()

### Community 10 - "replace_vars.cjs"
Cohesion: 0.33
Nodes (4): dir, fs, path, replacements

### Community 13 - "2. Component Breakdown"
Cohesion: 0.14
Nodes (13): 1. Architecture Overview, 2.1 Frontend (React SPA), 2.2 API Gateway (FastAPI), 2.3 Validation Service, 2.4 AI Router, 2.5 Analysis Workers, 2.6 Geospatial Services, 2.7 Report Service (+5 more)

### Community 14 - "🛰️ SatQuery AI — Satellite Image Q&A"
Cohesion: 0.14
Nodes (13): Build, 🤝 Contributing, Development, ✨ Features, 🚀 Getting Started, Installation, 📄 License, 🔗 Live (+5 more)

### Community 15 - "SatQuery AI - Change Log"
Cohesion: 0.20
Nodes (9): Added, Added, Changed, Fixed, [MVP - Frontend Prototype] - 2026-08-31, [MVP - Frontend Prototype] - 2026-09-02, Notes, SatQuery AI - Change Log (+1 more)

### Community 16 - "GEO-NIUS Frontend Technology Stack"
Cohesion: 0.22
Nodes (8): 1. Project Overview, 2. Technology Stack Summary, 3. Core Framework & Build System, 4. Styling & Design System, 5. 3D & Graphics Technologies, 6. Animation Technologies, 7. State Management & Data Fetching, GEO-NIUS Frontend Technology Stack

### Community 17 - "ErrorBoundary"
Cohesion: 0.22
Nodes (3): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState

### Community 18 - "SatQuery AI — Design System Specification"
Cohesion: 0.25
Nodes (7): Accessibility Baseline, Color Palette (Obsidian Dark Theme, Electric accents), Layout & Rhythm, Mission, Motion & Interaction, SatQuery AI — Design System Specification, Typography

## Knowledge Gaps
- **162 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+157 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _162 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mock.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07390648567119155 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `SatQuery AI - Product Requirements Document` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._