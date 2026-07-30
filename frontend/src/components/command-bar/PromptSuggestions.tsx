import { Sparkles } from 'lucide-react';

interface PromptSuggestion {
  label: string;
  prompt: string;
  icon: string;
}

const suggestions: PromptSuggestion[] = [
  { label: 'Daily Sales ETL', prompt: 'Build a daily sales ETL from PostgreSQL to Snowflake', icon: '📊' },
  { label: 'Customer 360', prompt: 'Create a customer 360 pipeline from MySQL to BigQuery with data cleaning', icon: '👤' },
  { label: 'Real-Time Fraud', prompt: 'Design a real-time fraud detection pipeline using Kafka and Redis', icon: '🚨' },
  { label: 'IoT Stream', prompt: 'Build an IoT data pipeline from MQTT to S3 with PySpark transformations', icon: '📡' },
  { label: 'API to Warehouse', prompt: 'Create a pipeline that extracts data from REST API and loads to Snowflake', icon: '🔌' },
  { label: 'Data Lake', prompt: 'Design a medallion architecture data lake on AWS with S3 and Athena', icon: '🏗️' },
  { label: 'Schema Migration', prompt: 'Migrate schema from PostgreSQL to Snowflake with dbt transformations', icon: '🔄' },
  { label: 'ML Pipeline', prompt: 'Build a feature engineering pipeline for ML model training', icon: '🧠' },
];

interface PromptSuggestionsProps {
  onSelect: (prompt: string) => void;
  columns?: number;
}

export function PromptSuggestions({ onSelect, columns = 4 }: PromptSuggestionsProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">Quick prompts</span>
      </div>
      <div className={`grid gap-2 sm:grid-cols-2 lg:grid-cols-${columns}`}>
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.prompt)}
            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-left text-xs text-[var(--color-text-secondary)] transition-all hover:border-purple-500/20 hover:bg-purple-500/5 hover:text-[var(--color-text)]"
          >
            <span className="text-base">{s.icon}</span>
            <span className="font-medium">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
