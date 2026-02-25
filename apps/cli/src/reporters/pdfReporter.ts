import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { QaReport } from "@mapqc/shared";

export async function writePdfReport(report: QaReport, outputDir: string): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  let y = height - 50;
  const leftMargin = 50;
  const lineHeight = 16;

  const drawText = (text: string, options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }) => {
    const size = options?.size ?? 10;
    const selectedFont = options?.bold ? boldFont : font;
    const color = options?.color ?? rgb(0, 0, 0);
    page.drawText(text, { x: leftMargin, y, size, font: selectedFont, color });
    y -= lineHeight;
  };

  drawText("MapQC Report", { bold: true, size: 18 });
  y -= 10;

  drawText(`File: ${report.fileName}`, { bold: true, size: 12 });
  drawText(`ID: ${report.fileId}`, { size: 9, color: rgb(0.4, 0.4, 0.4) });
  drawText(`Timestamp: ${report.timestamp}`);
  drawText(`Duration: ${report.duration}ms`);
  y -= 10;

  drawText("Metadata", { bold: true, size: 12 });
  drawText(`Dimensions: ${report.metadata.width} x ${report.metadata.height}`);
  drawText(`Bands: ${report.metadata.bandCount}`);
  drawText(`Bits per sample: ${report.metadata.bitsPerSample.join(", ")}`);
  drawText(`CRS: ${report.metadata.crs ?? "Not defined"}`);
  drawText(`NoData: ${report.metadata.noDataValue ?? "Not defined"}`);
  drawText(`Pixel size: ${report.metadata.pixelSize.x.toFixed(4)} x ${report.metadata.pixelSize.y.toFixed(4)}`);
  const ext = report.metadata.extent;
  drawText(`Extent: [${ext.minX.toFixed(2)}, ${ext.minY.toFixed(2)}, ${ext.maxX.toFixed(2)}, ${ext.maxY.toFixed(2)}]`);
  y -= 10;

  drawText("QA Results", { bold: true, size: 12 });
  y -= 5;

  for (const result of report.results) {
    const status = result.passed ? "PASS" : "FAIL";
    const color = result.passed ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
    drawText(`[${status}] ${result.checkId}: ${result.message}`, { color });
  }

  y -= 15;
  const passed = report.results.filter((r: { passed: boolean }) => r.passed).length;
  const total = report.results.length;
  drawText(`Summary: ${passed}/${total} checks passed`, { bold: true });

  const pdfBytes = await pdfDoc.save();
  const fileName = `${report.fileName.replace(/\.[^.]+$/, "")}_report.pdf`;
  const filePath = join(outputDir, fileName);
  await writeFile(filePath, pdfBytes);
  return filePath;
}

export async function writeSummaryPdf(reports: QaReport[], outputDir: string): Promise<string> {
  await mkdir(outputDir, { recursive: true });

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([612, 792]);
  const { height } = page.getSize();
  let y = height - 50;
  const leftMargin = 50;
  const lineHeight = 16;

  const drawText = (text: string, options?: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> }) => {
    const size = options?.size ?? 10;
    const selectedFont = options?.bold ? boldFont : font;
    const color = options?.color ?? rgb(0, 0, 0);
    page.drawText(text, { x: leftMargin, y, size, font: selectedFont, color });
    y -= lineHeight;
  };

  drawText("MapQC Batch Summary", { bold: true, size: 18 });
  y -= 10;
  drawText(`Total files: ${reports.length}`, { size: 12 });
  y -= 10;

  for (const report of reports) {
    const passed = report.results.filter((r: { passed: boolean }) => r.passed).length;
    const total = report.results.length;
    const allPassed = passed === total;
    const color = allPassed ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
    drawText(`${report.fileName}: ${passed}/${total} passed (${report.duration}ms)`, { color });

    if (y < 50) break;
  }

  const pdfBytes = await pdfDoc.save();
  const filePath = join(outputDir, "summary_report.pdf");
  await writeFile(filePath, pdfBytes);
  return filePath;
}
