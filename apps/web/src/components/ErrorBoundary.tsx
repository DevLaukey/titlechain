"use client";
import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <div className="bg-[#0d0d0d] border border-white/8 rounded-lg p-8 max-w-md w-full text-center">
            <div className="text-gold text-4xl font-light mb-4">◈</div>
            <h2 className="text-white text-lg font-semibold mb-3 tracking-wide">
              Something went wrong
            </h2>
            {this.state.error && (
              <p className="text-white/40 text-sm font-mono mb-6 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-gold hover:bg-[#E8C84A] text-black font-semibold rounded-lg transition-colors text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
