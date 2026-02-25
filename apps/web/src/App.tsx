import { useState, useCallback } from "react";
import { runAllChecks, buildReport } from "@mapqc/shared";
import type { GeoTiffMetadata, QaResult, QaReport, Extent } from "@mapqc/shared";
import { loadGeoTiffFromFile } from "./geo/loadGeoTiff";
import { FileUpload } from "./components/FileUpload";
import { MetadataPanel } from "./components/MetadataPanel";
import { QaResultsPanel } from "./components/QaResultsPanel";
import { ExportButton } from "./components/ExportButton";
import { Viewport } from "./components/Viewport";
import { ErrorBoundary } from "./components/ErrorBoundary";

interface TerrainState {
  elevations: Float32Array;
  width: number;
  height: number;
  extent: Extent;
  noDataValue: number | null;
}

export function App() {
  const [metadata, setMetadata] = useState<GeoTiffMetadata | null>(null);
  const [qaResults, setQaResults] = useState<QaResult[]>([]);
  const [report, setReport] = useState<QaReport | null>(null);
  const [terrainData, setTerrainData] = useState<TerrainState | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);

    const startTime = Date.now();

    try {
      const result = await loadGeoTiffFromFile(file);
      const { metadata: meta, elevations } = result;

      setMetadata(meta);

      const results = runAllChecks(meta);
      setQaResults(results);

      const fileId = crypto.randomUUID();
      const qaReport = buildReport(fileId, file.name, meta, results, startTime);
      setReport(qaReport);

      setTerrainData({
        elevations,
        width: meta.width,
        height: meta.height,
        extent: meta.extent,
        noDataValue: meta.noDataValue,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load GeoTIFF";
      setError(message);
      setMetadata(null);
      setQaResults([]);
      setReport(null);
      setTerrainData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>MapQC 3D</h1>
          <p>GeoTIFF Quality Control</p>
        </div>

        <div className="sidebar-section">
          <h2>File</h2>
          <FileUpload onFileSelected={handleFileSelected} disabled={loading} />
          {fileName && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#7070a0" }}>
              {fileName}
            </div>
          )}
          {error && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#e05050" }}>
              {error}
            </div>
          )}
        </div>

        {metadata && (
          <div className="sidebar-section">
            <h2>Metadata</h2>
            <MetadataPanel metadata={metadata} />
          </div>
        )}

        {qaResults.length > 0 && (
          <div className="sidebar-section">
            <h2>QA Checks</h2>
            <QaResultsPanel results={qaResults} />
          </div>
        )}

        {report && (
          <div className="sidebar-section">
            <h2>Export</h2>
            <ExportButton report={report} />
          </div>
        )}

        {!metadata && !loading && (
          <div className="empty-state">
            Upload a GeoTIFF to begin inspection
          </div>
        )}
      </aside>

      <ErrorBoundary>
        <Viewport terrainData={terrainData} />
      </ErrorBoundary>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading GeoTIFF...</div>
        </div>
      )}
    </div>
  );
}
