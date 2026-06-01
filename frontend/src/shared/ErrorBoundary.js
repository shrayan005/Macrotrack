/**
 * ErrorBoundary
 *
 * React class component that catches unhandled render errors anywhere in its
 * subtree and shows a fallback UI with "Try Again" and "Refresh Page" buttons
 * instead of a blank screen.
 *
 * Props:
 *   children (ReactNode) — the component tree to protect
 *
 * Used in: App.js (wraps the entire application)
 */
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // hasError triggers the fallback UI; error holds the thrown value for debugging
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.error("ErrorBoundary caught:", error, errorInfo);
    }
  }

  // Clear the error state so the subtree attempts to re-render
  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <h2>Something went wrong</h2>
          <p style={{ color: "#666", marginBottom: "20px" }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#4CAF50",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
