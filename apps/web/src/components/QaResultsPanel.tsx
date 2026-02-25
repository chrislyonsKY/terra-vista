import type { QaResult } from "@mapqc/shared";
import { QaSeverity } from "@mapqc/shared";

interface QaResultsPanelProps {
  results: QaResult[];
}

export function QaResultsPanel({ results }: QaResultsPanelProps) {
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 12, color: "#7070a0" }}>
        {passed}/{total} checks passed
      </div>
      <div className="qa-results">
        {results.map((result) => (
          <div key={result.checkId} className="qa-item">
            <div
              className={`qa-badge ${
                result.passed
                  ? "pass"
                  : result.severity === QaSeverity.ERROR
                    ? "fail-error"
                    : "fail-warning"
              }`}
            />
            <span className="qa-message">{result.message}</span>
            <span className="qa-check-id">{result.checkId}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
