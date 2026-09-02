# SatQuery AI — Design System Specification

> Persistent design tokens for AI coding agents and developers. These tokens are wired into
> `frontend/src/index.css` (Tailwind v4 `@theme`). Keep this file and the CSS in sync.

## Mission

Satellite-image analysis must feel **calm, fast, and trustworthy** for non-expert
decision-makers working under pressure — never like a generic corporate dashboard.

- **Clarity first** — plain English answers, never GIS jargon.
- **Evidence always visible** — text paired next to highlighted map proof.
- **Calm in a crisis** — light, high-contrast UI that reads well in daylight / field conditions.
- **Motion earns its place** — animate for meaningful feedback, structure, or subtle delight.

## Color Palette (HSL-first, warm "Terra" undertones)

| Token | Value | Usage |
| :--- | :--- | :--- |
| `primary` | `#166534` | Forest green — growth, land, authority — actions, links, active states |
| `primary-dark` | `#14532d` | Primary hover / pressed |
| `primary-50` | `#eaf4ec` | Soft primary surfaces, chips, active backgrounds |
| `ink-900` | `#1c1917` | Headings / strong text |
| `ink-800` | `#292524` | Elevated text / summary headings |
| `ink-700` | `#44403c` | Body text |
| `ink-600` | `#57534e` | Legend / secondary text |
| `ink-500` | `#78716c` | Muted text |
| `surface` | `#faf7f2` | App background (warm paper, high contrast) |
| `surface-50` | `#ffffff` | Card surface |
| `edge` | `#e9e2d9` | Borders / dividers (warm sand-tinted, not cold gray) |
| `success` | `#15803d` | Confident / verified states |
| `warning` | `#c2410c` | Low-confidence caution, flood highlight (terracotta) |
| `danger` | `#991b1b` | Errors, destructive actions, built-up highlight |
| `water` | `#0e7490` | Water highlight on map (teal) |
| `vegetation` | `#15803d` | Vegetation highlight on map |
| `land` | `#78350f` | Land-change highlight on map |

**Rule:** never use pure `#000`/`#fff` next to color; always the ink/surface tokens above to keep
a harmonious, high-contrast, warm-undertone "field report" feel.

## Typography

- **Display / headings:** `'Fraunces Variable'`, Georgia, ui-serif, serif — editorial, warm, field-report character.
- **Body / UI:** `'Public Sans Variable'`, system-ui, sans-serif — neutral, civic, highly readable.
- **Code / model names:** ui-monospace stack (system mono).

Fonts are **self-hosted** via `@fontsource-variable` (offline-field reliability), never a CDN.

## Layout & Rhythm

- Spacing unit: **4px** base → `4, 8, 12, 16, 24, 32, 48, 64`.
- Page container: `max-w-6xl` (72rem), padded in `.px-4`.
- Result grid: map `1.6fr` + answer panel `1fr`.
- Border radius: `0.75rem` (12px) cards, `0.5rem` (8px) controls/buttons.
- Elevation: subtle `ring-1 ring-edge` + `shadow-sm`; depth never via heavy drop shadows.

## Motion & Interaction

- Smooth scroll via **Lenis**; disabled under `prefers-reduced-motion: reduce`.
- Scroll-triggered reveals: fade-up ≤ 24px, staggered ≤ 120ms; disabled under reduced motion.
- Hover: only color/border/`translate-y` tweaks (`ease-out`, ~150ms); no jarring transforms.
- Ambient canvas backdrop (animated aurora): paused under reduced motion; non-interactive, decorative.
- All motion wrapped in `@media (prefers-reduced-motion: reduce)` overrides.

## Accessibility Baseline

- Semantic landmarks (`header`, `main`, `footer`) + a visible **Skip to content** link.
- Keyboard-navigable throughout; visible `:focus-visible` rings with 3px offset.
- Text meets WCAG AA contrast on the chosen palette.
- Progress/screen-transition feedback exposed via `aria-live`.