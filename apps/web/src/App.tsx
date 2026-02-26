import { useState, useCallback, useRef, useEffect } from "react";
import { loadRasterFile } from "./geo/loader";
import type { RasterInfo } from "./geo/loader";
import type { TerrainData, ColorRampName } from "./three/modules/TerrainModule";
import { FileUpload } from "./components/FileUpload";
import { Viewport } from "./components/Viewport";
import type { ViewportHandle } from "./components/Viewport";
import { LeafletMap } from "./components/LeafletMap";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ProfileTool } from "./components/ProfileTool";
import { generateSampleTerrain } from "./geo/sampleTerrain";
import { parseUrlState, useUrlStateSync } from "./hooks/useUrlState";

interface ProfilePoint {
  x: number;
  y: number;
  z: number;
}

const RAMP_OPTIONS: { value: ColorRampName; label: string }[] = [
  { value: "terrain", label: "Terrain" },
  { value: "viridis", label: "Viridis" },
  { value: "magma", label: "Magma" },
  { value: "arctic", label: "Arctic" },
  { value: "desert", label: "Desert" },
  { value: "slope", label: "Slope" },
  { value: "aspect", label: "Aspect" },
];

const BASEMAP_OPTIONS: { value: string; label: string }[] = [
  { value: "osm", label: "OpenStreetMap" },
  { value: "Topographic", label: "Esri Topo" },
  { value: "Imagery", label: "Esri Imagery" },
  { value: "Terrain", label: "Esri Terrain" },
  { value: "ShadedRelief", label: "Shaded Relief" },
  { value: "DarkGray", label: "Dark Gray" },
  { value: "Streets", label: "Esri Streets" },
];

const KEYBOARD_SHORTCUTS = [
  { key: "1-7", desc: "Select color ramp" },
  { key: "W", desc: "Toggle wireframe" },
  { key: "R", desc: "Reset camera" },
  { key: "+/-", desc: "Adjust exaggeration" },
  { key: "S", desc: "Screenshot" },
  { key: "P", desc: "Profile tool" },
  { key: "?", desc: "Toggle this help" },
];

function downloadBlob(data: string, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

const initialUrlState = parseUrlState();

export function App() {
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);
  const [info, setInfo] = useState<RasterInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [exaggeration, setExaggeration] = useState(initialUrlState.exaggeration ?? 1.0);
  const [colorRamp, setColorRamp] = useState<ColorRampName>(
    (initialUrlState.colorRamp as ColorRampName) ?? "terrain"
  );
  const [wireframe, setWireframe] = useState(initialUrlState.wireframe ?? false);
  const [elevRange, setElevRange] = useState<{ min: number; max: number } | null>(null);
  const [basemap, setBasemap] = useState(initialUrlState.basemap ?? "Topographic");

  const [profileMode, setProfileMode] = useState(false);
  const [profileStart, setProfileStart] = useState<ProfilePoint | null>(null);
  const [profileEnd, setProfileEnd] = useState<ProfilePoint | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const viewportRef = useRef<ViewportHandle>(null);

  const hasUrlCamera = !!(initialUrlState.cam && initialUrlState.target);

  useEffect(() => {
    if (hasUrlCamera) {
      const timer = setTimeout(() => {
        viewportRef.current?.setCameraState(initialUrlState.cam!, initialUrlState.target!);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  const getCameraState = useCallback(() => {
    return viewportRef.current?.getCameraState() ?? null;
  }, []);

  useUrlStateSync(
    { exaggeration, colorRamp, wireframe, basemap },
    getCameraState
  );

  const handleFileSelected = useCallback(async (file: File, companionFile?: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setProfileStart(null);
    setProfileEnd(null);
    setProfileMode(false);

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

  const handleLoadSample = useCallback(() => {
    setLoading(true);
    setError(null);
    setFileName("sample-terrain.synthetic");
    setProfileStart(null);
    setProfileEnd(null);
    setProfileMode(false);
    try {
      const result = generateSampleTerrain();
      setTerrainData(result.terrain);
      setInfo(result.info);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate sample";
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

  const handleExportScreenshot = useCallback(() => {
    const dataUrl = viewportRef.current?.captureScreenshot();
    if (dataUrl) {
      const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "terrain";
      downloadDataUrl(dataUrl, `${baseName}_3d.png`);
    }
  }, [fileName]);

  const handleExportMetadata = useCallback(() => {
    if (!info || !elevRange) return;
    const report = {
      fileName: fileName ?? "unknown",
      format: info.format,
      dimensions: { width: info.width, height: info.height },
      bandCount: info.bandCount,
      bitsPerSample: info.bitsPerSample,
      crs: info.crs,
      noDataValue: info.noDataValue,
      origin: { x: info.originX, y: info.originY },
      pixelSize: { x: info.pixelSizeX, y: info.pixelSizeY },
      elevation: { min: elevRange.min, max: elevRange.max, range: elevRange.max - elevRange.min },
      exportedAt: new Date().toISOString(),
    };
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "terrain";
    downloadBlob(JSON.stringify(report, null, 2), `${baseName}_report.json`, "application/json");
  }, [info, elevRange, fileName]);

  const handleExportElevationCsv = useCallback(() => {
    if (!terrainData) return;
    const { elevations, width, height } = terrainData;
    const lines: string[] = [];
    lines.push("row,col,elevation");
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        lines.push(`${y},${x},${elevations[y * width + x].toFixed(3)}`);
      }
    }
    const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "terrain";
    downloadBlob(lines.join("\n"), `${baseName}_elevation.csv`, "text/csv");
  }, [terrainData, fileName]);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }, []);

  const handleProfileClick = useCallback((point: ProfilePoint) => {
    if (!profileStart) {
      setProfileStart(point);
      setProfileEnd(null);
    } else if (!profileEnd) {
      setProfileEnd(point);
      setProfileMode(false);
    }
  }, [profileStart, profileEnd]);

  const handleProfileClear = useCallback(() => {
    setProfileStart(null);
    setProfileEnd(null);
    setProfileMode(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

      switch (e.key) {
        case "w":
        case "W":
          setWireframe((v) => !v);
          break;
        case "r":
        case "R":
          viewportRef.current?.resetCamera();
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7": {
          const idx = parseInt(e.key) - 1;
          if (idx < RAMP_OPTIONS.length) {
            setColorRamp(RAMP_OPTIONS[idx].value);
          }
          break;
        }
        case "+":
        case "=":
          setExaggeration((v) => Math.min(5, +(v + 0.5).toFixed(1)));
          break;
        case "-":
          setExaggeration((v) => Math.max(0.1, +(v - 0.5).toFixed(1)));
          break;
        case "s":
        case "S":
          handleExportScreenshot();
          break;
        case "p":
        case "P":
          setProfileMode((v) => !v);
          break;
        case "?":
          setShowShortcuts((v) => !v);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleExportScreenshot]);

  const totalPixels = info ? info.width * info.height : 0;
  const elevRangeVal = elevRange ? (elevRange.max - elevRange.min) : 0;

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
          <button
            className="sample-btn"
            onClick={handleLoadSample}
            disabled={loading}
          >
            Load Sample Terrain
          </button>
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

        {terrainData && elevRange && (
          <div className="sidebar-section">
            <h2>Terrain Stats</h2>
            <div className="stats-row">
              <div className="stat-chip">
                <span className="stat-val">{totalPixels.toLocaleString()}</span>
                <span className="stat-key">Pixels</span>
              </div>
              <div className="stat-chip">
                <span className="stat-val">{elevRangeVal.toFixed(1)}m</span>
                <span className="stat-key">Relief</span>
              </div>
              <div className="stat-chip">
                <span className="stat-val">{info?.pixelSizeX.toFixed(6)}</span>
                <span className="stat-key">Pixel X</span>
              </div>
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
                Wireframe Overlay
              </label>
            </div>

            <div className="control-group">
              <label className="control-label">
                <input
                  type="checkbox"
                  checked={profileMode}
                  onChange={(e) => {
                    setProfileMode(e.target.checked);
                    if (!e.target.checked) {
                      setProfileStart(null);
                      setProfileEnd(null);
                    }
                  }}
                />
                Profile Tool
              </label>
            </div>
          </div>
        )}

        {terrainData && (
          <div className="sidebar-section">
            <h2>Export</h2>
            <div className="export-buttons">
              <button className="export-btn" onClick={handleExportScreenshot}>
                <span className="export-icon">&#128247;</span>
                Screenshot PNG
              </button>
              <button className="export-btn" onClick={handleExportMetadata}>
                <span className="export-icon">&#128196;</span>
                Metadata JSON
              </button>
              <button className="export-btn" onClick={handleExportElevationCsv}>
                <span className="export-icon">&#128202;</span>
                Elevation CSV
              </button>
              <button className="export-btn" onClick={handleCopyLink}>
                <span className="export-icon">&#128279;</span>
                {linkCopied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        )}

        {!terrainData && !loading && (
          <div className="empty-state">
            Drop a raster elevation file to explore terrain in 3D. Supports GeoTIFF, USGS DEM, DTED, ASCII XYZ, NetCDF, ERDAS Imagine, LAS point clouds, and image + world file pairs.
          </div>
        )}
      </aside>

      <div className="main-content">
        <div className="viewport-area">
          <ErrorBoundary>
            <Viewport
              ref={viewportRef}
              terrainData={terrainData}
              exaggeration={exaggeration}
              colorRamp={colorRamp}
              wireframe={wireframe}
              onElevationRange={handleElevationRange}
              profileMode={profileMode}
              onProfileClick={handleProfileClick}
              skipCameraReset={hasUrlCamera}
            />
          </ErrorBoundary>
          {terrainData && profileStart && profileEnd && (() => {
            const bounds = viewportRef.current?.getTerrainBounds();
            if (!bounds) return null;
            return (
              <ProfileTool
                terrainData={terrainData}
                startPoint={profileStart}
                endPoint={profileEnd}
                terrainBounds={bounds}
                onClear={handleProfileClear}
              />
            );
          })()}
        </div>

        <div className="map-panel">
          <div className="map-panel-header">
            <span className="map-panel-label">Location</span>
            <select
              className="basemap-select"
              value={basemap}
              onChange={(e) => setBasemap(e.target.value)}
            >
              {BASEMAP_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <LeafletMap info={info} fileName={fileName ?? undefined} basemap={basemap} />
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

      {showShortcuts && (
        <div className="shortcuts-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
            <div className="shortcuts-title">Keyboard Shortcuts</div>
            <div className="shortcuts-grid">
              {KEYBOARD_SHORTCUTS.map((s) => (
                <div className="shortcut-row" key={s.key}>
                  <kbd className="shortcut-key">{s.key}</kbd>
                  <span className="shortcut-desc">{s.desc}</span>
                </div>
              ))}
            </div>
            <div className="shortcuts-dismiss">Press ? to close</div>
          </div>
        </div>
      )}
    </div>
  );
}
