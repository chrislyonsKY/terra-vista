import type { GeoTiffMetadata } from "@mapqc/shared";

interface MetadataPanelProps {
  metadata: GeoTiffMetadata;
}

export function MetadataPanel({ metadata }: MetadataPanelProps) {
  const {
    width,
    height,
    bandCount,
    bitsPerSample,
    pixelSize,
    extent,
    noDataValue,
    crs,
  } = metadata;

  return (
    <div className="metadata-grid">
      <div className="metadata-item">
        <div className="metadata-label">Width</div>
        <div className="metadata-value">{width} px</div>
      </div>
      <div className="metadata-item">
        <div className="metadata-label">Height</div>
        <div className="metadata-value">{height} px</div>
      </div>
      <div className="metadata-item">
        <div className="metadata-label">Bands</div>
        <div className="metadata-value">{bandCount}</div>
      </div>
      <div className="metadata-item">
        <div className="metadata-label">Bit Depth</div>
        <div className="metadata-value">{bitsPerSample.join(", ")}</div>
      </div>
      <div className="metadata-item">
        <div className="metadata-label">Pixel Size X</div>
        <div className="metadata-value">{pixelSize.x.toFixed(6)}</div>
      </div>
      <div className="metadata-item">
        <div className="metadata-label">Pixel Size Y</div>
        <div className="metadata-value">{pixelSize.y.toFixed(6)}</div>
      </div>
      <div className="metadata-item full-width">
        <div className="metadata-label">Extent</div>
        <div className="metadata-value">
          ({extent.minX.toFixed(2)}, {extent.minY.toFixed(2)}) — (
          {extent.maxX.toFixed(2)}, {extent.maxY.toFixed(2)})
        </div>
      </div>
      <div className="metadata-item">
        <div className="metadata-label">NoData</div>
        <div className="metadata-value">
          {noDataValue !== null ? noDataValue : "Not set"}
        </div>
      </div>
      <div className="metadata-item">
        <div className="metadata-label">CRS</div>
        <div className="metadata-value">{crs ?? "Unknown"}</div>
      </div>
    </div>
  );
}
