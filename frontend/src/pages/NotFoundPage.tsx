import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Compass, Home, ArrowLeft, Bot } from 'lucide-react';

/** 404 surface for unmatched routes (replaces the silent overview redirect). */
export const NotFoundPage: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 rounded-2xl bg-card border border-border text-center space-y-4">
        <span className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600">
          <Compass className="w-7 h-7" />
        </span>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-text-primary">Page not found</h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            No route matches <span className="font-mono text-indigo-600">{location.pathname}</span>. The page may
            have moved, or you may not have access to it.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link to="/">
            <Button variant="primary" size="sm" leftIcon={<Home className="w-3.5 h-3.5" />}>
              Overview
            </Button>
          </Link>
          <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => window.history.back()}>
            Go back
          </Button>
        </div>
        <p className="text-[10px] font-mono text-text-muted pt-2 flex items-center justify-center gap-1.5">
          <Bot className="w-3 h-3" />
          HTTP 404 · AIDEN router
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
