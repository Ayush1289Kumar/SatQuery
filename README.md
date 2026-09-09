# 🛰️ PrithviQ AI — Satellite Image Q&A

Upload a satellite image, ask a question in plain English, and get a clear answer with map-based proof. Built for disaster response, agriculture, forestry and urban-planning teams.

## 🔗 Live

**Live Link:** [https://prithviq-iota.vercel.app/](https://prithviq-iota.vercel.app/)

> Deployed on Vercel.

## ✨ Features

- **Ask in plain English** — no GIS expertise required; just upload an image and type your question.
- **Map-based evidence** — answers are paired with an interactive map (Leaflet) so you can verify claims visually.
- **Immersive 3D visuals** — Three.js-powered real-time terrain featuring a Materialization Hologram shader, LIDAR point-cloud particles, and cinematic fly-bys using `@react-three/drei` CameraControls.
- **Premium UI & Smooth Scrolling** — Dark theme with "Vengeance UI" animated background grids, and buttery-smooth page scrolling physics powered by Lenis.
- **Backend foundation** — FastAPI service with versioned health/readiness endpoints, environment configuration, and CORS for the Vite client. Analysis APIs are being integrated in stages.

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
| Backend | Python FastAPI |
| Planned data layer | PostgreSQL + PostGIS, Redis, S3/MinIO |

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm
- Python 3.11+ for the backend

### Installation

```bash
git clone https://github.com/Ayush1289Kumar/PrithviQ.git
cd PrithviQ
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

### Backend development

Install backend dependencies and start the current API foundation:

```powershell
python -m pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --reload --port 8000
```

Verify `http://localhost:8000/api/v1/health`. The readiness endpoint remains unavailable until database, queue, storage, and worker services are configured.

### Documentation

- [API reference](api.md)
- [API keys and environment variables](api_key.md)
- [Backend integration plan](backend-integration.md)
- [Architecture](docs/architecture.md)
- [Product requirements](docs/prd.md)
- [Design system](docs/design.md)
- [Change log](docs/Chages.md)

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
├── backend/             # FastAPI service and environment configuration
├── api.md               # Versioned endpoint reference
├── api_key.md           # Credential and provider setup guide
├── backend-integration.md # Full backend integration contract
└── package.json
```

## 🤝 Contributing

Feel free to open issues or submit pull requests on the [GitHub repository](https://github.com/Ayush1289Kumar/PrithviQ).

## 📄 License

This project is for hackathon/demo purposes. All rights reserved by the author.

---
Made with 💚 by [Ayush Kumar](https://github.com/Ayush1289Kumar)
