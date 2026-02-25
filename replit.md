# MapQC-3D

Geospatial quality control tool for 3D visualization and analysis of GeoTIFF data. Built for environmental regulatory workflows (mining permits, watershed analysis, CHIA assessments).

## Tech Stack

- **Runtime**: Browser (web app), Node.js 18+ (CLI — planned)
- **Language**: Strict TypeScript (no implicit any)
- **3D Engine**: Three.js
- **Build Tool**: Vite
- **Dev Server**: `localhost:5000` (Vite, bound to 0.0.0.0)

## Project Structure

```
/
├── index.html              # Entry HTML
├── vite.config.ts          # Vite config (port 5000, allowedHosts)
├── tsconfig.json           # Strict TS config
├── package.json            # Dependencies
├── src/
│   ├── main.ts             # App entry — creates ThreeApp, adds modules
│   ├── ThreeApp.ts         # Core Three.js lifecycle (renderer, scene, camera, loop)
│   └── modules/
│       ├── GridModule.ts   # Reference grid + axes helper
│       └── LightingModule.ts # Ambient + directional lights
└── .local/
    └── skills/
        └── gis-professional/  # GIS domain skill (ArcPy, CHIA, FGDC, etc.)
```

## Architecture

### ThreeApp (src/ThreeApp.ts)
- Single renderer instance, created once
- SceneModule interface: `init()`, `update(delta)`, `dispose()`
- All geometries/materials/textures must be disposed in `dispose()`
- Pixel ratio capped at 2
- No per-frame allocations

### Design Rules (from Copilot Instructions)
- No global mutable state
- QA functions must be pure with deterministic outputs
- Web app: browser-only — no fs/path/process
- Future CLI: Node.js only, structured JSON logging
- Shared logic (types, QA checks, report schemas) belongs in a shared package
- No mixing web + Node APIs
- No QA logic in UI components
- No singletons or global event emitters
- All Three.js objects must have disposal paths

## GIS Domain Context

- **Coordinate Systems**: Kentucky Single Zone EPSG:3089 (primary)
- **Data Sources**: GeoTIFF (via geotiff.js — planned), KyFromAbove LiDAR, USGS NHD
- **Regulatory**: SMIS (Surface Mining Information System), DMPGIS
- **Analysis**: CHIA watershed assessments, permit boundary tracking

## Running

```bash
npm run dev    # Vite dev server on port 5000
npm run build  # TypeScript check + Vite production build
```
