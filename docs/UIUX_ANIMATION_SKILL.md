---
name: ui-ux-animation-toolkit
description: >
  A comprehensive, curated reference for AI coding agents covering modern UI/UX component
  libraries, animation engines, DESIGN.md specifications, WebGL canvas shaders, smooth scroll,
  design quality & taste enforcement, editorial diagramming, browser automation, and 3D web interfaces.
  Covers React, TypeScript, Tailwind CSS, Vue, and vanilla WebGL/Canvas ecosystems.
version: 3.0.0
last-updated: 2026-08-28
compatible-with: [Cursor, Windsurf, GitHub Copilot, Cline, Aider, Antigravity, Claude Code, any MCP-compatible agent]
tags: [ui, ux, animation, scroll, components, design-systems, design-md, webgl, threejs, canvas, taste, playwright, agentic, frontend]
---

# UI/UX, Animation & Modern Design Systems — Agent Skill Reference

## When to activate this skill

Activate this skill document whenever you are:
- Designing or coding a **frontend UI** — landing page, SaaS application, dashboard, creative portfolio, or documentation site
- Integrating **DESIGN.md specifications** to give coding agents a persistent, structured design system
- Adding **animations, micro-interactions, canvas WebGL shaders, or physics-based smooth scroll**
- Enforcing **design quality and aesthetic taste** to prevent generic, AI-generated appearance
- Embedding **editorial diagrams and SVG visual explanations** without Mermaid slop
- Building **3D interactive experiences** with Three.js, React Three Fiber, or procedural img2threejs workflows
- Running **browser visual regression and automated verification** (Playwright MCP)

---

## Agent Instructions (Universal Design Standards)

When generating frontend UI, adhere to these non-negotiable principles:

1. **Avoid generic, low-contrast palettes.** Steer clear of predictable blue/gray/white templates. Curate harmonious, tailored color palettes (HSL-based, high-contrast dark modes, glassmorphic depth).
2. **Typography with distinct character.** Pair display headers and body typography with purpose (e.g. Mona Sans, Outfit, Inter, Plus Jakarta Sans, JetBrains Mono).
3. **Structured Design Systems via `DESIGN.md`.** Always look for or create a persistent `DESIGN.md` in the project root to constrain token usage, spacing rhythm, and component states.
4. **Motion must earn its place.** Animations should provide meaningful feedback, structural hierarchy, or subtle delight — avoid gratuitous, disorienting effects.
5. **Generative Canvas & WebGL enhancements.** Use shaders and HTML-over-Canvas overlays (`canvas-ui`) for high-impact visual moments.
6. **Diagrams without slop.** Use clean, editorial SVG/HTML diagrams (`diagram-design`) instead of raw generic flowcharts.
7. **Semantic, accessible foundations.** Maintain strict semantic markup, full keyboard navigation, and wrap all motion in `@media (prefers-reduced-motion: reduce)`.

---

## 1. Design System Specifications & Agent Guidelines

### Google DESIGN.md Specification — `google-labs-code/design.md`
**Repo:** https://github.com/google-labs-code/design.md  
**What it is:** The open format specification for describing visual identities directly to coding agents. It provides agents with persistent, structured design tokens (colors, typography, elevation, spacing) to eliminate visual drift.

**When to use:**
- At the start of any new frontend project to define design tokens
- When collaborating with AI agents on multi-screen user interfaces
- To guarantee consistent component styling across long coding sessions

**Key Elements in a `DESIGN.md`:**
```markdown
# Design System Specification
## Color Palette
- Primary: hsl(222, 47%, 11%)
- Accent: hsl(262, 83%, 58%)
- Surface: hsl(220, 14%, 96%)
- Text: hsl(222, 47%, 11%)

## Typography
- Display: 'Mona Sans', -apple-system, sans-serif
- Body: 'Inter', sans-serif
- Code: 'JetBrains Mono', monospace

## Layout & Rhythm
- Spacing Unit: 4px base (4, 8, 12, 16, 24, 32, 48, 64)
- Container Max Width: 1280px
- Border Radius: 0.5rem (components), 1rem (cards)
```

---

### Awesome DESIGN.md Systems — `VoltAgent/awesome-design-md`
**Repo:** https://github.com/VoltAgent/awesome-design-md  
**What it is:** Curated collection of battle-tested `DESIGN.md` token sets extracted from leading brand design systems (Linear, Stripe, Vercel, Apple, GitHub). Drop one into any repository to instantly give coding agents top-tier design constraints.

---

### Taste-Skill & Impeccable Design Standards
- **`Leonxlnx/taste-skill`**: Prevents AI agents from producing generic, uninspired corporate designs. Injects typography pairing and bold aesthetic decisions.
- **`pbakaus/impeccable`**: Systematic design language specification for AI harness workflows (spacing grids, optical contrast, breathing room).
- **`alchaincyf/huashu-design`**: HTML-native design skill featuring a 5-dimension review system (Layout, Typography, Color, Motion, Content).

---

## 2. Component Libraries & Ecosystems

### Shadcn UI & Ecosystem — `shadcn-ui/ui` & `birobirobiro/awesome-shadcn-ui`
**Stack:** React · TypeScript · Tailwind CSS · Radix UI primitives  
**Repos:** https://github.com/shadcn-ui/ui | https://github.com/birobirobiro/awesome-shadcn-ui  
**What it is:** The gold standard in accessible, copy-paste React component architectures.
- **`satnaing/shadcn-admin`**: Production-ready Admin Dashboard built with Shadcn and Vite. Includes charts, data tables, dark mode, auth views, and layout switchers.

### animate-ui — `imskyleen/animate-ui`
**Stack:** React · TypeScript · Tailwind CSS · Motion · Shadcn CLI  
**Repo:** https://github.com/imskyleen/animate-ui  
**What it is:** Motion-first component distribution installed via the Shadcn CLI.
```bash
npx shadcn@latest add https://animate-ui.com/r/[component-name]
```
- Includes animated buttons, tabs, accordions, popovers, and scroll reveals.

### VengeanceUI — `Ashutoshx7/VengeanceUI`
**Stack:** React · TypeScript · Tailwind CSS  
**Repo:** https://github.com/Ashutoshx7/VengeanceUI  
**What it is:** Copy-paste landing page components with dramatic animated heros, glowing borders, card grids, and ambient backgrounds.

### Inspira UI — `unovue/inspira-ui`
**Stack:** Vue 3 · Nuxt · TypeScript · Tailwind CSS  
**Repo:** https://github.com/unovue/inspira-ui  
**What it is:** Animated, aesthetic components for Vue and Nuxt applications. Serves as a great cross-framework design inspiration reference.

---

## 3. Creative Canvas, WebGL & CSS Animation Frameworks

### Canvas UI — `DavidHDev/canvas-ui`
**Stack:** TypeScript · HTML5 · WebGL / Canvas  
**Repo:** https://github.com/DavidHDev/canvas-ui  
**What it is:** A creative component library where real interactive HTML elements render with WebGL effects and custom shaders running seamlessly over them.

**When to use:**
- High-end creative agency portfolios, landing pages, interactive product showcases
- Adding liquid distortion, particle effects, or interactive shader backdrops behind standard HTML forms and text

---

### EaseMotion-css — `SAPTARSHI-coder/EaseMotion-css`
**Stack:** Pure CSS · Zero Dependency  
**Repo:** https://github.com/SAPTARSHI-coder/EaseMotion-css  
**What it is:** An animation-first CSS framework with reusable classes, modern easing curves, hover reactions, and zero JavaScript overhead.

---

### Lenis Smooth Scroll — `darkroomengineering/lenis`
**Stack:** Vanilla JS · Framework-Agnostic  
**Repo:** https://github.com/darkroomengineering/lenis  
**What it is:** The premier physics-based, inertia-driven smooth scroll engine.

```typescript
import Lenis from 'lenis'

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
})

function raf(time: number) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}
requestAnimationFrame(raf)
```

---

## 4. Editorial Diagramming & Visual Explanations

### Diagram Design — `cathrynlavery/diagram-design`
**Repo:** https://github.com/cathrynlavery/diagram-design  
**What it is:** 38 editorial diagram archetypes built with self-contained HTML + SVG. Designed specifically to eliminate generic, ugly flowchart slop in documentation and UI.

**Categories Available:**
1. **Flow & Process**: Step sequences, linear progressions, decision branches
2. **Hierarchy & Structure**: Tree maps, nested architecture blocks, pyramid tiers
3. **Comparison & Matrix**: Quadrant matrix, before/after diff panels, feature tables
4. **Systems & Dataflow**: Event buses, microservice networks, pipeline streams

---

## 5. 3D Web & Three.js Interfaces

| Repository | Tech Stack | Highlight Feature |
| :--- | :--- | :--- |
| **`img2threejs/img2threejs`** | Python / Three.js | Procedural 2D-to-3D code reconstruction |
| **`akashrmalhotra/3d-portfolio`** | TypeScript + Three.js | Production-ready interactive 3D developer portfolio |
| **`adrianhajdin/3D_portfolio`** | React + React Three Fiber (R3F) | Floating 3D island, interactive animated fox, typed inputs |
| **`adrianhajdin/project_3D_developer_portfolio`** | Three.js (Vanilla) | Advanced 3D lighting, physics, and model loading |

---

## 6. Visual Testing & Automated Quality Verification

### Playwright MCP — `microsoft/playwright-mcp`
**Stack:** TypeScript · MCP  
**Repo:** https://github.com/microsoft/playwright-mcp  
- Allows agents to take automated full-page screenshots, assert responsive layouts, test interaction states, and verify animation completion.

### Front-End Checklist — `thedaviddias/Front-End-Checklist`
**Repo:** https://github.com/thedaviddias/Front-End-Checklist  
- Exhaustive pre-launch verification across HTML semantics, CSS efficiency, Web Vitals performance (LCP < 2.5s, CLS < 0.1), Accessibility (WCAG 2.1 AA), and Security headers.

---

## 🚀 Recommended Stack Recipes

### Modern SaaS App / Dashboard
```
Design System:   DESIGN.md (Google Spec or VoltAgent token set)
Components:      shadcn-ui + satnaing/shadcn-admin
Micro-motion:    animate-ui + EaseMotion-css
Scroll:          lenis
Verification:    playwright-mcp + Front-End Checklist
```

### High-Impact Creative Landing Page
```
Design Quality:  taste-skill + pbakaus/impeccable
Visual FX:       DavidHDev/canvas-ui (WebGL) + VengeanceUI heros
Diagrams:        cathrynlavery/diagram-design (SVG editorial)
Smooth Scroll:   lenis
```

### 3D Interactive Portfolio
```
3D Core:         Three.js / React Three Fiber (adrianhajdin + akashrmalhotra)
Sync:            Lenis on('scroll') to 3D camera position
UI Overlay:      animate-ui + Tailwind CSS
```
