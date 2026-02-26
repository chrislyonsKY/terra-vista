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
- **Theme**: Professional GIS (light sidebar, ArcGIS-blue accents #007ac2, dark 3D viewport)

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
│   │       ├── App.tsx            # Main layout (sidebar + viewport + keyboard shortcuts)
│   │       ├── styles.css         # Professional GIS theme styles
│   │       ├── components/
│   │       │   ├── ErrorBoundary.tsx  # WebGL fallback
│   │       │   ├── FileUpload.tsx     # Drag-drop GeoTIFF upload
│   │       │   ├── LeafletMap.tsx     # Leaflet + OSM location map
│   │       │   ├── ProfileTool.tsx    # Elevation cross-section tool (SVG chart)
│   │       │   └── Viewport.tsx       # Three.js canvas + raycasting for profile
│   │       ├── geo/
│   │       │   ├── formats.ts         # Format registry + detection
│   │       │   ├── loader.ts          # Unified loader dispatcher
│   │       │   ├── loadGeoTiff.ts     # GeoTIFF/COG/ERDAS loader
│   │       │   ├── loadXyz.ts         # ASCII XYZ loader
│   │       │   ├── loadUsgsDem.ts     # USGS DEM loader
│   │       │   ├── loadDted.ts        # DTED (.dt0/.dt1/.dt2) loader
│   │       │   ├── loadNetcdf.ts      # NetCDF loader
│   │       │   ├── loadWorldFile.ts   # Image + world file loader
│   │       │   ├── loadLas.ts         # LAS/LAZ loader (Web Worker with fallback)
│   │       │   ├── lasWorker.ts       # Web Worker for off-thread LAS/LAZ parsing
│   │       │   └── sampleTerrain.ts   # Synthetic Kentucky terrain generator
│   │       ├── hooks/
│   │       │   └── useUrlState.ts     # Shareable URL state sync (hash-based)
│   │       └── three/
│   │           ├── ThreeApp.ts        # Core renderer lifecycle
│   │           └── modules/
│   │               ├── GridModule.ts
│   │               ├── LightingModule.ts  # Sun + hemisphere + fill lights
│   │               └── TerrainModule.ts   # 3D terrain mesh + 7 color ramps + slope/aspect
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
- **Multi-format loading**: Unified loader dispatches by file extension
  - Supported: GeoTIFF (.tif/.tiff), COG (.cog), ERDAS Imagine (.img), ASCII XYZ (.xyz), USGS DEM (.dem), DTED (.dt0/.dt1/.dt2), NetCDF (.nc), LAS/LAZ (.las/.laz), Image + World File (.jpg+.jgw, .png+.pgw, etc.)
  - Recognized but unsupported (browser limitation): JPEG 2000, GeoPackage, ECW, MrSID, HDF — shows clear error message suggesting GDAL conversion
- **3D terrain rendering**: Normalizes geographic coordinates to a fixed 200-unit scene space
- **Leaflet map with Esri basemaps**: Shows geographic extent with switchable basemaps (OSM, Esri Topo, Imagery, Terrain, Shaded Relief, Dark Gray, Streets) via esri-leaflet. API key injected via VITE_ARCGIS_API_KEY env var.
- **7 color ramps**: Terrain, Viridis, Magma, Arctic, Desert, Slope (Horn's method grayscale), Aspect (HSL compass wheel)
- **Slope/Aspect analysis**: Computed from 3x3 Horn's method finite differences. Slope shows steepness as grayscale gradient. Aspect shows compass direction via HSL color wheel (N=blue, E=green, S=red, W=yellow).
- **Elevation exaggeration**: 0.1x–5x slider
- **Wireframe overlay**: Toggle on/off
- **Orbit controls**: Rotate, zoom, pan. Reset view button.
- **Elevation profile tool**: Click two points on terrain for cross-section. Shows SVG elevation transect with min/max, ascent/descent stats.
- **File info panel**: Format, dimensions, bands, bit depth, CRS, elevation min/max
- **Terrain stats**: Pixel count, relief, pixel size
- **Export**: Screenshot PNG, Metadata JSON report, Elevation CSV, Copy shareable link
- **Sample terrain**: Built-in synthetic Kentucky terrain (256x256, fractal noise + ridges) for instant demo
- **Shareable URLs**: View state (exaggeration, color ramp, wireframe, basemap, camera position) encoded in URL hash
- **Keyboard shortcuts**: W=wireframe, R=reset, 1-7=ramps, +/-=exaggeration, S=screenshot, P=profile, ?=help
- Up to 800-segment mesh resolution, 1024px texture
- **LAS/LAZ**: Parsed in Web Worker off-thread. Falls back to main thread if Worker fails. Point clouds gridded to DEM via spatial binning + neighbor interpolation. LAZ decompressed via laz-perf WASM. Up to 10M points sampled.
- **3D rendering**: ACES tone mapping, fog, enhanced multi-directional lighting, preserveDrawingBuffer for screenshots

### Key Technical Details
- **Coordinate normalization**: USGS GeoTIFFs use geographic coords (e.g., -83, 38). TerrainModule normalizes all terrain to a 200-unit scene centered at origin.
- **geotiff.js quirk**: `getBitsPerSample()` returns a plain number (not array) for single-band files. Loader normalizes with `Array.isArray()` check.
- **Three.js v0.183**: Uses `THREE.Timer` (not deprecated `THREE.Clock`). Timer requires explicit `.update()` call each frame.
- **Vite cache**: Clear `apps/web/node_modules/.vite` if stale imports cause crashes.
- **laz-perf WASM**: The WASM file is copied to `apps/web/public/laz-perf.wasm` and loaded via `locateFile` override. `optimizeDeps.include` is used (not exclude) so Vite pre-bundles the JS.
- **Elevation exaggeration**: Base height scale is `sceneSize * 0.1 * exaggeration`. Default exaggeration is 1.0x. Slider range 0.1–5x.
- **@mapqc/shared alias**: Resolved in vite.config.ts via `resolve.alias` pointing to `packages/shared/src`.
- **Web Worker LAS**: Uses `new Worker(new URL("./lasWorker.ts", import.meta.url), { type: "module" })` — Vite handles this natively. Buffer transferred via Transferable for zero-copy.
- **URL state**: Hash-based encoding via `useUrlState.ts`. Debounced at 500ms. Camera state read from OrbitControls. Parsed on initial load to restore view.
- **Profile raycasting**: THREE.Raycaster against terrain mesh. Samples 200 points along line between two clicked points. Elevation interpolated from TerrainData grid.

### ThreeApp (apps/web/src/three/ThreeApp.ts)
- Single renderer instance with OrbitControls + damping
- SceneModule interface: `init()`, `update(delta)`, `dispose()`
- Exposes `getCamera()`, `getControls()`, `getRenderer()` for profile raycasting and URL state
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
