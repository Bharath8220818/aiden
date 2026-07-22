import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Database, ArrowRight, Star, Users } from 'lucide-react';
import { cn } from '../utils/cn';

interface Template {
  id: number;
  name: string;
  description: string;
  source: string;
  destination: string;
  uses: number;
  rating: number;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

const templates: Template[] = [
  {
    id: 1,
    name: 'Daily Sales ETL',
    description: 'Extract sales data from PostgreSQL, transform with dbt, and load into Snowflake for BI reporting.',
    source: 'PostgreSQL',
    destination: 'Snowflake',
    uses: 15,
    rating: 4.8,
    category: 'ETL',
    difficulty: 'Beginner',
  },
  {
    id: 2,
    name: 'Customer 360',
    description: 'Merge customer data from multiple sources (MySQL, Salesforce, HubSpot) into a unified BigQuery warehouse.',
    source: 'MySQL',
    destination: 'BigQuery',
    uses: 8,
    rating: 4.5,
    category: 'ETL',
    difficulty: 'Intermediate',
  },
  {
    id: 3,
    name: 'IoT Stream Processing',
    description: 'Process IoT sensor data from Kafka, apply windowed aggregations, and land results in S3 for analytics.',
    source: 'Kafka',
    destination: 'S3',
    uses: 12,
    rating: 4.7,
    category: 'Streaming',
    difficulty: 'Advanced',
  },
  {
    id: 4,
    name: 'Log Analytics Pipeline',
    description: 'Ship application logs from CloudWatch to Elasticsearch for real-time search and dashboarding.',
    source: 'CloudWatch',
    destination: 'Elasticsearch',
    uses: 20,
    rating: 4.9,
    category: 'Streaming',
    difficulty: 'Beginner',
  },
  {
    id: 5,
    name: 'Data Lake Ingestion',
    description: 'Batch-load CSV/Parquet files from SFTP into S3 data lake with schema inference and partitioning.',
    source: 'SFTP',
    destination: 'S3',
    uses: 6,
    rating: 4.3,
    category: 'ETL',
    difficulty: 'Intermediate',
  },
  {
    id: 6,
    name: 'Real-Time Dashboard',
    description: 'Stream clickstream events from Kafka to ClickHouse for sub-second dashboard queries.',
    source: 'Kafka',
    destination: 'ClickHouse',
    uses: 10,
    rating: 4.6,
    category: 'Streaming',
    difficulty: 'Advanced',
  },
];

const categories = ['All', 'ETL', 'Streaming', 'Analytics', 'Governance'];
const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const difficultyColors: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  Intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  Advanced: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const TemplatesPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');

  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || t.category === category;
    const matchesDifficulty = difficulty === 'All' || t.difficulty === difficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pipeline Templates</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Pre-built templates to get started quickly. Choose one and customize it to your needs.
        </p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          />
        </div>

        {/* Category filter */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>

        {/* Difficulty filter */}
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {difficulties.map((d) => (
            <option key={d} value={d}>{d === 'All' ? 'All Levels' : d}</option>
          ))}
        </select>
      </motion.div>

      {/* Results count */}
      <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
        {filtered.length} template{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Template grid */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { transition: { staggerChildren: 0.05 } },
        }}
        className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filtered.map((template) => (
          <motion.div
            key={template.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
            className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 flex flex-col"
          >
            {/* Category badge */}
            <span className="inline-flex self-start text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 mb-3">
              {template.category}
            </span>

            {/* Title */}
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {template.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed line-clamp-2 flex-1">
              {template.description}
            </p>

            {/* Source → Destination */}
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-400 dark:text-gray-500">
              <Database className="w-3.5 h-3.5" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{template.source}</span>
              <ArrowRight className="w-3 h-3" />
              <span className="font-medium text-gray-600 dark:text-gray-300">{template.destination}</span>
            </div>

            {/* Meta row */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  {template.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {template.uses}
                </span>
              </div>
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', difficultyColors[template.difficulty])}>
                {template.difficulty}
              </span>
            </div>

            {/* Use button */}
            <Link
              to={`/builder?template=${template.id}`}
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              Use Template
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No templates found</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default TemplatesPage;
