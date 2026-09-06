# PRD 02 — 3D Earth Observation Tile

## Goal
Build the hero's signature 3D object: a floating cut-out piece of Earth, representing a specific observed geographic region rather than the whole planet.

## Preferred technology
First inspect the existing stack.
If React is already used, prefer:
- Three.js
- @react-three/fiber
- @react-three/drei

Do not introduce a heavy second rendering framework unnecessarily.
Use procedural geometry/materials where practical instead of downloading a large 3D model.

## Object construction
The tile should be a square/rectangular terrain slab with:
1. Top surface — terrain
2. Elevation variation — subtle displacement
3. Side walls — visible geological thickness
4. Underside — dark, understated
5. Optional coastline/water region — only if visually balanced

## Geometry approach
Recommended implementation:
- PlaneGeometry with sufficient subdivisions
- procedural height function/noise for elevation displacement
- duplicate/extrude or custom side geometry to create thickness
- keep polygon count moderate
- avoid photorealism; aim for premium stylized scientific realism

Possible terrain zones:
- forest/vegetation patches
- dry/earth zones
- rocky ridges
- a narrow water edge

These should look like coherent geographic layers, not randomly colored patches.

## Visual details
Add very subtle:
- contour/elevation lines
- coordinate grid fragments
- tiny point markers
- edge glow at low intensity

Do NOT cover the terrain with labels.

## Camera
Use a perspective camera at a cinematic three-quarter angle:
- viewer sees top surface and at least two slab edges
- object centered slightly right
- camera framing leaves breathing room
- no aggressive fisheye perspective

## Lighting
Use soft, cinematic lighting:
- one key light from upper-left/front
- soft rim light
- subtle ambient/environment light
- restrained bloom only for analysis accents

Avoid harsh shadows and strong neon.

## Motion
The tile should have:
- very slow idle floating
- tiny rotation/breathing motion
- smooth cursor-based tilt with damping
- motion so subtle it feels premium

## Acceptance criteria
At first glance the object must read as:
'A specific piece of Earth's surface being observed and analyzed.'

It must NOT read as:
- a random cube
- Minecraft terrain
- a game asset
- a floating island fantasy scene
