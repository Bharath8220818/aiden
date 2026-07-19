import React from 'react';

interface CanvasControlsProps {
  onFitView: () => void;
  onResetZoom: () => void;
  onExportImage: () => void;
  zoom?: number;
}

const CanvasControls: React.FC<CanvasControlsProps> = ({
  onFitView,
  onResetZoom,
  onExportImage,
  zoom = 1,
}) => {
  return (
    <div className="flex items-center gap-1 bg-white rounded-lg shadow-md border border-gray-200 px-2 py-1.5">
      <button
        onClick={onFitView}
        className="flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        title="Fit View (F)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
          />
        </svg>
      </button>

      <div className="w-px h-5 bg-gray-200" />

      <button
        onClick={onResetZoom}
        className="flex items-center justify-center w-10 h-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        title="Reset Zoom"
      >
        <span className="text-xs font-medium tabular-nums">
          {Math.round(zoom * 100)}%
        </span>
      </button>

      <div className="w-px h-5 bg-gray-200" />

      <button
        onClick={onExportImage}
        className="flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
        title="Export as PNG"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      </button>
    </div>
  );
};

export default CanvasControls;
