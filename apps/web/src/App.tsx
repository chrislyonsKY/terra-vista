import { useState, useCallback } from "react";
import { loadRasterFile } from "./geo/loader";
import type { RasterInfo } from "./geo/loader";
import type { TerrainData, ColorRampName } from "./three/modules/TerrainModule";
import { FileUpload } from "./components/FileUpload";
import { Viewport } from "./components/Viewport";
import { LeafletMap } from "./components/LeafletMap";
import { ErrorBoundary } from "./components/ErrorBoundary";

const RAMP_OPTIONS: { value: ColorRampName; label: string }[] = [
  { value: "terrain", label: "Terrain" },
  { value: "viridis", label: "Viridis" },
  { value: "magma", label: "Magma" },
  { value: "arctic", label: "Arctic" },
  { value: "desert", label: "Desert" },
];

export function App() {
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);
  const [info, setInfo] = useState<RasterInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [exaggeration, setExaggeration] = useState(1.5);
  const [colorRamp, setColorRamp] = useState<ColorRampName>("terrain");
  const [wireframe, setWireframe] = useState(false);
  const [elevRange, setElevRange] = useState<{ min: number; max: number } | null>(null);

  const handleFileSelected = useCallback(async (file: File, companionFile?: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);

    try {
      let worldFileContent: string | undefined;
      if (companionFile) {
        worldFileContent = await companionFile.text();
      }

      const result = await loadRasterFile(file, worldFileContent);
      setTerrainData(result.terrain);
      setInfo(result.info);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load file";
      setError(message);
      setTerrainData(null);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleElevationRange = useCallback((min: number, max: number) => {
    setElevRange({ min, max });
  }, []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Terra Vista</h1>
          <p>3D Terrain Visualizer</p>
        </div>

        <div className="sidebar-section">
          <h2>Load Terrain</h2>
          <FileUpload onFileSelected={handleFileSelected} disabled={loading} />
          {fileName && !loading && (
            <div className="file-name">{fileName}</div>
          )}
          {loading && <div className="loading-text">Loading terrain data...</div>}
          {error && <div className="error-text">{error}</div>}
        </div>

        {info && (
          <div className="sidebar-section">
            <h2>File Info</h2>
            <div className="info-grid">
              <div className="info-item full-width">
                <span className="info-label">Format</span>
                <span className="info-value">{info.format}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Dimensions</span>
                <span className="info-value">{info.width} x {info.height}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Bands</span>
                <span className="info-value">{info.bandCount}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Bit Depth</span>
                <span className="info-value">{info.bitsPerSample.join(", ")}-bit</span>
              </div>
              <div className="info-item">
                <span className="info-label">CRS</span>
                <span className="info-value">{info.crs ?? "Unknown"}</span>
              </div>
              {elevRange && (
                <>
                  <div className="info-item">
                    <span className="info-label">Min Elev</span>
                    <span className="info-value">{elevRange.min.toFixed(1)} m</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Max Elev</span>
                    <span className="info-value">{elevRange.max.toFixed(1)} m</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {terrainData && (
          <div className="sidebar-section">
            <h2>Controls</h2>

            <div className="control-group">
              <label className="control-label">
                Elevation: {exaggeration.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={exaggeration}
                onChange={(e) => setExaggeration(parseFloat(e.target.value))}
                className="slider"
              />
            </div>

            <div className="control-group">
              <label className="control-label">Color Ramp</label>
              <div className="ramp-buttons">
                {RAMP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`ramp-btn ${colorRamp === opt.value ? "active" : ""}`}
                    onClick={() => setColorRamp(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group">
              <label className="control-label">
                <input
                  type="checkbox"
                  checked={wireframe}
                  onChange={(e) => setWireframe(e.target.checked)}
                />
                Wireframe
              </label>
            </div>
          </div>
        )}

        {!terrainData && !loading && (
          <div className="empty-state">
            Drop a raster elevation file to explore terrain in 3D. Supports GeoTIFF, USGS DEM, DTED, ASCII XYZ, NetCDF, ERDAS Imagine, and image + world file pairs.
          </div>
        )}
      </aside>

      <div className="main-content">
        <div className="viewport-area">
          <ErrorBoundary>
            <Viewport
              terrainData={terrainData}
              exaggeration={exaggeration}
              colorRamp={colorRamp}
              wireframe={wireframe}
              onElevationRange={handleElevationRange}
            />
          </ErrorBoundary>
        </div>

        <div className="map-panel">
          <span className="map-panel-label">Location</span>
          <LeafletMap info={info} />
        </div>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner-ring" />
            <div className="loading-text-large">Loading terrain...</div>
          </div>
        </div>
      )}
    </div>
  );
}
