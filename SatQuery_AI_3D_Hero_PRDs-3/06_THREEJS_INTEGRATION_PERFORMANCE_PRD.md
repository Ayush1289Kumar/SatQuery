# PRD 06 — Three.js Integration, Responsiveness and Performance

## Goal
Integrate the 3D hero cleanly into the existing project.

## First action: inspect before changing
Determine:
- framework (React/Vite/Next/etc.)
- existing animation libraries
- current CSS architecture
- whether Three.js dependencies already exist

Adapt to the repository rather than restructuring it.

## Preferred stack when compatible
- three
- @react-three/fiber
- @react-three/drei
Optional:
- postprocessing only if already available or truly necessary

Avoid adding a large GLTF model if procedural terrain can achieve the concept.

## Component architecture
Keep responsibilities separated, for example:
- HeroSection
- EarthObservationScene
- TerrainTile
- ScanEffect
- AnalysisMarkers

Names may adapt to existing conventions.

## Rendering
- Canvas only for the 3D visualization region, not unnecessarily across the entire app
- configure DPR conservatively
- use antialiasing only as needed
- avoid excessive shadows
- avoid huge textures
- pause/reduce rendering when hero is not visible if practical

## Responsive behavior
Desktop:
- text left, 3D right
Tablet:
- smaller object, maintain hierarchy
Mobile:
- stack or position 3D object below headline
- reduce marker count
- reduce geometry complexity if needed

## Loading/fallback
Provide:
- subtle static placeholder/background while WebGL initializes
- graceful fallback if WebGL unavailable
- no blank white/black layout shift

## Validation
Run the project's existing:
- build
- lint/typecheck where applicable
- local visual verification

Check:
- desktop
- tablet
- mobile

## Final scope audit
Before finishing, review changed files and confirm:
- only first hero page and direct supporting 3D components/styles/dependencies changed
- no other pages were visually altered
- no existing analysis/results functionality was touched
