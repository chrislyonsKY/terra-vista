import type { QaReport } from "@mapqc/shared";
import { reportToJson } from "@mapqc/shared";

interface ExportButtonProps {
  report: QaReport | null;
}

export function ExportButton({ report }: ExportButtonProps) {
  const handleExport = () => {
    if (!report) return;

    const json = reportToJson(report);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.fileName.replace(/\.(tiff?)/i, "")}_qa_report.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="export-section">
      <button
        className="btn btn-primary"
        onClick={handleExport}
        disabled={!report}
      >
        Export JSON Report
      </button>
    </div>
  );
}
