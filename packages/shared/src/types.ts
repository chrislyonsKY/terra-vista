export interface Extent {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PixelSize {
  x: number;
  y: number;
}

export interface GeoTiffMetadata {
  width: number;
  height: number;
  bandCount: number;
  bitsPerSample: number[];
  sampleFormat: number[];
  noDataValue: number | null;
  origin: [number, number];
  pixelSize: PixelSize;
  extent: Extent;
  crs: string | null;
}

export enum QaCheckId {
  PIXEL_SIZE = "PIXEL_SIZE",
  EXTENT = "EXTENT",
  BAND_COUNT = "BAND_COUNT",
  NODATA = "NODATA",
  BIT_DEPTH = "BIT_DEPTH",
  CRS = "CRS",
}

export enum QaSeverity {
  ERROR = "ERROR",
  WARNING = "WARNING",
  INFO = "INFO",
}

export interface QaResult {
  checkId: QaCheckId;
  severity: QaSeverity;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface QaReport {
  fileId: string;
  fileName: string;
  metadata: GeoTiffMetadata;
  results: QaResult[];
  timestamp: string;
  duration: number;
}

export interface RunConfig {
  inputDir: string;
  outputDir: string;
  sidecars: "error" | "warn" | "ignore";
}
