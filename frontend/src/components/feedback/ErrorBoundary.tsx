import React from 'react';
import { Button } from '@/components/ui/Button';
import { OctagonAlert, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/** Global render-error containment with recovery actions. */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook point for Sentry / backend error reporting
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-red-500/30 text-center space-y-4">
            <span className="inline-flex p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600">
              <OctagonAlert className="w-7 h-7" />
            </span>
            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-text-primary">Something broke in the workspace</h1>
              <p className="text-xs text-text-secondary leading-relaxed">
                AIDEN hit an unexpected error while rendering. The autonomous agents are unaffected —
                pipelines continue running in the background.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] font-mono text-red-600/80 bg-background border border-border rounded-lg p-3 text-left overflow-x-auto whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="secondary" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={this.handleReset}>
                Try again
              </Button>
              <Button variant="primary" size="sm" leftIcon={<Home className="w-3.5 h-3.5" />} onClick={this.handleReload}>
                Reload workspace
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
