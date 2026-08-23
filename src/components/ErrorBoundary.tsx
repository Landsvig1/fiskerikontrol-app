"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { TranslateFn } from "@/lib/i18n";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  t: TranslateFn;
  /**
   * Run before the boundary re-renders its children. The usual thing to clear here is the
   * selection, since a node the view could not render is the most likely cause of the throw
   * and retrying without clearing it would fail again immediately.
   */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Contains a throw to the one view it wraps.
 *
 * The app is a single client page with tab state rather than a route per view, so
 * Next.js error.tsx never sees these errors: a throw inside any view unmounts the whole
 * tree and blanks the page, header and tab bar included. Every view renders sections
 * parsed from arbitrary user PDFs, so a malformed document is a realistic input.
 *
 * React 19 still has no hook form of componentDidCatch, so this is a class.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("View error boundary caught:", error, info.componentStack);
  }

  private handleReset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { t } = this.props;
    return (
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#fafaf9] text-slate-900 w-full min-w-0">
        <div
          role="alert"
          className="max-w-2xl bg-white border border-amber-300 rounded-2xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-bold text-slate-900 break-words">
                {t("viewErrorTitle")}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed break-words">
                {t("viewErrorBody")}
              </p>
            </div>
          </div>

          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-medium text-slate-600">
              {t("viewErrorDetails")}
            </summary>
            <pre className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 overflow-x-auto whitespace-pre-wrap break-words text-[11px] text-slate-700">
              {error.message}
            </pre>
          </details>

          <button
            type="button"
            onClick={this.handleReset}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            {t("viewErrorRetry")}
          </button>
        </div>
      </div>
    );
  }
}
