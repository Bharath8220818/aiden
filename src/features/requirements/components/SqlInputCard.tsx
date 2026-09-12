import React from 'react';
import { SqlPayload } from '../types';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Terminal, Database, ArrowRight, Check } from 'lucide-react';

export interface SqlInputCardProps {
  payload: SqlPayload;
  onChange: (updates: Partial<SqlPayload>) => void;
}

export const SqlInputCard: React.FC<SqlInputCardProps> = ({ payload, onChange }) => {
  const dialects = [
    { value: 'postgresql', label: 'PostgreSQL' },
    { value: 'snowflake', label: 'Snowflake SQL' },
    { value: 'bigquery', label: 'Google BigQuery' },
    { value: 'spark_sql', label: 'Apache Spark SQL' },
    { value: 'mysql', label: 'MySQL / MariaDB' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-semibold text-[#F5F7FA] flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          SQL Transformation or Source Query
        </label>

        <div className="w-44">
          <Select
            value={payload.dialect}
            onChange={(e) =>
              onChange({ dialect: e.target.value as SqlPayload['dialect'] })
            }
            options={dialects}
            className="py-1 text-xs"
          />
        </div>
      </div>

      <div className="relative">
        <textarea
          rows={8}
          value={payload.sqlQuery}
          onChange={(e) => onChange({ sqlQuery: e.target.value })}
          placeholder="PASTE SELECT / CREATE TABLE / VIEW SQL here..."
          className="w-full bg-[#0B0D10] text-[#F5F7FA] placeholder-[#6B7280] text-xs font-mono rounded-lg border border-[#242831] p-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y"
          spellCheck={false}
        />
      </div>

      {/* Inferred Entities Bar */}
      <div className="p-3 rounded-lg bg-[#0F1115] border border-[#242831] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase text-[#6B7280] tracking-wider block">
            Inferred Source Tables ({payload.inferredSources.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {payload.inferredSources.map((source, i) => (
              <Badge key={i} variant="info" size="sm" className="font-mono">
                <Database className="w-3 h-3 mr-1" />
                {source}
              </Badge>
            ))}
          </div>
        </div>

        {payload.inferredTarget && (
          <div className="space-y-1 sm:text-right">
            <span className="text-[10px] font-bold uppercase text-[#6B7280] tracking-wider block">
              Inferred Target Sink
            </span>
            <Badge variant="ai" size="sm" className="font-mono">
              <ArrowRight className="w-3 h-3 mr-1" />
              {payload.inferredTarget}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};
