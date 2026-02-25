import type { GeoTiffMetadata, QaResult, QaReport } from "../types.js";

export function buildReport(
  fileId: string,
  fileName: string,
  metadata: GeoTiffMetadata,
  results: QaResult[],
  startTime: number
): QaReport {
  return {
    fileId,
    fileName,
    metadata,
    results,
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
  };
}

export function reportToJson(report: QaReport): string {
  return JSON.stringify(report, null, 2);
}

export function reportsToJson(reports: QaReport[]): string {
  return JSON.stringify(reports, null, 2);
}
