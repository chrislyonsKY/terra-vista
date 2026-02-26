# Terra Vista

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-000000?logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Esri](https://img.shields.io/badge/Esri_Basemaps-ArcGIS-007AC2?logo=esri&logoColor=white)](https://developers.arcgis.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Interactive 3D terrain visualizer that loads multiple elevation raster formats and renders them as 3D terrain with color ramps, elevation exaggeration controls, orbit navigation, and a Leaflet location map with switchable Esri basemaps.

---

## Features

- **Multi-format raster loading** — GeoTIFF, Cloud Optimized GeoTIFF (COG), USGS DEM, DTED (.dt0/.dt1/.dt2), ASCII XYZ, NetCDF, ERDAS Imagine, LAS/LAZ point clouds, and image + world file pairs
- **3D terrain rendering** — Three.js mesh with up to 800-segment resolution, ACES tone mapping, multi-directional lighting, fog
- **5 color ramps** — Terrain, Viridis, Magma, Arctic, Desert
- **Elevation exaggeration** — 0.1x to 5.0x slider for emphasizing subtle relief
- **Wireframe overlay** — Toggle wireframe on/off for mesh inspection
- **Orbit controls** — Rotate, zoom, pan with damping; reset view button
- **Leaflet location map** — Shows raster footprint with corner markers and filename label
- **Esri ArcGIS basemaps** — Switch between OpenStreetMap, Esri Topographic, Imagery, Terrain, Shaded Relief, Dark Gray, and Streets
- **Export** — Screenshot PNG, metadata JSON report, elevation CSV
- **File info panel** — Format, dimensions, bands, bit depth, CRS, elevation range
- **Terrain stats** — Pixel count, relief range, pixel size
- **LAS/LAZ support** — Custom LAS 1.0–1.4 parser with LAZ decompression via laz-perf WASM; spatial binning to grid with neighbor interpolation for gap filling
- **Professional GIS theme** — Light sidebar, ArcGIS-blue accents, dark 3D viewport

## Supported Formats

| Format | Extensions | Notes |
|--------|-----------|-------|
| GeoTIFF | `.tif`, `.tiff` | Industry standard georeferenced raster |
| Cloud Optimized GeoTIFF | `.cog` | Streamable GeoTIFF |
| ERDAS Imagine | `.img` | Remote sensing format |
| ASCII XYZ | `.xyz` | Text elevation grid (X Y Z) |
| USGS DEM | `.dem` | USGS digital elevation model |
| DTED | `.dt0`, `.dt1`, `.dt2` | Digital Terrain Elevation Data |
| NetCDF | `.nc` | Scientific multidimensional arrays |
| LAS/LAZ | `.las`, `.laz` | LiDAR point clouds (gridded to DEM) |
| Image + World File | `.jpg`+`.jgw`, `.png`+`.pgw`, etc. | Standard image with georeferencing sidecar |

Recognized but unsupported in-browser: JPEG 2000, GeoPackage, ECW, MrSID, HDF — the app displays a clear message suggesting GDAL conversion.

## Architecture

```
terra-vista/
├── apps/
│   ├── web/            # Vite + React + Three.js browser app
│   │   ├── src/
│   │   │   ├── components/    # React UI (FileUpload, Viewport, LeafletMap, ErrorBoundary)
│   │   │   ├── geo/           # Format loaders (GeoTIFF, LAS, DTED, XYZ, NetCDF, etc.)
│   │   │   └── three/         # Three.js renderer, terrain mesh, lighting, grid
│   │   └── public/            # Static assets (laz-perf.wasm)
│   └── cli/            # Node.js CLI batch processor
│       └── src/               # Commander CLI, scanner, JSON/PDF reporters
└── packages/
    └── shared/         # Pure domain types, QA checks, report builder
```

**Monorepo** managed with npm workspaces. The `@mapqc/shared` package provides types and QA logic consumed by both the web app and CLI.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Install

```bash
npm install
```

### Development

```bash
npm run dev:web          # Vite dev server on port 5000
```

### CLI

```bash
npm run dev:cli -- scan --input ./data --output ./reports --format both
```

### Build

```bash
npm run build            # Build shared + web
```

## Configuration

### Esri Basemaps

Set the `ARCGIS_API_KEY` environment variable to enable Esri ArcGIS basemap tiles. Without it, basemaps default to OpenStreetMap.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ARCGIS_API_KEY` | No | ArcGIS API key for Esri basemap tiles |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.9 (strict) |
| UI Framework | React 19 |
| 3D Engine | Three.js 0.183 |
| 2D Map | Leaflet 1.9 + esri-leaflet |
| Build Tool | Vite 7 |
| GeoTIFF Parsing | geotiff.js |
| LAZ Decompression | laz-perf (Emscripten WASM) |
| CLI Framework | Commander |
| PDF Generation | pdf-lib |
| Monorepo | npm workspaces |

## License

MIT
