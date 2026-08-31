# SatQuery AI - Design Document

## 1. Design Goals

- Non-experts must be able to ask a question and understand the answer without GIS training.
- Every result pairs a plain-language answer with map-based visual proof.
- The interface should feel fast, calm, and trustworthy for emergency teams working under pressure.

## 2. Design Principles

- **Clarity first:** Answers are written in plain English, never in GIS jargon.
- **Evidence always visible:** Text answers are always shown next to highlighted map evidence.
- **Guidance over instruction:** Suggested questions steer users instead of leaving them with a blank box.
- **Calm in a crisis:** A light, high-contrast palette that reads well in daylight/field conditions.
- **Progressive disclosure:** Advanced "workflow/model" details are collapsed unless the user wants them.

## 3. Visual Identity

- **Primary color:** Deep blue (`#0F6BFF`) - trust, water, authority.
- **Accent (flood/change highlight):** Warning amber/red used only for highlighted regions on the map.
- **Success / low-confidence states:** Green = confident, amber = caution (low-confidence warning).
- **Type:** Inter (body) with a clear sans-serif system font for headings.
- **Shape:** Rounded corners (8px) on cards, buttons, and inputs.
- **Fonts loaded locally / self-hosted** for offline-field reliability.

## 4. Screens / Views

### 4.1 Upload Screen (Home)
- Drop zone for one image.
- "Compare two dates" toggle that reveals a second drop zone.
- "Optical + SAR pair" toggle.
- Quick sample-image buttons for demo data.
- File validation feedback shown inline (format, size, date, location).

### 4.2 Ask / Select Question
- Large plain-language text input ("Ask a question about this image...").
- Chips with suggested questions:
  - "Describe this image."
  - "Highlight water bodies."
  - "What changed between these two dates?"
  - "Has built-up area increased?"

### 4.3 Analysis / Progress
- Steps shown: Validate → Route → Analyze → Explain.
- Displays the selected model or workflow (collapsed detail by default).
- Spinner / progress bar with a clear "analyzing" state.

### 4.4 Results Screen
- **Text answer** at the top (plain English).
- **Map viewer** with highlighted overlay regions; before/after slider for two-date images.
- **Confidence score** with a low-confidence warning banner when below threshold.
- **Model/workflow summary** in a collapsible section.
- **Download report** button (PDF/PNG).

## 5. Interaction Details

- Suggested-question chips are clickable and fill the text input.
- Two-date view offers a draggable before/after comparison slider.
- Low-confidence results show an amber banner: "Low confidence - verify before acting."
- Overlay highlights are colour-coded per class (water, built-up, vegetation, flood).

## 6. Accessibility & Responsiveness

- Keyboard-navigable throughout; visible focus states.
- Text colours meet WCAG AA contrast on the chosen palette.
- Works on mobile (upload/quick view) and desktop (full analysis).
- Alternative text for all map overlays/legends.