'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ListFilter, ShieldAlert } from 'lucide-react';

export interface MapErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onReset?: () => void;
  onSwitchToList?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary specifically engineered for WebGL & MapLibre map failures.
 * Traps runtime WebGL exceptions, style parsing crashes, or corrupted tile errors,
 * ensuring the entire application shell remains functional with graceful recovery options.
 */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[MapErrorBoundary] MapLibre/WebGL component crashed:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.state.error ? this.props.fallback(this.state.error, this.handleReset) : null;
      }
      if (this.props.fallback) {
        return this.props.fallback as ReactNode;
      }

      const errorMessage = this.state.error?.message || 'Nieznany błąd silnika mapy WebGL';
      const isWebGLError =
        /webgl|context|gpu|shader|program|canvas/i.test(errorMessage) ||
        /failed to initialize webgl/i.test(errorMessage);

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="relative w-full h-full min-h-[380px] flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 select-none overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 40%, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
          }}
        >
          {/* Subtle grid background pattern */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />

          <div className="relative z-10 max-w-md w-full flex flex-col items-center text-center space-y-4 bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              {isWebGLError ? (
                <ShieldAlert className="w-7 h-7" />
              ) : (
                <AlertTriangle className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                {isWebGLError ? 'Problem z akceleratorem WebGL' : 'Problem z wyświetlaniem mapy'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isWebGLError
                  ? 'Karta graficzna lub przeglądarka zresetowała kontekst 3D WebGL. Możesz spróbować odświeżyć mapę lub przejść do widoku listy.'
                  : 'Wystąpił nieoczekiwany błąd podczas renderowania komponentu mapy.'}
              </p>
            </div>

            {/* Error detail accordion for developers */}
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="w-full text-left bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 max-h-24 overflow-y-auto">
                <p className="text-[10px] font-mono text-rose-400 break-all leading-normal">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 active:scale-95 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Spróbuj ponownie</span>
              </button>

              {this.props.onSwitchToList && (
                <button
                  type="button"
                  onClick={this.props.onSwitchToList}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 active:scale-95 transition-all"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Widok listy</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
