# SatQuery AI — Design System Specification

> Persistent design tokens for AI coding agents and developers. These tokens are wired into
> `frontend/src/index.css` (Tailwind v4 `@theme`). Keep this file and the CSS in sync.

## Mission

Satellite-image analysis must feel **calm, fast, and trustworthy** for non-expert
decision-makers working under pressure — never like a generic corporate dashboard.

- **Clarity first** — plain English answers, never GIS jargon.
- **Evidence always visible** — text paired next to highlighted map proof.
- **Calm in a crisis** — high-contrast Obsidian dark mode with glassmorphism to reduce eye strain.
- **Motion earns its place** — animate for meaningful feedback, structure, or subtle delight (e.g. Three.js Globe).

## Color Palette (Obsidian Dark Theme, Electric accents)

| Token | Value | Usage |
| :--- | :--- | :--- |
| `primary` | `#3b82f6` | Electric Blue — actions, active states, globe highlights |
| `secondary` | `#8b5cf6` | Deep Violet — gradients, pulsing indicators, secondary actions |
| `cyan` | `#22d3ee` | Cyan — latency indicators, high-tech accents |
| `ink-900` | `#ffffff` | Headings / strong text |
| `ink-800` | `rgba(255,255,255,0.85)` | Elevated text / summary headings |
| `ink-700` | `rgba(255,255,255,0.7)` | Body text |
| `ink-600` | `rgba(255,255,255,0.55)` | Legend / secondary text |
| `ink-500` | `rgba(255,255,255,0.45)` | Muted text |
| `surface` | `#000000` | App background (deep black for max contrast) |
| `surface-card` | `rgba(255,255,255,0.02)` | Glassmorphism card background |
| `edge` | `rgba(255,255,255,0.08)` | Borders / dividers |
| `success` | `#10b981` | Confident / verified states (Emerald) |

**Rule:** Use glassmorphism (`backdrop-blur`) and semi-transparent white/black overlays to create depth, avoiding solid gray surfaces.

## Typography

- **Display / headings:** `'Fraunces Variable'`, Georgia, ui-serif, serif — editorial, elegant character.
- **Body / UI:** `'Plus Jakarta Sans Variable'`, system-ui, sans-serif — modern, geometric, highly readable.
- **Code / model names:** ui-monospace stack (system mono).

## Layout & Rhythm

- Spacing unit: **4px** base → `4, 8, 12, 16, 24, 32, 48, 64`.
- Page container: `max-w-6xl` (72rem), padded in `.px-4`.
- Hero Layout: Side-by-side on desktop (Grid `1fr_1.3fr`), stacked on mobile.
- Border radius: `1rem` (16px) cards, `0.75rem` (12px) inner elements.
- Elevation: `shadow-[0_0_20px_-4px_rgba(59,130,246,0.2)]` for active/glowing elements.

## Motion & Interaction

- **Three.js Globe:** A responsive, interactive 3D globe visualization in the hero section displaying real-time metrics (Resolution, Processing, Models, Coverage, Confidence).
- Smooth scroll via **Lenis**; disabled under `prefers-reduced-motion: reduce`.
- Hover: glowing borders, glass card highlight (`bg-[rgba(255,255,255,0.04)]`), and subtle scaling.
- Ambient canvas backdrop (animated aurora/globe): non-interactive, decorative.
- All motion wrapped in `@media (prefers-reduced-motion: reduce)` overrides.

## Accessibility Baseline

- Semantic landmarks (`header`, `main`, `footer`).
- Keyboard-navigable throughout; visible `:focus-visible` rings.
- High contrast text against dark backgrounds.
- Progress/screen-transition feedback exposed via `aria-live`.