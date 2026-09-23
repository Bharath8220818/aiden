import { Link, useRouteError } from 'react-router-dom';
import { Bot, TriangleAlert } from 'lucide-react';

/**
 * Router-level error element — a graceful fallback for any route-level render
 * crash (the default React Router "Unexpected Application Error!" screen is
 * a developer-only UI). Routed inside the authenticated shell so the topbar
 * and sidebar chrome stay usable.
 */
export function RouteErrorElement() {
  const error = useRouteError() as Error | undefined;
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex w-12 h-12 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
        <TriangleAlert className="w-6 h-6 text-red-600" />
      </div>
      <div>
        <p className="flex items-center justify-center gap-2 text-lg font-semibold text-text-primary">
          <Bot className="w-5 h-5 text-indigo-600" />
          This workspace hit an unexpected error
        </p>
        <p className="mt-1 max-w-md text-sm text-text-secondary">{message}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          Try again
        </button>
        <Link
          to="/dashboard"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-card border border-border text-text-primary hover:bg-card-hover transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
