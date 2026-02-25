#!/usr/bin/env node
import { Command } from "commander";
import type { RunConfig } from "@mapqc/shared";
import { createRunContext } from "./context.js";
import { scanDirectory, processFile } from "./scanner.js";
import { writeJsonReport, writeSummaryReport } from "./reporters/jsonReporter.js";
import { writePdfReport, writeSummaryPdf } from "./reporters/pdfReporter.js";

const program = new Command();

program
  .name("mapqc")
  .description("MapQC CLI — batch GeoTIFF quality assurance")
  .version("0.1.0");

program
  .command("scan")
  .description("Scan a directory of GeoTIFF files and run QA checks")
  .requiredOption("-i, --input <dir>", "Input directory containing .tif/.tiff files")
  .option("-o, --output <dir>", "Output directory for reports", "./output")
  .option("-f, --format <format>", "Report format: json, pdf, or both", "json")
  .option("--sidecars <mode>", "Sidecar handling: error, warn, ignore", "warn")
  .option("--json-log", "Output structured JSON logs", false)
  .option("--log-level <level>", "Log level: debug, info, warn, error", "info")
  .action(async (options) => {
    const config: RunConfig = {
      inputDir: options.input,
      outputDir: options.output,
      sidecars: options.sidecars as RunConfig["sidecars"],
    };

    const ctx = createRunContext(config, {
      json: options.jsonLog,
      level: options.logLevel,
    });

    ctx.logger.info("MapQC scan started", { runId: ctx.runId });

    let files: string[];
    try {
      files = await scanDirectory(ctx);
    } catch (err) {
      ctx.logger.error("Failed to scan directory", {
        error: err instanceof Error ? err.message : String(err),
      });
      process.exit(1);
    }

    if (files.length === 0) {
      ctx.logger.warn("No GeoTIFF files found in input directory");
      process.exit(0);
    }

    const reports = [];
    for (const file of files) {
      const report = await processFile(ctx, file);
      if (report) {
        reports.push(report);

        const format = options.format as string;
        try {
          if (format === "json" || format === "both") {
            const path = await writeJsonReport(report, config.outputDir);
            ctx.logger.info(`JSON report written: ${path}`);
          }
          if (format === "pdf" || format === "both") {
            const path = await writePdfReport(report, config.outputDir);
            ctx.logger.info(`PDF report written: ${path}`);
          }
        } catch (err) {
          ctx.logger.error(`Failed to write report for ${report.fileName}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    if (reports.length > 0) {
      const format = options.format as string;
      try {
        if (format === "json" || format === "both") {
          const path = await writeSummaryReport(reports, config.outputDir);
          ctx.logger.info(`Summary JSON report written: ${path}`);
        }
        if (format === "pdf" || format === "both") {
          const path = await writeSummaryPdf(reports, config.outputDir);
          ctx.logger.info(`Summary PDF report written: ${path}`);
        }
      } catch (err) {
        ctx.logger.error("Failed to write summary reports", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const totalPassed = reports.reduce(
      (sum, r) => sum + r.results.filter((res: { passed: boolean }) => res.passed).length,
      0
    );
    const totalChecks = reports.reduce((sum, r) => sum + r.results.length, 0);

    ctx.logger.info("Scan complete", {
      filesProcessed: reports.length,
      totalChecks,
      totalPassed,
      totalFailed: totalChecks - totalPassed,
      elapsed: ctx.elapsed(),
    });
  });

program.parse();
