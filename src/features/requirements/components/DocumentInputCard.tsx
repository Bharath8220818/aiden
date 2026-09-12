import React from 'react';
import { DocumentPayload } from '../types';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { FileCode, FileSpreadsheet, Check } from 'lucide-react';

export interface DocumentInputCardProps {
  payload: DocumentPayload;
  onChange: (updates: Partial<DocumentPayload>) => void;
}

export const DocumentInputCard: React.FC<DocumentInputCardProps> = ({ payload, onChange }) => {
  const fileTypes = [
    { value: 'ddl', label: 'SQL DDL (.sql)' },
    { value: 'json_schema', label: 'JSON Schema (.json)' },
    { value: 'yaml_spec', label: 'Open Data Contract (.yaml)' },
    { value: 'csv', label: 'CSV Header Sample (.csv)' },
    { value: 'openapi', label: 'OpenAPI / Swagger Spec' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <label className="text-xs font-semibold text-[#F5F7FA] flex items-center gap-2">
          <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          Legacy Schema / Contract Document
        </label>

        <div className="flex items-center gap-2">
          <Badge variant="info" size="sm">
            {payload.parsedFieldsCount} Fields Detected
          </Badge>
          <div className="w-44">
            <Select
              value={payload.fileType}
              onChange={(e) =>
                onChange({ fileType: e.target.value as DocumentPayload['fileType'] })
              }
              options={fileTypes}
              className="py-1 text-xs"
            />
          </div>
        </div>
      </div>

      <textarea
        rows={8}
        value={payload.fileContent}
        onChange={(e) => onChange({ fileContent: e.target.value })}
        placeholder="Paste DDL schema or JSON contract..."
        className="w-full bg-[#0B0D10] text-[#F5F7FA] placeholder-[#6B7280] text-xs font-mono rounded-lg border border-[#242831] p-3.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed resize-y"
        spellCheck={false}
      />
    </div>
  );
};
