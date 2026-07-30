import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Database, ArrowRight, Search, Star, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const caseStudies = [
  { id: 1, title: 'E-Commerce Sales Star Schema', difficulty: 'Beginner', category: 'Star Schema', tables: 4, duration: '20 min', rating: 4.8 },
  { id: 2, title: 'Healthcare Patient Data Vault', difficulty: 'Advanced', category: 'Data Vault', tables: 7, duration: '45 min', rating: 4.6 },
  { id: 3, title: 'Financial Transactions Snowflake', difficulty: 'Intermediate', category: 'Snowflake', tables: 5, duration: '30 min', rating: 4.7 },
  { id: 4, title: 'Retail Inventory 3NF Model', difficulty: 'Intermediate', category: '3NF', tables: 6, duration: '35 min', rating: 4.5 },
  { id: 5, title: 'Social Media Graph Schema', difficulty: 'Advanced', category: 'Graph', tables: 3, duration: '40 min', rating: 4.4 },
  { id: 6, title: 'IoT Sensor Time-Series', difficulty: 'Beginner', category: 'Time-Series', tables: 3, duration: '15 min', rating: 4.9 },
];

const difficultyColors: Record<string, string> = {
  Beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
  Intermediate: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Advanced: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function DataModelingPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">🗄️ Data Modeling</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          46+ case studies to master data modeling — from star schemas to data vaults
        </p>
      </motion.div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search case studies..." className="input pl-9 py-2 text-sm" />
        </div>
        <Link to="/schema-designer" className="btn-primary btn-sm"><Database className="h-4 w-4" /> Open Schema Designer</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {caseStudies.filter(c => c.title.toLowerCase().includes(search.toLowerCase())).map((cs, i) => (
          <motion.div key={cs.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-5 group cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
                <BookOpen className="h-5 w-5 text-purple-400" />
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${difficultyColors[cs.difficulty]}`}>
                {cs.difficulty}
              </span>
            </div>
            <h3 className="font-semibold text-[var(--color-text)] mb-1">{cs.title}</h3>
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">{cs.category} · {cs.tables} tables</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                <Clock className="h-3 w-3" /> {cs.duration}
              </span>
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400" /> {cs.rating}
              </span>
            </div>
            <button className="btn-ghost btn-sm w-full mt-3"><ArrowRight className="h-3 w-3" /> Start Modeling</button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
