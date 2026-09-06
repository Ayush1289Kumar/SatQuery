# Copy-Paste Prompt for Cline

You are modifying an existing SatQuery AI project. Work carefully and incrementally.

YOUR TASK:
Redesign ONLY the very first landing-page hero section. Remove its current large satellite map background and replace that visual focal point with an interactive 3D Earth Observation Tile.

IMPORTANT SCOPE LOCK:
- Do not redesign or modify any section after the first hero.
- Do not modify analysis pages, result pages, maps, evidence panels, navigation behavior, backend, APIs, routes, or unrelated components.
- Preserve existing branding, typography, copy, CTA functionality, and overall visual language wherever possible.
- Before making edits, inspect the repository and identify the exact hero component and all files directly responsible for it.
- Do not perform broad refactors.

Read and implement the PRDs in this exact order:
1. 00_MASTER_PRD.md
2. 01_HERO_STRUCTURE_AND_MAP_REMOVAL_PRD.md
3. 02_3D_EARTH_OBSERVATION_TILE_PRD.md
4. 03_SATELLITE_SCAN_PRD.md
5. 04_ANALYSIS_MARKERS_AND_DATA_CALLOUTS_PRD.md
6. 05_INTERACTION_AND_SCROLL_MOTION_PRD.md
7. 06_THREEJS_INTEGRATION_PERFORMANCE_PRD.md

WORKFLOW:
PHASE 1 — INSPECT
First inspect the existing project structure and report:
- framework/build tool
- current hero component
- current styling method
- whether Three.js/R3F is already installed
- exact files you intend to modify
Do not edit unrelated files.

PHASE 2 — PLAN
Briefly state the minimal implementation plan. Prefer React Three Fiber + Three.js if compatible with the existing stack. Do not introduce unnecessary frameworks.

PHASE 3 — IMPLEMENT INCREMENTALLY
Implement one PRD phase at a time. After each major phase:
- check for compile errors
- keep changes scoped
- preserve responsiveness

CORE VISUAL REQUIREMENT:
The 3D object must be a floating cut-out piece of Earth's surface, NOT a globe. It should communicate a specific geographic region being observed by satellite and analyzed by AI.

The visual story is:
SATELLITE OBSERVATION → SCANNING → DATA EXTRACTION → ACTIONABLE INTELLIGENCE

The terrain should have subtle elevation, visible slab thickness, coherent land/vegetation/water zones, restrained contour/grid details, a periodic scanning sweep, and only a few elegant analytical callouts.

STYLE:
Premium, cinematic, scientific, restrained.
Use deep near-black atmospheric background with muted earth tones and subtle aqua/teal analytical accents.
Avoid neon cyberpunk aesthetics, excessive HUD elements, generic particles, game-like terrain, and overly literal sci-fi visuals.

TECHNICAL PRIORITIES:
- procedural/lightweight terrain preferred over heavy downloaded 3D assets
- smooth pointer tilt with damping
- subtle idle animation
- respect reduced motion
- responsive canvas
- graceful fallback
- good performance on average laptops

DO NOT:
- change the content or layout of later sections
- replace the entire website design
- add unrelated dependencies
- create fake live-data claims
- add a new globe
- leave the old satellite-map hero background underneath the 3D scene

FINAL CHECK:
Before declaring completion:
1. list every changed file and why it changed
2. confirm no unrelated pages/components were modified
3. run build/typecheck/lint where available
4. verify desktop and mobile hero behavior
5. describe any dependency added and why
