# MapQC-3D

Geospatial quality control tool for 3D visualization and analysis of GeoTIFF data. Built for environmental regulatory workflows (mining permits, watershed analysis, CHIA assessments).

## Tech Stack

- **Runtime**: Browser (web app), Node.js 18+ (CLI — planned)
- **Language**: Strict TypeScript (no implicit any)
- **3D Engine**: Three.js
- **UI Framework**: React (planned for apps/web)
- **Build Tool**: Vite
- **Dev Server**: `localhost:5000` (Vite, bound to 0.0.0.0)

## Monorepo Architecture (Target)

```
mapqc-3d/
├── apps/
│   ├── web/         # Vite + React + Three.js viewport, GeoTIFF ingestion, UI QA review
│   └── cli/         # Node.js batch processing, RunContext orchestration, JSON+PDF reports
├── packages/
│   └── shared/      # Domain models, QA checks, report schema, shared types (zero runtime deps)
├── ai-dev/          # Agent definitions for Copilot/Codex/Claude
└── logs/
```

## Current Project Structure

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
- CLI: Node.js only, structured JSON logging, RunContext lifecycle
- Shared logic (types, QA checks, report schemas) belongs in packages/shared
- No mixing web + Node APIs
- No QA logic in UI components
- No singletons or global event emitters
- All Three.js objects must have disposal paths
- Continue-on-error orchestration in CLI
- Explicit error handling — no silent swallowing

## Implementation Roadmap

### Phase 1 (Current)
- GeoTIFF reader (shared interface)
- Derive extent + pixel size
- Wire QA checks
- Display metadata in UI

### Phase 2
- Render raster plane in map units
- Camera fit-to-extent
- Texture disposal discipline

### Phase 3
- JSON export
- PDF export via pdf-lib
- CLI batch scanning

### Phase 4
- CRS awareness
- Optional reprojection
- Performance profiling

## GIS Domain Context

- **Coordinate Systems**: Kentucky Single Zone EPSG:3089 (primary)
- **Data Sources**: GeoTIFF (via geotiff.js), KyFromAbove LiDAR, USGS NHD
- **Regulatory**: SMIS (Surface Mining Information System), DMPGIS
- **Analysis**: CHIA watershed assessments, permit boundary tracking

## Running

```bash
npm run dev    # Vite dev server on port 5000
npm run build  # TypeScript check + Vite production build
```
