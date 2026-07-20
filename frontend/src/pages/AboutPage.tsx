import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Shield, Layers, Heart } from 'lucide-react';

const features = [
  { icon: Sparkles, label: 'AI-Powered', desc: 'Natural language pipeline creation with intent parsing' },
  { icon: Zap, label: 'Real-time', desc: 'Live monitoring with WebSocket-based status updates' },
  { icon: Shield, label: 'Enterprise', desc: 'Role-based access control and audit logging' },
  { icon: Layers, label: 'Multi-source', desc: 'Connect to PostgreSQL, Snowflake, Kafka, and more' },
];

const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-12 animate-fade-in">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-6">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          About <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">AIDEN</span>
        </h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          AIDEN is an AI-powered data engineering platform that turns natural language into production-ready data pipelines.
          Built for modern data teams who need to move fast without sacrificing quality.
        </p>
      </motion.div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((feature, i) => (
          <motion.div
            key={feature.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="card flex items-start gap-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
              <feature.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{feature.label}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{feature.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tech Stack */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Built With</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            'React 19', 'TypeScript', 'Tailwind CSS', 'Framer Motion',
            'FastAPI', 'PostgreSQL', 'Python', 'Docker',
          ].map((tech) => (
            <div key={tech} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {tech}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center pb-8"
      >
        <p className="flex items-center justify-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> by the AIDEN team
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          &copy; {new Date().getFullYear()} AIDEN. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default AboutPage;
