import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Mail, MessageCircle, BookOpen } from 'lucide-react';

const faqs = [
  {
    q: 'How do I create a pipeline?',
    a: 'Go to the Pipeline Builder page and describe your data pipeline in natural language. AIDEN will parse your intent and generate the complete pipeline configuration automatically.',
  },
  {
    q: 'What data sources are supported?',
    a: 'Currently supporting PostgreSQL, Snowflake, MySQL, BigQuery, S3, and Kafka. More connectors are being added regularly.',
  },
  {
    q: 'How does monitoring work?',
    a: 'Real-time monitoring is available on the Monitoring page. You can view execution timelines, pipeline health status, success rates, and active alerts.',
  },
  {
    q: 'Can I schedule pipelines?',
    a: 'Yes, each pipeline can be configured with a cron schedule. You can set this during creation or edit it in the pipeline details page.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted in transit and at rest. We use industry-standard security practices including JWT authentication and role-based access control.',
  },
];

const helpCategories = [
  { icon: BookOpen, label: 'Getting Started', desc: 'Learn the basics of AIDEN', color: 'bg-blue-600' },
  { icon: MessageCircle, label: 'Pipeline Builder', desc: 'Create and manage pipelines', color: 'bg-indigo-600' },
  { icon: Mail, label: 'Contact Support', desc: 'Get help from our team', color: 'bg-purple-600' },
];

const HelpPage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/30 mb-4">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Help Center</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
          Find answers to common questions or get in touch with our team.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search help articles..."
          className="input pl-11 pr-4"
        />
      </div>

      {/* Help Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {helpCategories.map((cat, i) => (
          <motion.button
            key={cat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
            className="card-hover flex flex-col items-center gap-3 py-6 text-center"
          >
            <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center shadow-sm`}>
              <cat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{cat.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{cat.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* FAQ Section */}
      <div className="card divide-y divide-gray-100 dark:divide-gray-700">
        <div className="pb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {filteredFaqs.length} article{filteredFaqs.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="py-1">
                <button
                  id={`faq-button-${i}`}
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${i}`}
                  className="w-full flex items-center justify-between px-3 py-3 text-left text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  <span>{faq.q}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      id={`faq-answer-${i}`}
                      role="region"
                      aria-labelledby={`faq-button-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="px-3 pb-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No results found for "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpPage;
