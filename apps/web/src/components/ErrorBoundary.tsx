import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            background: "#1a1a2e",
            color: "#e05050",
            fontSize: 14,
            padding: 20,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ marginBottom: 8 }}>WebGL is not available</div>
            <div style={{ color: "#7070a0", fontSize: 12 }}>
              {this.state.error?.message}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
