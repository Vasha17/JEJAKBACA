import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<unknown>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<unknown>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('=== BLACKBOXAI ERROR BOUNDARY ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('Info:', errorInfo);
    console.error('Dexie DB ready?', typeof window !== 'undefined' ? (window as any).JejakBacaDB?.ready : 'SSR');
    console.groupEnd();

    // Log to localStorage for debugging
    try {
      localStorage.setItem('error_crash', JSON.stringify({
        time: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        incognito: navigator['vendor'] === 'Google Inc.' && !localStorage.length, // Detect incognito
      }));
    } catch {}

    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12 text-center">
          <div className="max-w-md w-full space-y-6">
            <div className="w-24 h-24 mx-auto bg-destructive/10 rounded-2xl flex items-center justify-center">
              <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Oops! Something broke</h1>
              <p className="text-muted-foreground">
                We caught an error (likely Dexie/IndexedDB blocked). 
                Check Console (F12) for details. Try normal browser mode.
              </p>
              {this.state.error && (
                <details className="text-xs text-muted-foreground bg-secondary/50 p-3 rounded-lg max-h-32 overflow-auto">
                  <summary className="cursor-pointer font-medium mb-1">Error Details</summary>
                  <code>{this.state.error.message}</code>
                  <pre className="mt-2 text-[10px]">{this.state.error.stack}</pre>
                </details>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors flex-1"
              >
                Reload Page
              </button>
              <button
                className="px-6 py-2.5 border border-border bg-background rounded-xl font-semibold hover:bg-muted transition-colors flex-1"
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
              >
                Clear Storage & Retry
              </button>
            </div>
            <div className="text-[11px] text-muted-foreground/60 space-y-1 pt-6 border-t border-border/30">
              <p>F12 → Console for full error log</p>
              <p>Incognito/Private mode blocks IndexedDB (storage privacy).</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

