import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, ChevronDown, ChevronRight,
  Database, Radio, Cpu, HardDrive, Cloud, Container,
  GitBranch, Activity, Shield, Brain, CheckCircle
} from 'lucide-react';

export interface AssetItem {
  id: string;
  name: string;
  service: string;
  category: string;
  icon: string;
  description: string;
  defaultMetrics?: Record<string, string>;
}

interface AssetCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  items: AssetItem[];
}

const ASSET_CATEGORIES: AssetCategory[] = [
  {
    id: 'databases', label: 'DATABASES', icon: <Database size={12} />, color: 'text-blue-400',
    items: [
      { id: 'postgresql', name: 'PostgreSQL', service: 'PostgreSQL', category: 'databases', icon: '🐘', description: 'Relational database' },
      { id: 'mysql', name: 'MySQL', service: 'MySQL', category: 'databases', icon: '🐬', description: 'Relational database' },
      { id: 'mongodb', name: 'MongoDB', service: 'MongoDB', category: 'databases', icon: '🍃', description: 'Document database' },
      { id: 'redis', name: 'Redis', service: 'Redis', category: 'databases', icon: '🔴', description: 'In-memory cache' },
      { id: 'cassandra', name: 'Cassandra', service: 'Apache Cassandra', category: 'databases', icon: '👁️', description: 'Wide-column store' },
      { id: 'oracle', name: 'Oracle', service: 'Oracle DB', category: 'databases', icon: '🔶', description: 'Enterprise RDBMS' },
      { id: 'sqlserver', name: 'SQL Server', service: 'Microsoft SQL Server', category: 'databases', icon: '🔷', description: 'Enterprise RDBMS' },
      { id: 'snowflake', name: 'Snowflake', service: 'Snowflake', category: 'databases', icon: '❄️', description: 'Cloud data warehouse' },
      { id: 'bigquery', name: 'BigQuery', service: 'Google BigQuery', category: 'databases', icon: '🔍', description: 'Serverless data warehouse' },
      { id: 'redshift', name: 'Redshift', service: 'Amazon Redshift', category: 'databases', icon: '📊', description: 'Cloud data warehouse' },
    ],
  },
  {
    id: 'orchestration', label: 'ORCHESTRATION', icon: <GitBranch size={12} />, color: 'text-violet-400',
    items: [
      { id: 'airflow', name: 'Apache Airflow', service: 'Airflow', category: 'orchestration', icon: '🌬️', description: 'Workflow orchestration' },
      { id: 'dagster', name: 'Dagster', service: 'Dagster', category: 'orchestration', icon: '💎', description: 'Data orchestration' },
      { id: 'prefect', name: 'Prefect', service: 'Prefect', category: 'orchestration', icon: '🔵', description: 'Workflow orchestration' },
    ],
  },
  {
    id: 'streaming', label: 'STREAMING', icon: <Radio size={12} />, color: 'text-cyan-400',
    items: [
      { id: 'kafka', name: 'Apache Kafka', service: 'Kafka', category: 'streaming', icon: '📡', description: 'Event streaming platform' },
      { id: 'kafkaconnect', name: 'Kafka Connect', service: 'Kafka Connect', category: 'streaming', icon: '🔗', description: 'Data integration' },
      { id: 'schemaregistry', name: 'Schema Registry', service: 'Confluent Schema Registry', category: 'streaming', icon: '📋', description: 'Schema management' },
      { id: 'flink', name: 'Apache Flink', service: 'Flink', category: 'streaming', icon: '⚡', description: 'Stream processing' },
      { id: 'kinesis', name: 'Kinesis', service: 'Amazon Kinesis', category: 'streaming', icon: '🌊', description: 'Real-time streaming' },
    ],
  },
  {
    id: 'processing', label: 'PROCESSING', icon: <Cpu size={12} />, color: 'text-amber-400',
    items: [
      { id: 'spark', name: 'Apache Spark', service: 'Spark', category: 'processing', icon: '✨', description: 'Distributed computing' },
      { id: 'dbt', name: 'dbt', service: 'dbt', category: 'processing', icon: '🔧', description: 'Data transformation' },
      { id: 'hadoop', name: 'Hadoop', service: 'HDFS / MapReduce', category: 'processing', icon: '🐘', description: 'Big data framework' },
      { id: 'trino', name: 'Trino', service: 'Trino', category: 'processing', icon: '🔺', description: 'Distributed SQL' },
      { id: 'presto', name: 'Presto', service: 'Presto', category: 'processing', icon: '⚡', description: 'Distributed SQL' },
    ],
  },
  {
    id: 'storage', label: 'STORAGE', icon: <HardDrive size={12} />, color: 'text-emerald-400',
    items: [
      { id: 's3', name: 'S3', service: 'Amazon S3', category: 'storage', icon: '🪣', description: 'Object storage' },
      { id: 'datalake', name: 'Data Lake', service: 'Data Lake', category: 'storage', icon: '🏞️', description: 'Centralized storage' },
      { id: 'warehouse', name: 'Data Warehouse', service: 'Data Warehouse', category: 'storage', icon: '🏗️', description: 'Analytical storage' },
      { id: 'lakehouse', name: 'Lakehouse', service: 'Lakehouse', category: 'storage', icon: '🏠', description: 'Hybrid architecture' },
      { id: 'hdfs', name: 'HDFS', service: 'HDFS', category: 'storage', icon: '💾', description: 'Distributed filesystem' },
    ],
  },
  {
    id: 'cloud', label: 'CLOUD', icon: <Cloud size={12} />, color: 'text-orange-400',
    items: [
      { id: 'aws', name: 'AWS', service: 'Amazon Web Services', category: 'cloud', icon: '☁️', description: 'Cloud platform' },
      { id: 'azure', name: 'Azure', service: 'Microsoft Azure', category: 'cloud', icon: '🔷', description: 'Cloud platform' },
      { id: 'gcp', name: 'GCP', service: 'Google Cloud', category: 'cloud', icon: '🌐', description: 'Cloud platform' },
    ],
  },
  {
    id: 'containers', label: 'CONTAINERS', icon: <Container size={12} />, color: 'text-sky-400',
    items: [
      { id: 'docker', name: 'Docker', service: 'Docker', category: 'containers', icon: '🐳', description: 'Container platform' },
      { id: 'kubernetes', name: 'Kubernetes', service: 'Kubernetes', category: 'containers', icon: '☸️', description: 'Container orchestration' },
    ],
  },
  {
    id: 'monitoring', label: 'MONITORING', icon: <Activity size={12} />, color: 'text-indigo-400',
    items: [
      { id: 'prometheus', name: 'Prometheus', service: 'Prometheus', category: 'monitoring', icon: '🔥', description: 'Metrics collection' },
      { id: 'grafana', name: 'Grafana', service: 'Grafana', category: 'monitoring', icon: '📈', description: 'Observability platform' },
      { id: 'datadog', name: 'Datadog', service: 'Datadog', category: 'monitoring', icon: '🐕', description: 'Cloud monitoring' },
      { id: 'opentelemetry', name: 'OpenTelemetry', service: 'OpenTelemetry', category: 'monitoring', icon: '🔭', description: 'Observability framework' },
    ],
  },
  {
    id: 'ai', label: 'AI / ML', icon: <Brain size={12} />, color: 'text-fuchsia-400',
    items: [
      { id: 'llm', name: 'LLM', service: 'Large Language Model', category: 'ai', icon: '🧠', description: 'AI model' },
      { id: 'vectordb', name: 'Vector DB', service: 'Qdrant / Pinecone', category: 'ai', icon: '🔮', description: 'Vector database' },
      { id: 'embedding', name: 'Embedding', service: 'Embedding Service', category: 'ai', icon: '🧬', description: 'Text embeddings' },
      { id: 'rag', name: 'RAG', service: 'RAG Pipeline', category: 'ai', icon: '📚', description: 'Retrieval augmented generation' },
    ],
  },
  {
    id: 'security', label: 'SECURITY', icon: <Shield size={12} />, color: 'text-rose-400',
    items: [
      { id: 'iam', name: 'IAM', service: 'Identity & Access Management', category: 'security', icon: '🔐', description: 'Access control' },
      { id: 'vault', name: 'Vault', service: 'HashiCorp Vault', category: 'security', icon: '🔒', description: 'Secrets management' },
    ],
  },
  {
    id: 'quality', label: 'DATA QUALITY', icon: <CheckCircle size={12} />, color: 'text-lime-400',
    items: [
      { id: 'greatexpectations', name: 'Great Expectations', service: 'Great Expectations', category: 'quality', icon: '✅', description: 'Data validation' },
      { id: 'datacontract', name: 'Data Contract', service: 'Data Contract', category: 'quality', icon: '📄', description: 'Schema contracts' },
    ],
  },
];

interface AssetLibraryPanelProps {
  onAddAsset: (item: AssetItem) => void;
  isCollapsed?: boolean;
}

const AssetLibraryPanel: React.FC<AssetLibraryPanelProps> = ({ onAddAsset, isCollapsed = false }) => {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['databases', 'streaming', 'processing', 'storage'])
  );

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return ASSET_CATEGORIES;
    const q = search.toLowerCase();
    return ASSET_CATEGORIES
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            item.service.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [search]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, item: AssetItem) => {
      e.dataTransfer.setData('application/aiden-asset', JSON.stringify(item));
      e.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  if (isCollapsed) {
    return (
      <div className="w-12 bg-[#0E131D] border-r border-[#1F2937] flex flex-col items-center py-3 gap-2">
        {ASSET_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            title={cat.label}
            className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition ${cat.color}`}
          >
            {cat.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="w-60 bg-[#0E131D] border-r border-[#1F2937] flex flex-col h-full shrink-0">
      {/* Search */}
      <div className="p-3 border-b border-[#1F2937]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search components..."
            className="w-full rounded-lg border border-[#1F2937] bg-[#111827] pl-8 pr-3 py-1.5 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-purple-500/50"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="border-b border-[#1F2937]/50">
            <button
              onClick={() => toggleCategory(cat.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {expandedCategories.has(cat.id) ? (
                <ChevronDown size={10} />
              ) : (
                <ChevronRight size={10} />
              )}
              <span className={cat.color}>{cat.icon}</span>
              {cat.label}
              <span className="ml-auto text-[9px] text-[var(--color-text-muted)] font-normal">{cat.items.length}</span>
            </button>

            {expandedCategories.has(cat.id) && (
              <div className="pb-2 px-2">
                {cat.items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onClick={() => onAddAsset(item)}
                    className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-white/5 transition-all text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
                  >
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium truncate">{item.name}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)] truncate">{item.description}</p>
                    </div>
                    <span className="text-[8px] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                      +
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-[#1F2937] text-center">
        <p className="text-[9px] text-[var(--color-text-muted)]">
          Drag to canvas or click to add
        </p>
      </div>
    </div>
  );
};

export default AssetLibraryPanel;
export { ASSET_CATEGORIES };
