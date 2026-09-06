# GEO-NIUS Frontend Technology Stack

> Audit of the actual frontend implementation (project: `satquery-ai-frontend`, version 0.1.0).
> Every technology listed below was verified against the source code — no assumptions or defaults.
> Status legend: **Actively Used** / **Installed but Unused** / **Development Tool**.

## 1. Project Overview

GEO-NIUS is a single-page React application that simulates a satellite-imagery analysis platform. Users pick a category, upload (or select demo) imagery, ask a question, watch a staged "analysis", and view results on an interactive map. There is no backend — all analysis results are mock data driven by timed state transitions. Navigation is state-driven (no router), styling is Tailwind v4 plus one global CSS file with a `data-theme` token system, and the brand logo is a real-time Three.js scene rendered via React Three Fiber.

## 2. Technology Stack Summary

| Category | Technology | Version | Status | Purpose |
|----------|------------|---------|--------|---------|
| UI Framework | React | ^19.1.0 | Actively Used | Component model, hooks, rendering |
| Language | TypeScript | ~5.8.3 (strict) | Actively Used | All app code is `.ts`/`.tsx` |
| Build Tool | Vite | ^6.3.5 | Actively Used | Dev server + production bundling |
| Build Plugin | @vitejs/plugin-react | ^4.4.1 | Actively Used | React Fast Refresh / JSX transform |
| Styling | Tailwind CSS | ^4.1.4 | Actively Used | Utility classes, `@theme` tokens |
| Tailwind Integration | @tailwindcss/vite | ^4.1.4 | Actively Used | Tailwind v4 Vite plugin (no `tailwind.config.js`) |
| Global CSS | Hand-written CSS (`src/index.css`) | — | Actively Used | Theme tokens, glass components, keyframes |
| 3D | three | ^0.185.1 | Actively Used | 3D brand logo scene |
| 3D React Binding | @react-three/fiber | ^9.7.0 | Actively Used | `<Canvas>` + `useFrame` in `Logo.tsx` |
| Mapping | Leaflet | ^1.9.4 | Actively Used | Landing map, region map, results map |
| Smooth Scroll | Lenis | ^1.3.26 | Actively Used | Inertia scrolling in `main.tsx` |
| Icons | lucide-react | ^1.41.0 | Actively Used | All UI icons |
| Fonts | @fontsource-variable (inter, playfair-display, fraunces) | ^5.3.0 | Actively Used | Self-hosted variable fonts |
| Fonts | @fontsource-variable (plus-jakarta-sans, public-sans) | ^5.3.0 | Installed but Unused | Never imported in CSS/TS |
| Maps (SVG) | react-simple-maps (+ @types) | ^3.0.0 | Installed but Unused | No import found anywhere in `src/` |
| Runtime | prop-types | ^15.8.1 | Installed but Unused | Legacy PeerDeps artifact; never imported |
| Package Manager | npm | — | Actively Used | `package-lock.json`, `.npmrc` (`legacy-peer-deps=true`) |
| Type Checking | tsc (project references) | ~5.8.3 | Actively Used | `npm run build` runs `tsc -b` before Vite |
| Router | — | — | Not used | Custom `Step` state machine in `App.tsx` |
| State Mgmt | React `useState`/`useRef` | — | Actively Used | Local state only; no Redux/Zustand/Context |
| Data Fetching | Native `fetch` | — | Actively Used | One call: Nominatim geocoding (`RegionMap.tsx`) |

## 3. Core Framework & Build System

- **React 19** (`react`, `react-dom` ^19.1.0) rendered through `createRoot` in `src/main.tsx` inside `<StrictMode>`.
- **Vite 6** (`vite.config.ts`) with `@vitejs/plugin-react` and `@tailwindcss/vite`; dev server on `:5173` with `host: true`.
- Build command: `tsc -b && vite build` — TypeScript project references (`tsconfig.app.json`, `tsconfig.node.json`) with `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`. Output goes to `dist/` (statically deployable, e.g. Vercel).

## 4. Programming Languages

- **TypeScript (TSX/TS)** — 100% of application code. JSX is typed via `react-jsx`; shared types are centralized in `src/types.ts`.
- **CSS** — single global stylesheet (`src/index.css`) including embedded SVG data-URIs.
- **No JavaScript-only source files** in `src/` (root-level `.cjs` helper scripts are one-off tooling, not app code).


## 5. Styling & Design System

Primary: **Tailwind CSS v4** using the CSS-first configuration (`@import "tailwindcss"` + `@theme` block in `src/index.css`) — there is **no** `tailwind.config.js`.

Secondary (significant): hand-written CSS in the same file providing:
- **Theme token system** — `@theme` colors/fonts/radii plus per-category palettes switched by `data-theme` attributes (`moss-forestry`, `aqua-teal`, `jungle-night`, …) defined in `App.tsx` (`CATEGORY_THEME`).
- **Reusable glass classes** — `.glass-card`, `.glass-card-elevated`, `.glass-btn`.
- **Decorative background system** — layered SVG data-URI environment on `.app-shell` (topographic contours, graticule/orbit artwork, foliage).
- **Specialized aquatic analysis themes** — tokenized `--wa-*` palette with `azure` (flood) and `teal` (water mapping) variants for the analyzing/results flows.
- **Keyframe animations** — entrance reveals, logo float/spin, water caustics, etc.

Tertiary: inline `style` objects where dynamic values are needed (e.g. progress width, WebGL materials).

## 6. UI Component Libraries

**None.** No component library (MUI, shadcn, Ant, Radix, etc.) is installed or used. All UI primitives are hand-built:
- `src/components/ui.tsx` — `Button`, `Card`, `Badge`, `StepBadge`.
- Feature components: `LandingMap`, `Logo`, `UploadScreen`, `AskScreen`, `AnalyzingScreen`, `ResultsScreen`, `MapView`, `RegionMap`, `StateCityPanel`, `CategoryPanel`, `CategoryPage`, `AIQuerySuggestions`, `AmbientCanvas`, `Reveal`.

## 7. Animation Technologies

- **No animation library** (no Framer Motion, no GSAP).
- **CSS keyframes** (in `src/index.css`): scroll-reveal (`reveal`/`reveal-stagger` via `Reveal.tsx` + `IntersectionObserver`), logo motion, water environment drift/caustics, brand wordmark reveal (`geoCharIn`, `geoHyphenPulse`), progress shimmer.
- **Three.js `useFrame` loops** (in `Logo.tsx`): entrance choreography, idle breathing, hover glow, pointer parallax — all gated by `prefers-reduced-motion`.
- **Lenis** smooth-scroll rAF loop in `main.tsx` (disabled under reduced motion).
- **2D Canvas** (`AmbientCanvas.tsx`): drifting aurora blobs, frozen under reduced motion.
- A shared `usePrefersReducedMotion` hook (`src/hooks/`) plus CSS `@media (prefers-reduced-motion: reduce)` blocks enforce accessibility globally.

## 8. 3D & Graphics Technologies

| Technology | Where | Purpose |
|---|---|---|
| **three** + **@react-three/fiber** | `src/components/Logo.tsx` | Real-time 3D GEO-NIUS brand mark: golden graticule globe, navy bulb base, protective/base leaf meshes, sparkles, warm emissive lighting. Orthographic camera, canvas-size-derived zoom. |
| **HTML Canvas 2D** | `src/components/AmbientCanvas.tsx` | Decorative ambient background blobs on the upload/home screen. |
| **Inline/data-URI SVG** | `index.css`, `index.html` | Decorative topographic/bathymetric/foliage background layers, favicon, brand grain textures. |
| **Leaflet (raster tiles)** | `LandingMap`, `RegionMap`, `MapView` | Satellite imagery display (Esri World Imagery), dark basemap (CartoDB), polygon highlight overlays. No vector-3D mapping library. |

**Not used:** Drei, post-processing libraries, custom WebGL shaders, react-three/xr.

## 9. Icons & Typography

- **Icons:** `lucide-react` exclusively (Satellite, Waves, Droplets, UploadCloud, BarChart3, ArrowRight, etc.), plus a few hand-inlined SVGs (favicon, background textures).
- **Typography:** self-hosted variable fonts via Fontsource, imported at the top of `src/index.css`:
  - `@fontsource-variable/inter` — body / sans (`--font-sans`)
  - `@fontsource-variable/playfair-display` and `@fontsource-variable/fraunces` — display faces (`--font-display`)
  - No Google Fonts / external font CDN requests.

## 10. Routing & Navigation

**No routing library.** Navigation is a typed state machine in `src/App.tsx`:

```ts
type Step = 'landing' | 'upload' | 'ask' | 'analyzing' | 'results'
```

`setStep()` conditionally renders screens; category switching (`home | agriculture | disaster | urban | forest | water | infrastructure`) toggles `data-theme` and dashboard content. Consequence: no URL deep-linking.

## 11. State Management

- **React local state only** — `useState`/`useRef` lifted into `App.tsx` (`step`, `theme`, `activeCategory`, `mode`, `images`, `question`, `result`, `activeStep`, water-analysis flags).
- **No** Redux, Zustand, Jotai, Recoil, React Context, or React Query.
- The simulated "analysis pipeline" is driven by `setTimeout` chains (`startAnalysis`, ~0.8/1.7/2.6/3.4 s) mutating `activeStep`.

## 12. API & Data Fetching

- **Single real network call:** native `fetch` to the **Nominatim (OpenStreetMap)** geocoder in `RegionMap.tsx` (with in-session boundary caching + abort signals).
- **Map tiles:** Esri World Imagery and CartoDB raster tiles loaded by Leaflet at runtime.
- **Everything else is mock data:** `src/data/mock.ts` (demo scenarios, analysis results, highlight rings) and `src/data/indiaMockData.ts` (states/cities). No axios, no API client layer, no env-based endpoints.

## 13. Development Tools & Code Quality

- **TypeScript compiler** (`tsc -b`, project references) — acts as the type/lint gate in the build; no ESLint/Prettier config is present in the repo.
- **Vite** — dev server, HMR, production build with LightningCSS-based CSS minification (noteworthy: it prunes `@keyframes` not referenced from CSS, which shaped how animation classes are authored).
- **npm** with `.npmrc` (`legacy-peer-deps=true`).

## 14. Frontend Project Architecture

```
GEO-NIUS/
├── index.html                  # HTML entry: SEO/OG meta, inline SVG favicon
├── vite.config.ts              # Vite + React + Tailwind plugins
├── tsconfig*.json              # Strict TS project references
├── package.json / .npmrc
├── FRONTEND_TECH_STACK.md      # this document
├── docs/                       # product/design/architecture notes
└── src/
    ├── main.tsx                # bootstrap: Lenis + createRoot
    ├── App.tsx                 # root: step state machine, header/footer, hero, category theming
    ├── index.css               # Tailwind v4 + @theme tokens + all custom CSS/keyframes
    ├── types.ts                # shared domain types (UploadMode, AnalysisResult, MapLayer…)
    ├── components/
    │   ├── Logo.tsx            # 3D brand mark (three + @react-three/fiber)
    │   ├── LandingMap.tsx      # full-screen Leaflet landing
    │   ├── UploadScreen.tsx    # mode picker, dropzone, demo scenario cards
    │   ├── AskScreen.tsx       # question entry
    │   ├── AnalyzingScreen.tsx # staged loader (azure/teal aquatic variants)
    │   ├── ResultsScreen.tsx   # result dashboard (azure/teal variants)
    │   ├── MapView.tsx         # Leaflet results map with highlight polygons
    │   ├── RegionMap.tsx       # Leaflet + Nominatim region explorer
    │   ├── StateCityPanel.tsx / CategoryPanel.tsx / CategoryPage.tsx
    │   ├── AIQuerySuggestions.tsx
    │   ├── AmbientCanvas.tsx   # 2D canvas ambience
    │   ├── Reveal.tsx          # IntersectionObserver scroll reveal
    │   └── ui.tsx              # Button / Card / Badge / StepBadge primitives
    ├── data/
    │   ├── mock.ts             # demo scenarios + analysis results
    │   └── indiaMockData.ts    # states/cities dataset
    ├── hooks/
    │   └── usePrefersReducedMotion.ts
    └── lib/
        └── report.ts           # client-side text report download
```

## 15. Key Dependencies

| Dependency | Why it matters |
|---|---|
| `react` / `react-dom` ^19.1 | Entire UI |
| `three` + `@react-three/fiber` | Real-time 3D GEO-NIUS logo (only 3D scene in the app) |
| `leaflet` (+ `@types/leaflet`) | All three map surfaces; raw JS API, no react-leaflet wrapper |
| `lenis` | Inertia smooth scrolling |
| `lucide-react` | Icon system |
| `@fontsource-variable/*` | Self-hosted variable fonts |
| `tailwindcss` + `@tailwindcss/vite` | Styling engine (v4 CSS-first config) |
| `vite` + `@vitejs/plugin-react` | Build/dev toolchain |
| `typescript` | Strict type checking integrated into the build |

## 16. Installed but Unused Dependencies

| Dependency | Evidence |
|---|---|
| `react-simple-maps` ^3.0.0 + `@types/react-simple-maps` | No import of `react-simple-maps` exists anywhere in `src/` (mapping is done with Leaflet). |
| `@fontsource-variable/plus-jakarta-sans`, `@fontsource-variable/public-sans` | Not imported in `src/index.css` (only inter, playfair-display, fraunces are). |
| `prop-types` | Never imported; present only as a legacy peer-dependency artifact. |

## 17. Technical Architecture Summary

GEO-NIUS is a **Vite-built React 19 + TypeScript SPA** with **no router and no state library**: `App.tsx` is a single state machine that moves between five screens and swaps category themes via `data-theme` attributes consumed by a **Tailwind v4 CSS-first token system** layered with hand-written glass/background CSS. Interactive geography is handled by **Leaflet** (raster satellite tiles + polygon overlays, one Nominatim `fetch` for geocoding), while the brand identity is a **Three.js scene bound through React Three Fiber**. Motion is exclusively **CSS keyframes, IntersectionObserver reveals, 2D canvas, and `useFrame` loops**, all coordinated through a single `prefers-reduced-motion` convention. All "analysis" intelligence is simulated locally from `src/data/mock.ts` with timed step transitions — there is no backend, authentication, or client-state persistence.
