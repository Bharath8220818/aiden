import React, { useMemo, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConnections } from '@/features/connections/hooks/useConnections';
import { ConnectionCard } from '@/features/connections/components/ConnectionCard';
import { ProviderGallery } from '@/features/connections/components/ProviderGallery';
import { ConnectionFormModal } from '@/features/connections/components/ConnectionFormModal';
import { ConnectionCategory } from '@/features/connections/types';
import { PermissionGate } from '@/features/auth/components/RouteGuards';
import { cn } from '@/lib/utils';
import { Database, Plus, Cable, Activity } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';

const CATEGORY_FILTERS: { id: ConnectionCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'warehouse', label: 'Warehouses' },
  { id: 'database', label: 'Databases' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'compute', label: 'Compute' },
  { id: 'cloud', label: 'Cloud Storage' },
];

export const ConnectionsPage: React.FC = () => {
  const {
    providers,
    connections,
    stats,
    isLoading,
    isFormOpen,
    editingConnection,
    formProviderId,
    isSaving,
    openCreateForm,
    openEditForm,
    closeForm,
    persistConnection,
    removeConnection,
    testingId,
    runHealthCheck,
  } = useConnections();

  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ConnectionCategory | 'all'>('all');

  const filtered = useMemo(
    () => (categoryFilter === 'all' ? connections : connections.filter((c) => c.category === categoryFilter)),
    [connections, categoryFilter]
  );

  const formProvider = providers.find((p) => p.id === formProviderId) ?? null;

  return (
    <PageContainer
      title="Connection Manager"
      description="Warehouse, database, streaming, and cloud connectors — encrypted credentials, health checks, and usage analytics"
      fullWidth
      breadcrumbs={[
        { label: 'AIDEN' },
        { label: 'Platform' },
        { label: 'Connections' },
      ]}
      actions={
        <PermissionGate
          permission="connections.manage"
          fallback={
            <span className="text-[10px] font-mono text-text-muted border border-border rounded-md px-2.5 py-1.5">
              read-only · ask an admin or lead for changes
            </span>
          }
        >
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsGalleryOpen(true)} className="text-xs">
            New Connection
          </Button>
        </PermissionGate>
      }
    >
      {/* Fleet stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Connections', value: stats.total, icon: <Cable className="w-4 h-4 text-indigo-600" /> },
          { label: 'Connected', value: stats.connected, icon: <Activity className="w-4 h-4 text-emerald-600" /> },
          { label: 'Degraded', value: stats.degraded, icon: <AlertTriangle className="w-4 h-4 text-amber-600" /> },
          { label: 'Disconnected', value: stats.disconnected, icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
        ].map((s) => (
          <div key={s.label} className="p-3.5 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-text-muted">{s.label}</span>
              {s.icon}
            </div>
            <div className="text-2xl font-bold text-text-primary font-mono mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CATEGORY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setCategoryFilter(f.id)}
            className={cn(
              'px-3 py-1.5 text-[11px] font-medium rounded-md border transition-all',
              categoryFilter === f.id
                ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600'
                : 'bg-card border-border text-text-secondary hover:text-text-primary hover:border-border-highlight'
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="text-[10px] text-text-muted font-mono ml-auto">
          {stats.pipelines} pipelines linked
        </span>
      </div>

      {/* Connection grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Database className="w-6 h-6" />}
          title="No connections here yet"
          description="Connect a warehouse, database, or streaming platform to power the SQL Workspace and pipeline generation."
          actionLabel="Add your first connection"
          onAction={() => setIsGalleryOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((connection) => (
            <ConnectionCard
              key={connection.id}
              connection={connection}
              isTesting={testingId === connection.id}
              onEdit={() => openEditForm(connection)}
              onTest={() => runHealthCheck(connection)}
              onDelete={() => removeConnection(connection.id)}
            />
          ))}
        </div>
      )}

      {/* Provider picker */}
      <ProviderGallery
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        providers={providers}
        onSelectProvider={(id) => openCreateForm(id)}
      />

      {/* Create / edit form */}
      <ConnectionFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        provider={formProvider}
        editing={editingConnection}
        isSaving={isSaving}
        onSave={persistConnection}
      />

      {/* Vault notice */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border">
        <Badge variant="ai" size="sm" dot>Vault</Badge>
        <p className="text-[11px] text-text-secondary">
          Secrets are AES-256 encrypted at rest and injected into pipelines at runtime — never rendered back to the UI after save.
        </p>
      </div>
    </PageContainer>
  );
};

export default ConnectionsPage;
