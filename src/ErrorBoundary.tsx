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
    console.error('=== JEJAKBACA ERROR BOUNDARY ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    console.error('Info:', errorInfo);
    console.error('Dexie DB ready?', typeof window !== 'undefined' ? (window as any).JejakBacaDB?.ready : 'SSR');

    try {
      localStorage.setItem('error_crash', JSON.stringify({
        time: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        incognito: navigator['vendor'] === 'Google Inc.' && !localStorage.length,
      }));
    } catch {}

    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="max-w-sm w-full space-y-8">

            {/* Big 404 type */}
            <div className="relative select-none">
              <span
                className="text-[10rem] font-black leading-none tracking-tighter text-foreground/5 absolute inset-0 flex items-center justify-center"
                aria-hidden="true"
              >
                404
              </span>
              <div className="relative z-10 flex flex-col items-center gap-4 py-10">
                {/* Broken book / page icon */}
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground">
                  <rect x="8" y="6" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/>
                  <path d="M20 18h12M20 24h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M34 28l6 6M40 28l-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="37" cy="34" r="10" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground/60">Error</p>
              </div>
            </div>

            {/* Copy */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Page not found
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sorry, we can't find the page you're looking for.                
              </p>
            </div>
          </div>
        </div>           
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;