import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { MetricSeries } from '../types';
import { Skeleton } from '@/components/ui/Skeleton';

export interface TelemetryChartsProps {
  series: MetricSeries[];
  isLoading: boolean;
}

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  fontSize: '11px',
  fontFamily: 'monospace',
  color: '#111827',
};

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ series, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      {series.map((s) => {
        const last = s.points[s.points.length - 1];
        const first = s.points[0];
        const delta = first ? Math.round(((last.value - first.value) / first.value) * 1000) / 10 : 0;
        return (
          <div key={s.id} className="p-3.5 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[11px] font-bold text-text-primary">{s.label}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="text-text-primary font-bold">
                  {last.value} {s.unit}
                </span>
                <span className={delta >= 0 ? 'text-amber-600' : 'text-emerald-600'}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
                </span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={s.points} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="t"
                  tick={{ fill: '#9CA3AF', fontSize: 9, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                  interval={8}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 9, fontFamily: 'monospace' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: '#D1D5DB' }} />
                {s.threshold !== undefined && (
                  <ReferenceLine
                    y={s.threshold}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{ value: `SLA ${s.threshold}`, fill: '#F59E0B', fontSize: 9, position: 'insideTopRight' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={s.color}
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 3, fill: s.color }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
};
