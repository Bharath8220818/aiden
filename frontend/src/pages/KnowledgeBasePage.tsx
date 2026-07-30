import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Trash2, Brain, Sparkles,
  AlertCircle, ChevronDown, ChevronUp,
  Star, Clock, Database, RefreshCw
} from 'lucide-react';
import { pipelineApi } from '../api/pipelines';
import type { RagSearchResult } from '../types/pipeline';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const scoreColor = (score: number) => {
  if (score >= 0.8) return 'text-green-400';
  if (score >= 0.6) return 'text-amber-400';
  return 'text-red-400';
};

const scoreBg = (score: number) => {
  if (score >= 0.8) return 'bg-green-500/10 border-green-500/20';
  if (score >= 0.6) return 'bg-amber-500/10 border-amber-500/20';
  return 'bg-red-500/10 border-red-500/20';
};

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RagSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsBackend, setNeedsBackend] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setNeedsBackend(false);
    try {
      const response = await pipelineApi.ragSearch(query, 10);
      setResults(response.results || []);
      setSearched(true);
      if ((response.results || []).length === 0) {
        setNeedsBackend(true);
      }
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.code === 'ERR_NETWORK') {
        setNeedsBackend(true);
      }
      setError(err?.response?.data?.detail || err?.message || 'Search failed');
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleDelete = useCallback(async (pipelineId: number | null, index: number) => {
    if (!pipelineId) return;
    try {
      await pipelineApi.delete(pipelineId);
      setResults(prev => prev.filter((_, i) => i !== index));
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Delete failed');
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 shadow-lg shadow-purple-500/30">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Knowledge Base
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Search past pipeline intents stored in RAG memory — find similar pipelines, review configurations, and manage your knowledge base.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search past pipeline intents — e.g., 'daily sales ETL from PostgreSQL'..."
            className="w-full bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl pl-12 pr-36 py-4 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-purple-500 dark:focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all shadow-sm"
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1.5">
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white text-sm font-medium transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Search
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 pl-4">
          Powered by semantic similarity search (384-dim MiniLM embeddings)
        </p>
      </motion.div>

      {/* Backend unavailable notice */}
      {needsBackend && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">RAG backend not available</p>
              <p className="mt-1 text-xs text-amber-400/70">
                The RAG search endpoint requires the backend server running with the RAG memory module initialized.
                Start the backend with <code className="px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[11px]">uvicorn app.main:app --reload --port 8000</code>
                and ensure at least one pipeline has been created via the from-prompt endpoint.
                Demo data has been seeded below for development purposes.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && !needsBackend && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Demo data (shown on initial load or when backend is unavailable) */}
      {(!searched || needsBackend) && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4" />
              Recent Intents (Demo Data)
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">6 entries</span>
          </div>
          <div className="space-y-3">
            {demoIntents.map((intent, i) => (
              <DemoIntentCard key={i} intent={intent} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Search results */}
      {searched && results.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Search Results
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-3">
            {results.map((result, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="group relative bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-purple-500/30 hover:shadow-md hover:shadow-purple-500/5 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${scoreBg(result.score)} ${scoreColor(result.score)}`}>
                        <Star className="w-3 h-3 fill-current" />
                        {(result.score * 100).toFixed(0)}% match
                      </span>
                      {result.pipeline_id && (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          Pipeline #{result.pipeline_id}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">
                      "{result.query}"
                    </p>
                    {result.parsed && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {result.parsed.source_type && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[11px]">
                            <Database className="w-3 h-3" />
                            {result.parsed.source_type}
                          </span>
                        )}
                        {result.parsed.destination_type && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[11px]">
                            <Database className="w-3 h-3" />
                            {result.parsed.destination_type}
                          </span>
                        )}
                        {result.parsed.schedule && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[11px]">
                            <Clock className="w-3 h-3" />
                            {result.parsed.schedule}
                          </span>
                        )}
                        {result.parsed.transformations?.length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-400 dark:text-gray-500 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                              {result.parsed.transformations.length} transformation{result.parsed.transformations.length !== 1 ? 's' : ''}
                            </summary>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {result.parsed.transformations.map((t: string, ti: number) => (
                                <span key={ti} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {result.pipeline_id && (
                      <button
                        onClick={() => handleDelete(result.pipeline_id, i)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete from knowledge base"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {searched && results.length === 0 && !needsBackend && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
            <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No intents found for "<span className="font-medium text-gray-700 dark:text-gray-300">{query}</span>"
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Try a different search term or create a pipeline first to populate the knowledge base.
          </p>
        </motion.div>
      )}

      {/* No search yet — shown only when user started typing but hasn't searched yet */}
      {!searched && !needsBackend && query && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center py-8"
        >
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Press <kbd className="px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-[11px]">Enter</kbd> or click <span className="text-purple-400 font-medium">Search</span> to find similar intents
          </p>
        </motion.div>
      )}
    </div>
  );
}

/* ── Demo Intent Card (shown when backend is down) ── */

interface DemoIntent {
  query: string;
  source: string;
  destination: string;
  schedule: string;
  transformations: string[];
  score: number;
}

const demoIntents: DemoIntent[] = [
  {
    query: 'Build a daily sales ETL from PostgreSQL to Snowflake with data cleaning and aggregation',
    source: 'postgres',
    destination: 'snowflake',
    schedule: '0 6 * * *',
    transformations: ['clean', 'aggregate', 'validate'],
    score: 0.95,
  },
  {
    query: 'Load customer data from MySQL to BigQuery hourly for real-time analytics',
    source: 'mysql',
    destination: 'bigquery',
    schedule: '0 * * * *',
    transformations: ['clean', 'enrich', 'filter'],
    score: 0.88,
  },
  {
    query: 'Stream Kafka events to Snowflake with deduplication and enrichment',
    source: 'kafka',
    destination: 'snowflake',
    schedule: 'continuous',
    transformations: ['deduplicate', 'enrich', 'validate'],
    score: 0.82,
  },
  {
    query: 'Aggregate web analytics from S3 to Redshift weekly with partitioning',
    source: 's3',
    destination: 'redshift',
    schedule: '0 0 * * 0',
    transformations: ['aggregate', 'partition', 'compress'],
    score: 0.76,
  },
  {
    query: 'Clean and transform API data to PostgreSQL with schema validation',
    source: 'api',
    destination: 'postgres',
    schedule: '0 */4 * * *',
    transformations: ['clean', 'validate', 'normalize'],
    score: 0.71,
  },
  {
    query: 'Move stuff from one place to another with basic filtering',
    source: 'unknown',
    destination: 'unknown',
    schedule: '0 6 * * *',
    transformations: ['filter'],
    score: 0.45,
  },
];

function DemoIntentCard({ intent }: { intent: DemoIntent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={itemVariants}
      className="bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 rounded-xl hover:border-purple-500/20 transition-all"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${scoreBg(intent.score)} ${scoreColor(intent.score)}`}>
              <Star className="w-3 h-3 fill-current" />
              {(intent.score * 100).toFixed(0)}% match
            </span>
          </div>
          <p className="text-sm text-gray-900 dark:text-white line-clamp-1 pr-4">
            "{intent.query}"
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="overflow-hidden"
        >
          <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700/50 pt-3">
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[11px]">
                <Database className="w-3 h-3" />
                {intent.source}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[11px]">
                <Database className="w-3 h-3" />
                {intent.destination}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[11px]">
                <Clock className="w-3 h-3" />
                {intent.schedule}
              </span>
            </div>
            {intent.transformations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {intent.transformations.map((t, ti) => (
                  <span key={ti} className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
