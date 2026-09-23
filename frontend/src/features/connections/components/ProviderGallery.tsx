import React from 'react';
import { ConnectionProvider, ConnectionCategory } from '../types';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import {
  Database,
  HardDrive,
  Radio,
  Cpu,
  Cloud,
  Plus,
} from 'lucide-react';

export interface ProviderGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ConnectionProvider[];
  onSelectProvider: (providerId: string) => void;
}

const CATEGORY_ICON: Record<ConnectionCategory, JSX.Element> = {
  warehouse: <HardDrive className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  streaming: <Radio className="w-4 h-4" />,
  compute: <Cpu className="w-4 h-4" />,
  cloud: <Cloud className="w-4 h-4" />,
};

const CATEGORY_ACCENT: Record<ConnectionCategory, string> = {
  warehouse: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/30',
  database: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30',
  streaming: 'text-amber-600 bg-amber-500/10 border-amber-500/30',
  compute: 'text-violet-600 bg-violet-500/10 border-violet-500/30',
  cloud: 'text-blue-600 bg-blue-500/10 border-blue-500/30',
};

const CATEGORY_ORDER: ConnectionCategory[] = ['warehouse', 'database', 'streaming', 'compute', 'cloud'];

const CATEGORY_LABEL: Record<ConnectionCategory, string> = {
  warehouse: 'Warehouses',
  database: 'Operational Databases',
  streaming: 'Streaming',
  compute: 'Compute & Orchestration',
  cloud: 'Cloud Storage',
};

export const ProviderGallery: React.FC<ProviderGalleryProps> = ({
  isOpen,
  onClose,
  providers,
  onSelectProvider,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Connection"
      description="Choose a system to connect — credentials are encrypted and vault-managed."
      maxWidth="2xl"
    >
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        {CATEGORY_ORDER.map((category) => {
          const group = providers.filter((p) => p.category === category);
          if (group.length === 0) return null;
          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn('p-1 rounded-md border', CATEGORY_ACCENT[category])}>
                  {CATEGORY_ICON[category]}
                </span>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  {CATEGORY_LABEL[category]}
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => {
                      onSelectProvider(provider.id);
                      onClose();
                    }}
                    className="text-left p-3 rounded-lg bg-card border border-border hover:border-indigo-500/50 hover:bg-card transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-text-primary">{provider.name}</span>
                      <Plus className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[10px] text-text-secondary leading-snug mb-1.5">{provider.description}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="neutral" size="sm" className="font-mono">{provider.technology}</Badge>
                      {provider.defaultPort && (
                        <Badge variant="neutral" size="sm" className="font-mono">:{provider.defaultPort}</Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};
