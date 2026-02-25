import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { reportToJson, reportsToJson } from "@mapqc/shared";
import type { QaReport } from "@mapqc/shared";

export async function writeJsonReport(report: QaReport, outputDir: string): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const fileName = `${report.fileName.replace(/\.[^.]+$/, "")}_report.json`;
  const filePath = join(outputDir, fileName);
  await writeFile(filePath, reportToJson(report), "utf-8");
  return filePath;
}

export async function writeSummaryReport(reports: QaReport[], outputDir: string): Promise<string> {
  await mkdir(outputDir, { recursive: true });
  const filePath = join(outputDir, "summary_report.json");
  await writeFile(filePath, reportsToJson(reports), "utf-8");
  return filePath;
}
