# PRD 05 — Interaction and Motion

## Goal
Make the hero feel alive and interactive without becoming distracting.

## Cursor interaction
On desktop:
- map normalized pointer position to a small target rotation
- interpolate using damping/lerp
- maximum tilt should be subtle (roughly a few degrees)
- terrain should feel weighted, not directly attached to the cursor

On touch devices:
- disable aggressive pointer-follow behavior
- preserve gentle autonomous motion

## Idle animation
Use layered subtle movement:
- terrain: slow float
- scan: periodic
- markers: slightly different phase offsets
- ambient particles: optional and extremely sparse

Avoid all elements moving with identical sine waves.

## Entrance sequence
On first hero load:
1. Background appears.
2. Hero text is already readable or fades in quickly.
3. Terrain rises/fades into place.
4. Terrain details resolve.
5. First scan begins after a short pause.
6. Data callouts activate progressively.

Do not delay the page's usability for the animation.

## Scroll behavior
Optional only if it does not disrupt the existing site:
- as user begins scrolling past hero, terrain can subtly scale down/fade
- do not implement scroll-jacking
- do not change existing downstream section behavior

## Accessibility
- respect prefers-reduced-motion
- provide a static but attractive fallback
- ensure CTA remains accessible above canvas layers

## Acceptance criteria
Interaction should feel like a premium scientific instrument: responsive, calm, precise.
