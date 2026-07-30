import { motion } from 'framer-motion';
import {
  BookOpen, Code2, Database, BarChart3, 
  CheckCircle2, Clock, Award,
  ArrowRight, TrendingUp, Users, Zap
} from 'lucide-react';

const tracks = [
  {
    title: 'Data Engineering Fundamentals',
    icon: Database,
    color: 'from-blue-500/20 to-cyan-500/20',
    textColor: 'text-blue-400',
    progress: 65,
    lessons: 24,
    completed: 16,
    level: 'Beginner',
  },
  {
    title: 'Advanced Analytics & SQL',
    icon: BarChart3,
    color: 'from-green-500/20 to-emerald-500/20',
    textColor: 'text-green-400',
    progress: 40,
    lessons: 32,
    completed: 13,
    level: 'Intermediate',
  },
  {
    title: 'Big Data with PySpark',
    icon: Zap,
    color: 'from-orange-500/20 to-red-500/20',
    textColor: 'text-orange-400',
    progress: 25,
    lessons: 28,
    completed: 7,
    level: 'Advanced',
  },
  {
    title: 'Cloud Architecture Design',
    icon: Code2,
    color: 'from-purple-500/20 to-pink-500/20',
    textColor: 'text-purple-400',
    progress: 10,
    lessons: 20,
    completed: 2,
    level: 'Advanced',
  },
  {
    title: 'Real-Time Streaming',
    icon: TrendingUp,
    color: 'from-cyan-500/20 to-blue-500/20',
    textColor: 'text-cyan-400',
    progress: 0,
    lessons: 18,
    completed: 0,
    level: 'Expert',
  },
  {
    title: 'Data Governance & Quality',
    icon: Users,
    color: 'from-amber-500/20 to-yellow-500/20',
    textColor: 'text-amber-400',
    progress: 5,
    lessons: 15,
    completed: 1,
    level: 'Intermediate',
  },
];

export default function LearningPathsPage() {
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-[var(--color-text)]">📚 Learning Paths</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Curated career tracks to level up your data engineering skills
        </p>
      </motion.div>

      {/* Stats Summary */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Enrolled Tracks', value: '6', icon: BookOpen, color: 'text-purple-400' },
          { label: 'Lessons Completed', value: '39', icon: CheckCircle2, color: 'text-green-400' },
          { label: 'Practice Hours', value: '47', icon: Clock, color: 'text-cyan-400' },
          { label: 'Achievements', value: '12', icon: Award, color: 'text-amber-400' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/10 to-cyan-500/10">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--color-text)]">{stat.value}</p>
              <p className="text-xs text-[var(--color-text-secondary)]">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Learning Tracks */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track, i) => (
          <motion.div
            key={track.title}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card overflow-hidden group cursor-pointer"
          >
            <div className={`h-1.5 w-full bg-gradient-to-r ${track.color}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${track.color}`}>
                  <track.icon className={`h-5 w-5 ${track.textColor}`} />
                </div>
                <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                  {track.level}
                </span>
              </div>

              <h3 className="font-semibold text-[var(--color-text)] mb-1">{track.title}</h3>
              <p className="text-xs text-[var(--color-text-secondary)] mb-4">
                {track.completed}/{track.lessons} lessons completed
              </p>

              {/* Progress Bar */}
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-1000"
                  style={{ width: `${track.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">{track.progress}% complete</span>
                <button className="btn-ghost btn-sm text-xs">
                  {track.progress > 0 ? 'Continue' : 'Start'} <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
