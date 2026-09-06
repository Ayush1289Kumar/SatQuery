# SatQuery AI — Hero Redesign Master PRD

## Mission
Redesign ONLY the very first landing/hero page of SatQuery AI. Replace the current full-screen satellite map background with an interactive 3D Earth Observation Tile.

## Absolute scope boundary
- Modify ONLY the first/landing hero section and files strictly required to support it.
- Do NOT redesign navigation, analysis pages, result pages, cards, typography system, routing, backend, APIs, or any other section.
- Preserve existing app behavior outside the hero.
- Before editing, inspect the repository and identify the current hero component and styling architecture.
- Do not make unrelated formatting/refactoring changes.

## Core visual concept
The hero should communicate:
SATELLITE OBSERVATION → AI ANALYSIS → ACTIONABLE LAND/DISASTER INTELLIGENCE

Layout:
- Left: existing brand/navigation and hero copy, preserving the current site's visual identity.
- Right/center-right: a floating interactive 3D Earth Observation Tile.
- Background: clean cinematic near-black/deep charcoal atmosphere with subtle depth, NOT a satellite map.
- The 3D object is the visual focal point, not decorative background imagery.

## 3D composition
A stylized square terrain tile floats in perspective like a cut-out piece of Earth:
- raised terrain/elevation
- subtle mountain ridges
- vegetation/land patches
- one water/coastal edge if aesthetically appropriate
- thin topographic contour/grid accents
- visible side thickness/layers
- satellite scan beam moving across the tile
- restrained floating intelligence markers

## Design language
Premium scientific, cinematic, restrained.
Avoid:
- neon cyberpunk overload
- generic HUD overload
- game-like low-poly appearance
- excessive glowing labels
- random particles
- a globe
- a literal Google-Earth copy

Suggested palette:
- background: near-black with deep forest/blue undertones
- terrain: muted olive, sage, earth brown, slate
- water: subdued deep teal
- analysis glow: soft aqua/teal
- scan accent: pale cyan/green, low intensity
- typography: preserve existing site typography unless hero readability requires a local adjustment

## Success criteria
The first impression should make a visitor understand that SatQuery AI observes specific Earth regions through satellite data and turns them into intelligence. The scene must feel purposeful, interactive, and premium.

## Execution rule
Implement incrementally using the accompanying numbered PRDs. After each phase, verify that:
1. only hero-related files changed,
2. the app still builds,
3. responsiveness works,
4. animation does not cause excessive CPU/GPU usage.
