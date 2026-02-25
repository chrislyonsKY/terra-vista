# MapQC-3D

Geospatial quality control tool for 3D visualization and analysis of GeoTIFF data. Built for environmental regulatory workflows (mining permits, watershed analysis, CHIA assessments).

## Tech Stack

- **Runtime**: Browser (web app), Node.js 20 (CLI)
- **Language**: Strict TypeScript (no implicit any)
- **3D Engine**: Three.js (with OrbitControls)
- **UI Framework**: React 19
- **Build Tool**: Vite 7
- **GeoTIFF Parsing**: geotiff.js
- **PDF Generation**: pdf-lib (CLI)
- **CLI Framework**: Commander
- **Dev Server**: port 5000 (Vite, bound to 0.0.0.0)
- **Monorepo**: npm workspaces

## Project Structure

```
mapqc-3d/
├── package.json                   # Root workspace config
├── tsconfig.json                  # Project references
├── ai-dev/                        # Agent definitions
│   ├── architect.md               # Solutions Architect agent
│   ├── frontend_expert.md         # Frontend & UI Expert agent
│   └── qa_reviewer.md             # QA Reviewer agent
├── apps/
│   ├── web/                       # Browser app (Vite + React + Three.js)
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.tsx           # React entry
│   │       ├── App.tsx            # Main layout (sidebar + viewport)
│   │       ├── styles.css         # Dark theme styles
│   │       ├── components/
│   │       │   ├── ErrorBoundary.tsx
│   │       │   ├── ExportButton.tsx    # JSON report download
│   │       │   ├── FileUpload.tsx      # Drag-drop GeoTIFF upload
│   │       │   ├── MetadataPanel.tsx   # GeoTIFF metadata display
│   │       │   ├── QaResultsPanel.tsx  # QA check results
│   │       │   └── Viewport.tsx        # Three.js canvas host
│   │       ├── geo/
│   │       │   └── loadGeoTiff.ts      # Browser GeoTIFF loader
│   │       └── three/
│   │           ├── ThreeApp.ts         # Core renderer lifecycle
│   │           └── modules/
│   │               ├── GridModule.ts
│   │               ├── LightingModule.ts
│   │               └── TerrainModule.ts  # 3D terrain from elevation data
│   └── cli/                       # Node.js CLI batch processor
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── main.ts            # CLI entry (commander)
│           ├── context.ts         # RunContext lifecycle
│           ├── logger.ts          # Structured JSON logger
│           ├── scanner.ts         # Directory scanner + file processor
│           ├── index.ts           # Barrel export
│           ├── geo/
│           │   └── loadGeoTiff.ts # Node.js GeoTIFF loader (fs)
│           └── reporters/
│               ├── jsonReporter.ts
│               └── pdfReporter.ts
└── packages/
    └── shared/                    # Pure domain logic (zero runtime deps)
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts           # Barrel export
            ├── types.ts           # GeoTiffMetadata, QaResult, QaReport, etc.
            ├── qa/
            │   ├── index.ts
            │   └── checks.ts     # Pure QA functions (pixel size, extent, bands, etc.)
            └── report/
                ├── index.ts
                └── builder.ts    # Report construction + JSON serialization
```

## Architecture

### Three Layers
1. **packages/shared** — Types, QA checks, report schemas. Zero runtime-specific code. All functions pure.
2. **apps/web** — Browser-only. React UI + Three.js viewport. GeoTIFF loaded via geotiff.js in browser.
3. **apps/cli** — Node.js-only. Commander CLI, RunContext orchestration, continue-on-error batch processing.

### ThreeApp (apps/web/src/three/ThreeApp.ts)
- Single renderer instance with OrbitControls
- SceneModule interface: `init()`, `update(delta)`, `dispose()`
- `fitToExtent()` for camera positioning
- Pixel ratio capped at 2
- No per-frame allocations

### QA Checks (packages/shared/src/qa/checks.ts)
- `checkPixelSize` — validates positive, within range
- `checkExtent` — validates ordered coordinates, non-zero area
- `checkBandCount` — at least 1 band
- `checkNoData` — warns if not set
- `checkBitDepth` — validates standard depths (8/16/32/64)
- `checkCrs` — warns if missing
- `runAllChecks` — runs all, returns QaResult[]

### CLI (apps/cli)
- `scan` command with --input, --output, --format (json/pdf/both), --sidecars
- RunContext manages runId, config, logger, timing
- Each file processed independently (continue-on-error)
- JSON + PDF report output

### Design Rules
- No global mutable state
- QA functions must be pure with deterministic outputs
- Web: browser-only — no fs/path/process
- CLI: Node.js only, structured JSON logging
- No mixing web + Node APIs
- No QA logic in UI components
- No singletons or global event emitters
- All Three.js objects must have disposal paths
- Explicit error handling — no silent swallowing

## Implementation Status

### Phase 1 — DONE
- GeoTIFF reader (browser + Node loaders)
- Derive extent + pixel size
- QA checks wired
- Metadata display in UI

### Phase 2 — DONE
- Render raster plane in map units (TerrainModule)
- Camera fit-to-extent
- Texture disposal discipline

### Phase 3 — DONE
- JSON export from web UI
- PDF export via pdf-lib (CLI)
- CLI batch scanning

### Phase 4 — PARTIAL
- CRS detection (reads from GeoKeys)
- Reprojection — not yet
- Performance profiling — not yet

## GIS Domain Context

- **Coordinate Systems**: Kentucky Single Zone EPSG:3089 (primary)
- **Data Sources**: GeoTIFF (via geotiff.js), KyFromAbove LiDAR, USGS NHD
- **Regulatory**: SMIS (Surface Mining Information System), DMPGIS
- **Analysis**: CHIA watershed assessments, permit boundary tracking

## Running

```bash
npm run dev:web                           # Vite dev server on port 5000
npm run dev:cli -- scan --input ./data    # CLI batch scan
npm run build                             # Build shared + web
```
