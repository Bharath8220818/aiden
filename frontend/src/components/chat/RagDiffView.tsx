import React from 'react';
import { GitBranch, ArrowRight, Database } from 'lucide-react';
import type { RagSearchResult } from '../../types/pipeline';

interface RagDiffViewProps {
  matchedPipeline: RagSearchResult;
  onUseMatch: () => void;
  onDismiss: () => void;
}

const RagDiffView: React.FC<RagDiffViewProps> = ({
  matchedPipeline,
  onUseMatch,
  onDismiss,
}) => {
  const parsed = matchedPipeline.parsed || {};
  const matchName = parsed.name || 'Unknown';
  const matchSource = parsed.source_type || '?';
  const matchDest = parsed.destination_type || '?';
  const matchSchedule = parsed.schedule || 'manual';
  const matchTransforms: string[] = parsed.transformations || [];
  const scheduleLabel =
    matchSchedule === '0 * * * *'
      ? 'Hourly'
      : matchSchedule === '0 6 * * *'
      ? 'Daily'
      : matchSchedule === '0 6 * * 0'
      ? 'Weekly'
      : matchSchedule;

  return (
    <div className="rounded-xl border border-purple-100 bg-purple-50 p-4 shadow-sm dark:border-purple-900/30 dark:bg-purple-950/20 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/50">
            <GitBranch size={14} />
          </div>
          <div>
            <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
              Similar pipeline found
            </p>
            <p className="text-[11px] text-purple-600 dark:text-purple-400">
              {Math.round(matchedPipeline.score * 100)}% semantic match — "{matchedPipeline.query}"
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-purple-400 hover:bg-purple-100 hover:text-purple-600 dark:hover:bg-purple-900/30"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Config Card */}
      <div className="rounded-lg border border-purple-200 bg-white p-3 dark:border-purple-800 dark:bg-gray-900">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Matched pipeline config: {matchName}
        </p>

        {/* Field rows */}
        <div className="space-y-1.5">
          {/* Source */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500 w-20">Source</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="rounded bg-purple-50 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {matchSource}
              </span>
            </div>
          </div>

          {/* Destination */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500 w-20">Destination</span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="rounded bg-purple-50 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
                {matchDest}
              </span>
            </div>
          </div>

          {/* Route arrow */}
          <div className="flex items-center justify-center gap-1 py-1">
            <Database size={12} className="text-gray-400" />
            <span className="text-[10px] font-mono text-gray-400">{matchSource}</span>
            <ArrowRight size={10} className="text-purple-400" />
            <span className="text-[10px] font-mono text-gray-400">{matchDest}</span>
          </div>

          {/* Schedule */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500 w-20">Schedule</span>
            <span className="text-xs text-gray-700 dark:text-gray-300">{scheduleLabel}</span>
          </div>

          {/* Transformations */}
          {matchTransforms.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500 w-20">Transforms</span>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {matchTransforms.join(', ')}
              </span>
            </div>
          )}

          {/* Data quality rules */}
          {parsed.data_quality_rules && parsed.data_quality_rules.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-gray-500 w-20">Quality</span>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {parsed.data_quality_rules.join(', ')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onUseMatch}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-purple-700 active:scale-95"
        >
          <GitBranch size={12} />
          Use this as template
        </button>
        <button
          onClick={onDismiss}
          className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs font-medium text-purple-700 shadow-sm transition-all hover:bg-purple-50 active:scale-95 dark:border-purple-800 dark:bg-gray-900 dark:text-purple-300"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default RagDiffView;
