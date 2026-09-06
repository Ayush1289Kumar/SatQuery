# PRD 03 — Satellite Observation Scan

## Goal
Add a visual scanning mechanism that explains the relationship between satellite observation and intelligence extraction.

## Important design decision
Do NOT add a large literal realistic satellite model unless it is extremely subtle. The scan itself should be the storytelling device.

## Primary implementation
Create a scanning sweep that travels slowly across the terrain tile.

Visual sequence:
1. Terrain rests naturally.
2. A soft thin scan plane/line approaches from one edge.
3. The scan travels across the terrain.
4. Areas immediately under the scan gain temporary analytical highlights.
5. A few intelligence markers activate.
6. Highlights softly fade.
7. Pause.
8. Repeat.

## Scan design
Use one or a combination of:
- transparent vertical scan plane
- shader-based moving gradient
- emissive contour line
- projected light effect

Keep opacity low. This is a scientific instrument effect, not a laser weapon.

## Suggested detected regions
As the scan crosses, subtly reveal:
- vegetation region → muted green/aqua highlight
- water/flood-prone region → soft blue highlight
- elevation ridge → warm pale contour highlight

Do not permanently color the entire terrain like a heatmap.

## Animation timing
Recommended:
- idle: 4–7 seconds
- scan pass: 4–6 seconds
- rest: 2–4 seconds
- use smooth easing
- no sudden loops

## Performance
Prefer a lightweight shader/material animation or a small number of transparent meshes. Do not create hundreds of animated DOM elements.

## Acceptance criteria
A viewer should intuitively understand:
'Satellite data is scanning this geographic area and discovering meaningful information.'
