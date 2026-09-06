import { Component } from 'react';

// Catches render/lifecycle errors so a bug shows a recoverable screen instead
// of a blank page. Logs to console (picked up by the browser + any RUM) and,
// if window.Sentry is present, reports there too.
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
    if (typeof window !== 'undefined' && window.Sentry?.captureException) {
      window.Sentry.captureException(error, { extra: info });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="text-lg font-semibold text-foreground">
          Something went wrong
        </div>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page hit an unexpected error. Reloading usually fixes it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reload
        </button>
      </div>
    );
  }
}
