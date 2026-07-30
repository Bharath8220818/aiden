import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Code2, Database, Zap, TrendingUp, Search,
  Filter, BookOpen, CheckCircle2,
  ArrowRight, Play
} from 'lucide-react';

const categories = [
  { icon: Database, label: 'SQL', count: '200+', color: 'from-blue-500/20 to-cyan-500/20', textColor: 'text-blue-400' },
  { icon: Code2, label: 'Python', count: '150+', color: 'from-yellow-500/20 to-orange-500/20', textColor: 'text-yellow-400' },
  { icon: Zap, label: 'PySpark', count: '120+', color: 'from-orange-500/20 to-red-500/20', textColor: 'text-orange-400' },
  { icon: TrendingUp, label: 'Window Functions', count: '80+', color: 'from-green-500/20 to-emerald-500/20', textColor: 'text-green-400' },
];

const problems = [
  { id: 1, title: 'High-Engagement Video Filtering', difficulty: 'Medium', company: 'Google', category: 'PySpark', solved: true },
  { id: 2, title: 'Customer Churn Analysis', difficulty: 'Hard', company: 'Amazon', category: 'SQL', solved: false },
  { id: 3, title: 'Sales Data Aggregation', difficulty: 'Easy', company: 'Meta', category: 'SQL', solved: true },
  { id: 4, title: 'Real-Time Fraud Detection', difficulty: 'Hard', company: 'Stripe', category: 'PySpark', solved: false },
  { id: 5, title: 'Clickstream Sessionization', difficulty: 'Medium', company: 'Snowflake', category: 'SQL', solved: false },
  { id: 6, title: 'Customer 360 Data Pipeline', difficulty: 'Hard', company: 'Databricks', category: 'Python', solved: false },
  { id: 7, title: 'Time-Series Anomaly Detection', difficulty: 'Medium', company: 'Azure', category: 'PySpark', solved: true },
  { id: 8, title: 'ETL Data Quality Validation', difficulty: 'Easy', company: 'AWS', category: 'Python', solved: false },
];

const difficultyColors: Record<string, string> = {
  Easy: 'bg-green-500/10 text-green-400 border-green-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Hard: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function CodingProblemsPage() {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filtered = problems.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (difficulty && p.difficulty !== difficulty) return false;
    if (selectedCategory && p.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">💻 Coding Problems</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Practice real-world data engineering problems from top tech companies
        </p>
      </motion.div>

      {/* Search & Filters */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search problems..." className="input pl-9 py-2.5 text-sm" />
        </div>
        {['Easy', 'Medium', 'Hard'].map((d) => (
          <button key={d} onClick={() => setDifficulty(difficulty === d ? null : d)}
            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              difficulty === d
                ? 'border-purple-500/30 bg-purple-500/10 text-purple-400'
                : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-purple-500/20'
            }`}>
            {d}
          </button>
        ))}
        <button className="btn-secondary btn-sm"><Filter className="h-4 w-4" /> More Filters</button>
      </motion.div>

      {/* Category Cards */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat, i) => (
          <motion.button
            key={cat.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => setSelectedCategory(selectedCategory === cat.label ? null : cat.label)}
            className={`glass-card p-4 text-left transition-all ${
              selectedCategory === cat.label ? 'ring-2 ring-purple-500/40' : ''
            }`}
          >
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color}`}>
              <cat.icon className={`h-5 w-5 ${cat.textColor}`} />
            </div>
            <h3 className="font-semibold text-[var(--color-text)]">{cat.label}</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{cat.count} problems</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Problem List */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--color-text)]">
            Showing {filtered.length} problems
          </h2>
          <button className="btn-ghost btn-sm"><BookOpen className="h-4 w-4" /> Track Progress</button>
        </div>

        {filtered.map((problem, i) => (
          <motion.div
            key={problem.id}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
            className="glass-card flex items-center gap-4 p-4 transition-all hover:border-purple-500/20"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              problem.solved ? 'bg-green-500/10' : 'bg-[var(--color-card-hover)]'
            }`}>
              {problem.solved ? (
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              ) : (
                <Play className="h-4 w-4 text-[var(--color-text-muted)]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[var(--color-text)] truncate">{problem.title}</h3>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${difficultyColors[problem.difficulty]}`}>
                  {problem.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[11px] font-medium text-purple-400">{problem.company}</span>
                <span className="text-[11px] text-[var(--color-text-muted)]">{problem.category}</span>
              </div>
            </div>

            <button className="btn-ghost btn-sm shrink-0">
              Solve <ArrowRight className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
