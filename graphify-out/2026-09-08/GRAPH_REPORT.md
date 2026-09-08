# Graph Report - SatQuery  (2026-09-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 245 nodes · 346 edges · 13 communities (11 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `244eaf12`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- dependencies
- devDependencies
- ResultsScreen.tsx
- compilerOptions
- Logo.tsx
- RegionMap.tsx
- compilerOptions
- AIQuerySuggestions.tsx
- EarthObservationScene.tsx
- replace_vars.cjs
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 15 edges
3. `GeoScene()` - 9 edges
4. `UploadedImage` - 8 edges
5. `AnalysisResult` - 6 edges
6. `Category` - 6 edges
7. `DemoScenario` - 5 edges
8. `CityData` - 5 edges
9. `usePrefersReducedMotion()` - 5 edges
10. `RegionMap()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `RegionMapProps` --references--> `CityData`  [EXTRACTED]
  src/components/RegionMap.tsx → src/data/indiaMockData.ts
- `StateCityPanelProps` --references--> `CityData`  [EXTRACTED]
  src/components/StateCityPanel.tsx → src/data/indiaMockData.ts
- `AIQuerySuggestionsProps` --references--> `Category`  [EXTRACTED]
  src/components/AIQuerySuggestions.tsx → src/components/CategoryPanel.tsx
- `CategoryPageProps` --references--> `Category`  [EXTRACTED]
  src/components/CategoryPage.tsx → src/components/CategoryPanel.tsx
- `DemoScenario` --references--> `AnalysisResult`  [EXTRACTED]
  src/data/mock.ts → src/types.ts

## Import Cycles
- None detected.

## Communities (13 total, 1 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.08
Nodes (31): App(), CATEGORY_THEME, defaultResultFor(), Step, AskScreen(), AskScreenProps, SmoothScroll(), MODE_LABEL (+23 more)

### Community 1 - "dependencies"
Cohesion: 0.07
Nodes (29): @fontsource-variable/fraunces, @fontsource-variable/inter, @fontsource-variable/playfair-display, leaflet, lenis, lucide-react, dependencies, @fontsource-variable/fraunces (+21 more)

### Community 2 - "devDependencies"
Cohesion: 0.08
Nodes (25): devDependencies, tailwindcss, @tailwindcss/vite, @types/leaflet, @types/react, @types/react-dom, typescript, vite (+17 more)

### Community 3 - "ResultsScreen.tsx"
Cohesion: 0.10
Nodes (20): AnalyzingScreen(), AnalyzingScreenProps, STEPS, MapViewProps, layerColor(), ResultsScreen(), ResultsScreenProps, WATER_LEGEND_COLORS (+12 more)

### Community 4 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2022, src, compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx (+15 more)

### Community 5 - "Logo.tsx"
Cohesion: 0.16
Nodes (17): AmbientCanvas(), LandingHero(), LandingHeroProps, buildBaseLeaf(), buildGlowTexture(), buildGridPositions(), buildOutline(), buildProtectiveLeaf() (+9 more)

### Community 6 - "RegionMap.tsx"
Cohesion: 0.15
Nodes (18): approximateCityBoundary(), boundaryCache, fetchCityBoundary(), hashSeed(), INDIA_CENTER, mulberry32(), RegionMap(), RegionMapProps (+10 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (18): ES2023, vite.config.ts, compilerOptions, allowImportingTsExtensions, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 8 - "AIQuerySuggestions.tsx"
Cohesion: 0.17
Nodes (12): AIQuerySuggestions(), AIQuerySuggestionsProps, SUGGESTIONS, CategoryPage(), CategoryPageProps, CATEGORIES, Category, CategoryPanel() (+4 more)

### Community 9 - "EarthObservationScene.tsx"
Cohesion: 0.28
Nodes (3): AnalysisMarkers(), MarkerProps, TerrainTile()

### Community 10 - "replace_vars.cjs"
Cohesion: 0.33
Nodes (4): dir, fs, path, replacements

## Knowledge Gaps
- **109 isolated node(s):** `Step`, `AskScreenProps`, `UploadScreenProps`, `HighlightType`, `AnalyzingScreenProps` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 121 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `Step`, `AskScreenProps`, `UploadScreenProps` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07505285412262157 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `ResultsScreen.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10461538461538461 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._