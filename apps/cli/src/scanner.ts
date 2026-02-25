import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { randomUUID } from "node:crypto";
import { runAllChecks, buildReport } from "@mapqc/shared";
import type { QaReport } from "@mapqc/shared";
import { loadGeoTiff } from "./geo/loadGeoTiff.js";
import type { RunContext } from "./context.js";

const TIFF_EXTENSIONS = [".tif", ".tiff"];

export async function scanDirectory(ctx: RunContext): Promise<string[]> {
  const { inputDir } = ctx.config;
  ctx.logger.info("Scanning directory", { inputDir });

  const entries = await readdir(inputDir, { withFileTypes: true });
  const tiffFiles = entries
    .filter((e) => e.isFile() && TIFF_EXTENSIONS.some((ext) => e.name.toLowerCase().endsWith(ext)))
    .map((e) => join(inputDir, e.name));

  ctx.logger.info(`Found ${tiffFiles.length} GeoTIFF file(s)`, { count: tiffFiles.length });
  return tiffFiles;
}

export async function processFile(ctx: RunContext, filePath: string): Promise<QaReport | null> {
  const fileName = basename(filePath);
  const fileId = randomUUID();
  const startTime = Date.now();

  ctx.logger.info(`Processing: ${fileName}`, { filePath });

  try {
    const { metadata } = await loadGeoTiff(filePath);
    const results = runAllChecks(metadata);
    const report = buildReport(fileId, fileName, metadata, results, startTime);

    const passed = results.filter((r: { passed: boolean }) => r.passed).length;
    const failed = results.length - passed;
    ctx.logger.info(`Completed: ${fileName}`, { passed, failed, duration: report.duration });

    return report;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.logger.error(`Failed to process: ${fileName}`, { error: message });
    return null;
  }
}
