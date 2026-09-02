# 🛰️ SatQuery AI — Satellite Image Q&A

Upload a satellite image, ask a question in plain English, and get a clear answer with map-based proof. Built for disaster response, agriculture, forestry and urban-planning teams.

## 🔗 Live

**Live Link:** [https://vercel.com/ayushkumarpro1289-5851s-projects/sat_query/settings/domains](https://vercel.com/ayushkumarpro1289-5851s-projects/sat_query/settings/domains)

> Deployed on Vercel. (Tip: replace the link above with the actual production domain, e.g. `https://sat-query.vercel.app`, for a friendlier URL.)

## ✨ Features

- **Ask in plain English** — no GIS expertise required; just upload an image and type your question.
- **Map-based evidence** — answers are paired with an interactive map (Leaflet) so you can verify claims visually.
- **Interactive 3D visuals** — Three.js-powered globe/scene elements for an immersive experience.
- **Smooth, calm UI** — dark theme, smooth scrolling with Lenis, and responsive Tailwind CSS layout.

## 🧱 Tech Stack

| Category | Technology |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Maps | Leaflet |
| 3D | Three.js |
| Smooth Scroll | Lenis |
| Fonts | Fontsource variable fonts (Fraunces, Inter, Playfair Display, Plus Jakarta Sans, Public Sans) |
| Hosting | Vercel |

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

```bash
git clone https://github.com/Ayush1289Kumar/SatQuery.git
cd SatQuery
npm install
```

### Development

```bash
npm run dev
```

Runs the app in development mode. Open the URL shown in the terminal (usually `http://localhost:5173`).

### Build

```bash
npm run build
```

Type-checks with `tsc -b` and produces a production build in `dist/`.

### Preview

```bash
npm run preview
```

Serves the production build locally.

## 📁 Project Structure

```
├── index.html          # Entry HTML with meta/SEO tags
├── src/
│   ├── main.tsx        # App bootstrap
│   ├── App.tsx         # Root component
│   ├── types.ts        # Shared TypeScript types
│   ├── components/     # UI components
│   ├── data/           # Static data
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utilities
├── vite.config.ts      # Vite configuration
└── package.json
```

## 🤝 Contributing

Feel free to open issues or submit pull requests on the [GitHub repository](https://github.com/Ayush1289Kumar/SatQuery).

## 📄 License

This project is for hackathon/demo purposes. All rights reserved by the author.

---
Made with 💚 by [Ayush Kumar](https://github.com/Ayush1289Kumar)
