# PRD 01 — Hero Structure and Current Map Removal

## Goal
Remove the current large satellite-map hero background and replace it with a clean stage for the new 3D Earth Observation Tile.

## Important constraint
Do NOT alter any page below the fold or any other route/component. Do not redesign the navbar unless the existing hero layout requires a small positioning adjustment.

## Step-by-step
1. Inspect the project to find the exact component responsible for the first landing hero.
2. Identify the current satellite map image/background layer.
3. Remove that background ONLY from this hero.
4. Preserve existing text content and CTA functionality unless layout changes are required for readability.
5. Create a two-zone composition:
   - content zone: approximately left 45%
   - visualization zone: approximately right 55%
6. On mobile/tablet, stack content and visualization gracefully.
7. Replace the map background with a subtle atmospheric background:
   - near-black/deep charcoal
   - very faint radial light behind the 3D tile
   - subtle grain/noise only if cheap to render
   - optional faint grid lines at extremely low opacity
8. Ensure text remains the primary readable layer and never competes with the 3D scene.

## Visual representation
Think of a museum display or scientific visualization stage:
the object is illuminated against darkness rather than pasted onto a busy image.

## Acceptance criteria
- No large satellite map remains in the hero.
- Existing hero messaging and CTA remain functional.
- No unrelated page changes.
- The right side has enough empty spatial depth for the 3D object.
- Hero still looks intentional even while the 3D canvas is loading.
