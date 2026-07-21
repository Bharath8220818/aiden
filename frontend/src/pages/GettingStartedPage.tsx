import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, BarChart3, Wrench, ArrowRight } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Create a Pipeline',
    description: 'Describe your pipeline in plain English — AIDEN\'s AI parses the intent and generates the configuration automatically. No coding required.',
    icon: Sparkles,
    color: 'from-blue-500 to-indigo-500',
    link: '/builder',
    linkText: 'Go to Builder →',
  },
  {
    id: 2,
    title: 'Monitor Execution',
    description: 'Watch your pipeline run in real-time with live WebSocket updates. Track records processed, duration, and step-by-step progress.',
    icon: BarChart3,
    color: 'from-green-500 to-emerald-500',
    link: '/monitoring',
    linkText: 'Open Monitoring →',
  },
  {
    id: 3,
    title: 'Self-Healing',
    description: 'AIDEN automatically detects failures and attempts to recover. Get notified via toast alerts and email when issues arise.',
    icon: Wrench,
    color: 'from-purple-500 to-violet-500',
    link: '/monitoring',
    linkText: 'View Alerts →',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
};

const GettingStartedPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-14"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 mb-5">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          Getting Started with{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">AIDEN</span>
        </h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-sm leading-relaxed">
          Learn how to use the platform in three simple steps. From creating your first pipeline to monitoring execution.
        </p>
      </motion.div>

      {/* Steps */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.id}
              variants={itemVariants}
              className="relative flex items-start gap-5 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              {/* Step number badge */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-sm`}>
                <span className="text-base font-bold text-white">{step.id}</span>
              </div>

              {/* Connector line */}
              {step.id < 3 && (
                <div className="hidden sm:block absolute left-[19px] top-14 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-purple-200 dark:from-blue-800 dark:to-purple-800" />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Link
                to={step.link}
                className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-1"
              >
                {step.linkText.split('→')[0]}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Final CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mt-12 text-center"
      >
        <Link
          to="/builder"
          className="inline-flex items-center gap-2 btn-primary px-6 py-3 text-base"
        >
          <Sparkles className="w-5 h-5" />
          Start Building Your First Pipeline
        </Link>
        <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          No credit card required. Start with a free account.
        </p>
      </motion.div>
    </div>
  );
};

export default GettingStartedPage;
