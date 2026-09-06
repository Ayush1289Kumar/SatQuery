# PRD 04 — Analysis Markers and Data Callouts

## Goal
Add restrained floating information elements around the 3D terrain to make the scene feel intelligent and interactive.

## Core rule
These are supporting evidence, NOT dashboard clutter.

## Recommended marker count
Use only 3–5 visible points/cards at any moment.

## Suggested examples
Use project-relevant neutral metrics such as:
- CONFIDENCE — 87%
- FLOOD EXTENT — 12.4 km²
- RESOLUTION — 10 m
- ACTIVE MODELS — 3
- CHANGE DETECTED

Do not imply live data unless the app actually provides live data.

## Visual form
Small glass-like cards:
- dark translucent background
- subtle border
- tiny status dot
- one prominent number/value
- minimal label
- slight depth separation from terrain

Connect cards to relevant terrain points using:
- thin curved lines
- faint dotted lines
- small anchor nodes

## Behavior
- Cards should gently hover.
- They can fade/activate after a scan passes.
- On cursor movement they should retain correct 3D parallax.
- Avoid rapid bouncing or excessive movement.

## Placement
Place cards asymmetrically around the object:
- one upper-right
- one left-mid
- one lower-right
Never create a perfectly symmetrical 'HUD' layout.

## Technical recommendation
For React Three Fiber:
- use drei Html only for a few labels if DOM accessibility is needed
- otherwise use lightweight sprites/planes/text
- ensure labels don't cause excessive layout work

## Acceptance criteria
The data cards should make the object feel like an active analytical system without stealing attention from the terrain.
