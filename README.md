# Terra Vista

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.183-000000?logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Esri](https://img.shields.io/badge/Esri_Basemaps-ArcGIS-007AC2?logo=esri&logoColor=white)](https://developers.arcgis.com/)
[![WCAG 2.1 AA](https://img.shields.io/badge/WCAG_2.1-AA_Compliant-4CAF50)](https://www.w3.org/WAI/WCAG21/quickref/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Interactive 3D terrain visualizer that loads multiple elevation raster formats and renders them as 3D terrain with color ramps, terrain analysis (slope/aspect), elevation profiles, orbit navigation, ArcGIS Online data search, and a Leaflet location map with switchable Esri basemaps.

---

## Features

- **Multi-format raster loading** — GeoTIFF, Cloud Optimized GeoTIFF (COG), USGS DEM, DTED (.dt0/.dt1/.dt2), ASCII XYZ, NetCDF, ERDAS Imagine, LAS/LAZ point clouds, and image + world file pairs
- **ArcGIS Online search** — Search and load elevation data directly from ArcGIS Online Image Services and Map Services
- **3D terrain rendering** — Three.js mesh with up to 800-segment resolution, ACES tone mapping, multi-directional lighting, fog
- **7 color ramps** — Terrain, Viridis, Magma, Arctic, Desert, Slope, Aspect
- **Slope analysis** — Horn's method finite differences; grayscale shading from flat (white) to steep (dark)
- **Aspect analysis** — Compass direction of steepest descent; HSL color wheel (N=blue, E=green, S=red, W=yellow)
- **Elevation profile tool** — Click two points on terrain for cross-section transect with SVG chart showing min/max, ascent/descent
- **Elevation exaggeration** — 0.1x to 5.0x slider for emphasizing subtle relief
- **Wireframe overlay** — Toggle wireframe on/off for mesh inspection
- **Orbit controls** — Rotate, zoom, pan with damping; reset view button
- **Leaflet location map** — Shows raster footprint with corner markers and filename label; built-in UTM reprojection for projected CRS
- **Esri ArcGIS basemaps** — Switch between OpenStreetMap, Esri Topographic, Imagery, Terrain, Shaded Relief, Dark Gray, and Streets
- **Sample terrain** — Built-in synthetic Kentucky terrain for instant demo without file upload
- **Shareable URLs** — View state (exaggeration, ramp, wireframe, basemap, camera) encoded in URL hash
- **Keyboard shortcuts** — W=wireframe, R=reset, 1-7=ramps, +/-=exaggeration, S=screenshot, P=profile, ?=help
- **Export** — Screenshot PNG, metadata JSON report, elevation CSV, shareable link
- **File info panel** — Format, dimensions, bands, bit depth, CRS, elevation range
- **Terrain stats** — Pixel count, relief range, pixel size
- **LAS/LAZ support** — Web Worker off-thread parsing with fallback; laz-perf WASM decompression; spatial binning to grid with neighbor interpolation
- **WCAG 2.1 AA accessible** — Full keyboard navigation, ARIA labels, screen reader support, high-contrast text, focus indicators, reduced motion support
- **Professional GIS theme** — Light sidebar, ArcGIS-blue accents, sky-blue 3D viewport

## Accessibility (WCAG 2.1 AA)

Terra Vista is designed to meet WCAG 2.1 Level AA compliance:

- **Keyboard navigation** — All interactive elements are fully keyboard accessible with visible focus indicators (`:focus-visible`)
- **Screen reader support** — ARIA labels on all controls, landmarks, and interactive regions; decorative icons marked `aria-hidden="true"`; form inputs have associated `<label>` elements
- **Color contrast** — All text meets the 4.5:1 minimum contrast ratio against backgrounds (WCAG 1.4.3)
- **Semantic HTML** — Proper `role` attributes (`application`, `dialog`, `search`, `region`, `button`, `alert`, `status`, `img`); `aria-pressed` on toggle buttons; `aria-busy` on loading states
- **Reduced motion** — Respects `prefers-reduced-motion` media query for users who prefer less animation
- **Focus management** — Modal dialogs trap focus with close button; shortcuts overlay dismissible via Escape key with focus returned
- **Document language** — `lang="en"` set on `<html>` element

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

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1`-`7` | Select color ramp (Terrain, Viridis, Magma, Arctic, Desert, Slope, Aspect) |
| `W` | Toggle wireframe overlay |
| `R` | Reset camera to default view |
| `+` / `-` | Increase / decrease elevation exaggeration |
| `S` | Export screenshot |
| `P` | Toggle elevation profile mode |
| `?` | Show/hide keyboard shortcuts help |

## Architecture

```
terra-vista/
├── apps/
│   ├── web/            # Vite + React + Three.js browser app
│   │   ├── src/
│   │   │   ├── components/    # React UI (FileUpload, Viewport, LeafletMap, ProfileTool, ArcGISSearch, ErrorBoundary)
│   │   │   ├── geo/           # Format loaders + Web Worker + ArcGIS service (GeoTIFF, LAS, DTED, XYZ, NetCDF, etc.)
│   │   │   ├── hooks/         # useUrlState (shareable URL hash state)
│   │   │   └── three/         # Three.js renderer, terrain mesh + slope/aspect, lighting, grid
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

## Deploying to GitHub Pages

Terra Vista is a static single-page app that can be deployed to GitHub Pages.

### Step 1: Set the Base Path

In `apps/web/vite.config.ts`, set the `base` option to your repository name:

```typescript
export default defineConfig({
  base: '/terra-vista/',
  // ... rest of config
});
```

### Step 2: Build for Production

```bash
npm run build
```

The built files will be in `apps/web/dist/`.

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub: **Settings > Pages**
2. Under **Build and deployment**, select **Source: GitHub Actions**
3. Create `.github/workflows/deploy.yml` (see below)

### Step 4: Add the Deployment Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: apps/web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### Step 5: Push and Deploy

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

Your site will be live at `https://<username>.github.io/terra-vista/` within a few minutes.

### Notes

- The ArcGIS API key (if used) must be set as a GitHub repository secret named `VITE_ARCGIS_API_KEY` and passed as an environment variable in the build step if you want Esri basemaps to work in production
- All features work without the API key — basemaps will default to OpenStreetMap

## Configuration

### Esri Basemaps

Set the `ARCGIS_API_KEY` environment variable to enable Esri ArcGIS basemap tiles. Without it, basemaps default to OpenStreetMap.

### ArcGIS Online Search

The ArcGIS Online search feature allows loading elevation data from public Image Services and Map Services. It works without authentication for public datasets.

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
| ArcGIS REST | @esri/arcgis-rest-request + @esri/arcgis-rest-portal |
| Build Tool | Vite 7 |
| GeoTIFF Parsing | geotiff.js |
| LAZ Decompression | laz-perf (Emscripten WASM) |
| CLI Framework | Commander |
| PDF Generation | pdf-lib |
| Monorepo | npm workspaces |

## License

MIT
