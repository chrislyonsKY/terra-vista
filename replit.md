# Terra Vista (MapQC-3D)

Interactive 3D terrain visualizer that loads GeoTIFF elevation files and renders them as stunning 3D terrain with color ramps, elevation exaggeration, orbit controls, and a Leaflet/OpenStreetMap location map. Built as a monorepo with npm workspaces.

## Tech Stack

- **Runtime**: Browser (web app), Node.js 20 (CLI)
- **Language**: Strict TypeScript (no implicit any)
- **3D Engine**: Three.js (with OrbitControls, THREE.Timer)
- **2D Map**: Leaflet + OpenStreetMap (location context)
- **UI Framework**: React 19
- **Build Tool**: Vite 7
- **GeoTIFF Parsing**: geotiff.js
- **PDF Generation**: pdf-lib (CLI)
- **CLI Framework**: Commander
- **Dev Server**: port 5000 (Vite, bound to 0.0.0.0)
- **Monorepo**: npm workspaces
- **Theme**: Dark neutral with green/teal accents (#10b981)

## Project Structure

```
mapqc-3d/
├── package.json                   # Root workspace config
├── tsconfig.json                  # Project references
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
│   │       │   ├── ErrorBoundary.tsx  # WebGL fallback
│   │       │   ├── FileUpload.tsx     # Drag-drop GeoTIFF upload
│   │       │   ├── LeafletMap.tsx     # Leaflet + OSM location map
│   │       │   └── Viewport.tsx       # Three.js canvas + controls bridge
│   │       ├── geo/
│   │       │   └── loadGeoTiff.ts     # Browser GeoTIFF loader
│   │       └── three/
│   │           ├── ThreeApp.ts        # Core renderer lifecycle
│   │           └── modules/
│   │               ├── GridModule.ts
│   │               ├── LightingModule.ts  # Sun + hemisphere + fill lights
│   │               └── TerrainModule.ts   # 3D terrain mesh + color ramps
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
            │   └── checks.ts     # Pure QA functions
            └── report/
                ├── index.ts
                └── builder.ts    # Report construction + JSON serialization
```

## Architecture

### Web App — Terrain Visualizer
The web app is a 3D terrain explorer. Key features:
- **GeoTIFF loading**: Drag-drop upload, parses elevation data via geotiff.js
- **3D terrain rendering**: Normalizes geographic coordinates to a fixed 200-unit scene space (avoids invisible terrain from raw lat/lon coords)
- **5 color ramps**: Terrain, Viridis, Magma, Arctic, Desert (selectable in sidebar)
- **Elevation exaggeration**: 0.1x–5x slider
- **Wireframe overlay**: Toggle on/off
- **Orbit controls**: Rotate, zoom, pan. Reset view button.
- **File info panel**: Dimensions, bands, bit depth, CRS, elevation min/max
- Up to 800-segment mesh resolution, 1024px texture

### Key Technical Details
- **Coordinate normalization**: USGS GeoTIFFs use geographic coords (e.g., -83, 38). TerrainModule normalizes all terrain to a 200-unit scene centered at origin.
- **geotiff.js quirk**: `getBitsPerSample()` returns a plain number (not array) for single-band files. Loader normalizes with `Array.isArray()` check.
- **Three.js v0.183**: Uses `THREE.Timer` (not deprecated `THREE.Clock`). Timer requires explicit `.update()` call each frame.
- **Vite cache**: Clear `apps/web/node_modules/.vite` if stale imports cause crashes.
- **@mapqc/shared alias**: Resolved in vite.config.ts via `resolve.alias` pointing to `packages/shared/src`.

### ThreeApp (apps/web/src/three/ThreeApp.ts)
- Single renderer instance with OrbitControls + damping
- SceneModule interface: `init()`, `update(delta)`, `dispose()`
- `resetCamera()` for standard viewing angle
- Pixel ratio capped at 2
- ResizeObserver via window resize handler

### CLI (apps/cli)
- `scan` command with --input, --output, --format (json/pdf/both), --sidecars
- RunContext manages runId, config, logger, timing
- Each file processed independently (continue-on-error)
- JSON + PDF report output

### Design Rules
- No global mutable state
- Web: browser-only — no fs/path/process
- CLI: Node.js only, structured JSON logging
- All Three.js objects must have disposal paths
- Explicit error handling — no silent swallowing

## Running

```bash
npm run dev:web                           # Vite dev server on port 5000
npm run dev:cli -- scan --input ./data    # CLI batch scan
npm run build                             # Build shared + web
```
