import React, { useMemo, useState } from 'react';
import { DatabaseConnection } from '../types';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  Database,
  ChevronRight,
  Folder,
  Table2,
  KeyRound,
  Link2,
  ShieldAlert,
  Hash,
  Search,
  Copy,
  Check,
} from 'lucide-react';

export interface SchemaExplorerProps {
  databases: DatabaseConnection[];
  activeDatabaseId: string | null;
  onSelectDatabase: (id: string) => void;
  onInsertTableName: (qualified: string) => void;
}

const FLAG_ICON: Record<string, JSX.Element | null> = {
  pk: <KeyRound className="w-3 h-3 text-amber-600" />,
  fk: <Link2 className="w-3 h-3 text-cyan-600" />,
  pii: <ShieldAlert className="w-3 h-3 text-red-600" />,
  indexed: <Hash className="w-3 h-3 text-indigo-600" />,
  nullable: null,
};

const ENV_DOT = {
  production: 'bg-red-400',
  staging: 'bg-amber-400',
  development: 'bg-emerald-400',
};

export const SchemaExplorer: React.FC<SchemaExplorerProps> = ({
  databases,
  activeDatabaseId,
  onSelectDatabase,
  onInsertTableName,
}) => {
  const [search, setSearch] = useState('');
  const [openDatabases, setOpenDatabases] = useState<Set<string>>(
    () => new Set(databases.slice(0, 1).map((d) => d.id))
  );
  const [openSchemas, setOpenSchemas] = useState<Set<string>>(new Set());
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return databases;
    const q = search.toLowerCase();
    return databases
      .map((db) => ({
        ...db,
        schemas: db.schemas
          .map((schema) => ({
            ...schema,
            tables: schema.tables.filter(
              (t) =>
                t.name.toLowerCase().includes(q) ||
                t.columns.some((c) => c.name.toLowerCase().includes(q))
            ),
          }))
          .filter((s) => s.tables.length > 0),
      }))
      .filter((db) => db.schemas.length > 0);
  }, [databases, search]);

  const copyTableName = (qualified: string) => {
    navigator.clipboard.writeText(qualified);
    setCopied(qualified);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tables & columns…"
            className="w-full bg-card text-text-primary placeholder-[#9CA3AF] text-[11px] rounded-md border border-border pl-8 pr-2.5 py-1.5 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/80"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {filtered.map((db) => {
          const dbOpen = openDatabases.has(db.id);
          return (
            <div key={db.id}>
              <button
                onClick={() => {
                  toggle(openDatabases, db.id, setOpenDatabases);
                  onSelectDatabase(db.id);
                }}
                className={cn(
                  'w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors',
                  db.id === activeDatabaseId
                    ? 'bg-indigo-500/15 text-indigo-600'
                    : 'text-text-primary hover:bg-card-hover'
                )}
              >
                <ChevronRight className={cn('w-3 h-3 transition-transform', dbOpen && 'rotate-90')} />
                <Database className="w-3.5 h-3.5 text-text-secondary" />
                <span className="truncate flex-1 text-left">{db.name}</span>
                <span className={cn('w-1.5 h-1.5 rounded-full', ENV_DOT[db.environment])} />
              </button>

              {dbOpen &&
                db.schemas.map((schema) => {
                  const schemaKey = `${db.id}.${schema.name}`;
                  const schemaOpen = openSchemas.has(schemaKey);
                  return (
                    <div key={schemaKey}>
                      <button
                        onClick={() => toggle(openSchemas, schemaKey, setOpenSchemas)}
                        className="w-full flex items-center gap-1.5 pl-6 pr-2 py-1 rounded-md text-[11px] text-text-secondary hover:bg-card-hover hover:text-text-primary transition-colors"
                      >
                        <ChevronRight className={cn('w-3 h-3 transition-transform', schemaOpen && 'rotate-90')} />
                        <Folder className="w-3 h-3" />
                        <span className="truncate">{schema.name}</span>
                        <span className="text-[9px] text-text-muted ml-auto">{schema.tables.length}</span>
                      </button>

                      {schemaOpen &&
                        schema.tables.map((table) => {
                          const tableKey = `${schemaKey}.${table.name}`;
                          const isOpen = expandedTable === tableKey;
                          const qualified = `${db.technology.includes('Snowflake') ? 'ANALYTICS_PROD' : db.name.split('—')[0].trim()}.${schema.name}.${table.name}`;
                          return (
                            <div key={tableKey}>
                              <div
                                className={cn(
                                  'group flex items-center gap-1 pl-10 pr-1.5 py-1 rounded-md cursor-pointer transition-colors',
                                  isOpen ? 'bg-card-active' : 'hover:bg-card-hover'
                                )}
                                onClick={() => setExpandedTable(isOpen ? null : tableKey)}
                              >
                                <Table2 className="w-3 h-3 text-text-muted shrink-0" />
                                <span className="text-[11px] text-text-primary truncate flex-1">{table.name}</span>
                                <span className="text-[9px] text-text-muted font-mono hidden group-hover:inline">
                                  {table.rowEstimate}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyTableName(qualified);
                                  }}
                                  className="p-0.5 rounded text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-all"
                                  title="Copy qualified name"
                                >
                                  {copied === qualified ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInsertTableName(qualified);
                                  }}
                                  className="p-0.5 rounded text-text-muted hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Insert into editor"
                                >
                                  <ChevronRight className="w-3 h-3 rotate-180" />
                                </button>
                              </div>

                              {isOpen && (
                                <div className="pl-12 pr-2 pb-2 space-y-0.5">
                                  {table.columns.map((col) => (
                                    <div key={col.name} className="flex items-center gap-1.5 text-[10px] py-0.5">
                                      <span className="flex items-center gap-0.5 w-10 shrink-0">
                                        {col.flags.map((f) => FLAG_ICON[f]).filter(Boolean)}
                                      </span>
                                      <span className="text-text-primary font-mono truncate">{col.name}</span>
                                      <span className="text-text-muted font-mono truncate ml-auto">{col.dataType}</span>
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <Badge variant="neutral" size="sm">{table.rowEstimate}</Badge>
                                    <Badge variant="neutral" size="sm">{table.sizeOnDisk}</Badge>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  );
                })}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-[11px] text-text-muted text-center py-6 px-4">
            No tables match “{search}”.
          </p>
        )}
      </div>
    </div>
  );
};
