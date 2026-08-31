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

## Color Palette (HSL-first, blue-undertone neutrals)

| Token | Value | Usage |
| :--- | :--- | :--- |
| `primary` | `#0f6bff` | Trust, water, authority — actions, links, active states |
| `primary-dark` | `#0b56d0` | Primary hover / pressed |
| `primary-50` | `#eef4ff` | Soft primary surfaces, chips, active backgrounds |
| `ink-900` | `#0b1220` | Headings / strong text |
| `ink-800` | `#1e293b` | Elevated text / summary headings |
| `ink-700` | `#334155` | Body text |
| `ink-600` | `#475569` | Legend / secondary text |
| `ink-500` | `#64748b` | Muted text |
| `surface` | `#f6f8fb` | App background (cool, high contrast) |
| `surface-50` | `#ffffff` | Card surface |
| `edge` | `#e5eaf1` | Borders / dividers (blue-tinted, not cold gray) |
| `success` | `#16a34a` | Confident / verified states |
| `warning` | `#f59e0b` | Low-confidence caution, flood highlight |
| `danger` | `#dc2626` | Errors, destructive actions, built-up highlight |
| `water` | `#2563eb` | Water highlight on map |
| `vegetation` | `#16a34a` | Vegetation highlight on map |
| `land` | `#78350f` | Land-change highlight on map |

**Rule:** never use pure `#000`/`#fff` next to color; always the ink/surface tokens above to keep
a harmonious, high-contrast, blue-undertone feel.

## Typography

- **Display / headings:** `'Space Grotesk Variable'`, system-ui, sans-serif — geometric, modern, authoritative.
- **Body / UI:** `'Inter Variable'`, system-ui, sans-serif — neutral & readable.
- **Code / model names:** `'JetBrains Mono'`, ui-monospace, monospace.

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