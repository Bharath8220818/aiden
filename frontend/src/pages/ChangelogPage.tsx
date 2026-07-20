import React from 'react';
import { motion } from 'framer-motion';
import { GitCompare, Sparkles, Bug, Zap } from 'lucide-react';

interface VersionEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch';
  changes: { type: 'feature' | 'fix' | 'improvement'; text: string }[];
}

const changelog: VersionEntry[] = [
  {
    version: '1.2.0',
    date: '2026-07-20',
    type: 'minor',
    changes: [
      { type: 'feature', text: 'Added dark mode support with system preference detection' },
      { type: 'fix', text: 'Fixed authentication sync — login now works with email OR username' },
      { type: 'improvement', text: 'Added skeleton loaders for dashboard and pipelines pages' },
      { type: 'feature', text: 'Custom Toast notification system replacing react-hot-toast' },
      { type: 'improvement', text: 'Code-splitting with React.lazy — initial bundle reduced by 43%' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-07-15',
    type: 'minor',
    changes: [
      { type: 'feature', text: 'Pipeline Builder with AI-powered chat-based creation' },
      { type: 'feature', text: 'Pipeline Canvas with React Flow visualization' },
      { type: 'feature', text: 'Agent Manager panel with real-time status updates' },
      { type: 'feature', text: 'WebSocket-based monitoring page' },
      { type: 'improvement', text: 'Responsive design for mobile and tablet' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-07-10',
    type: 'major',
    changes: [
      { type: 'feature', text: 'User authentication (login / signup) with JWT' },
      { type: 'feature', text: 'Dashboard with stats cards and activity feed' },
      { type: 'feature', text: 'Pipelines CRUD with listing and detail views' },
      { type: 'feature', text: 'Pipeline execution tracking and history' },
      { type: 'feature', text: 'SQLite database with SQLAlchemy async ORM' },
      { type: 'feature', text: 'Responsive UI with Tailwind CSS and Framer Motion' },
    ],
  },
];

const typeConfig = {
  feature: { icon: Sparkles, label: 'New Feature', color: 'text-blue-600', bg: 'bg-blue-100' },
  fix: { icon: Bug, label: 'Bug Fix', color: 'text-red-600', bg: 'bg-red-100' },
  improvement: { icon: Zap, label: 'Improvement', color: 'text-green-600', bg: 'bg-green-100' },
} as const;

const versionBadge = {
  major: 'bg-purple-100 text-purple-800',
  minor: 'bg-blue-100 text-blue-800',
  patch: 'bg-gray-100 text-gray-600',
} as const;

const ChangelogPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-10 animate-fade-in">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 mb-5">
          <GitCompare className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          What's New
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm max-w-lg mx-auto">
          Stay up to date with the latest features, improvements, and fixes in AIDEN.
        </p>
      </motion.div>

      {/* Timeline */}
      <div className="relative space-y-8">
        {/* Vertical line */}
        <div className="absolute left-[23px] top-10 bottom-10 w-0.5 bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        {changelog.map((entry, i) => (
          <motion.div
            key={entry.version}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="relative pl-0 sm:pl-14"
          >
            {/* Timeline dot */}
            <div className="hidden sm:flex absolute left-[14px] top-1.5 w-[19px] h-[19px] rounded-full bg-white dark:bg-gray-900 border-4 border-blue-600 z-10" />

            <div className="card">
              {/* Version header */}
              <div className="flex items-center flex-wrap gap-3 mb-4">
                <span className="text-xl font-extrabold text-gray-900 dark:text-white">
                  v{entry.version}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${versionBadge[entry.type]}`}>
                  {entry.type === 'major' ? 'Major Release' : entry.type === 'minor' ? 'Minor Update' : 'Patch'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{entry.date}</span>
              </div>

              {/* Changes */}
              <ul className="space-y-2.5">
                {entry.changes.map((change, j) => {
                  const config = typeConfig[change.type];
                  const Icon = config.icon;
                  return (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <span className={`flex items-center justify-center w-6 h-6 rounded-full ${config.bg} shrink-0 mt-0.5`}>
                        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">{change.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4"
      >
        Check back here for future updates. Follow the project on{' '}
        <a href="#" className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700">
          GitHub
        </a>{' '}
        for development progress.
      </motion.p>
    </div>
  );
};

export default ChangelogPage;
