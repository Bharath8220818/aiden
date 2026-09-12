import React from 'react';
import { ContractColumn } from '../types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Key, Link2, ShieldCheck, ShieldAlert } from 'lucide-react';

export interface ContractSchemaTableProps {
  columns: ContractColumn[];
}

export const ContractSchemaTable: React.FC<ContractSchemaTableProps> = ({ columns }) => {
  const getPiiBadge = (classification?: ContractColumn['piiClassification']) => {
    switch (classification) {
      case 'PII':
        return (
          <Badge variant="error" size="sm" dot>
            PII Masked
          </Badge>
        );
      case 'Confidential':
        return <Badge variant="warning" size="sm">Confidential</Badge>;
      case 'Internal':
        return <Badge variant="info" size="sm">Internal</Badge>;
      case 'Public':
        return <Badge variant="neutral" size="sm">Public</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table className="border border-[#242831]">
        <TableHeader>
          <TableRow className="border-b border-[#242831]">
            <TableHead>Field / Column</TableHead>
            <TableHead>Data Type</TableHead>
            <TableHead>Nullable</TableHead>
            <TableHead>Classification</TableHead>
            <TableHead>Description & Validation Rule</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((col) => (
            <TableRow key={col.id} className="hover:bg-[#181B22]/70">
              <TableCell className="font-mono text-xs font-semibold text-[#F5F7FA]">
                <div className="flex items-center gap-1.5">
                  {col.isPrimaryKey && (
                    <span title="Primary Key" className="text-amber-400">
                      <Key className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {col.isForeignKey && (
                    <span title="Foreign Key" className="text-indigo-400">
                      <Link2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <span>{col.name}</span>
                </div>
              </TableCell>

              <TableCell className="font-mono text-xs text-cyan-300">
                {col.dataType}
              </TableCell>

              <TableCell className="text-xs">
                {col.nullable ? (
                  <span className="text-[#9CA3AF]">NULL</span>
                ) : (
                  <span className="text-emerald-400 font-semibold font-mono">NOT NULL</span>
                )}
              </TableCell>

              <TableCell>
                {getPiiBadge(col.piiClassification)}
              </TableCell>

              <TableCell className="text-xs text-[#9CA3AF] space-y-0.5 max-w-sm">
                <p className="text-[#F5F7FA]">{col.description}</p>
                {col.businessRule && (
                  <p className="font-mono text-[10px] text-indigo-300">
                    Rule: {col.businessRule}
                  </p>
                )}
                {col.maskingPolicy && (
                  <p className="font-mono text-[10px] text-red-300">
                    Mask: {col.maskingPolicy}
                  </p>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
