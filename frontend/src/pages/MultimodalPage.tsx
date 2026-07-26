import React from 'react';
import { motion } from 'framer-motion';
import { PipelineAnalyzer } from '../components/multimodal/PipelineAnalyzer';

const MultimodalPage: React.FC = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Multimodal Analysis</h1>
        <p className="mt-1 text-sm text-gray-400">
          Upload pipeline architecture diagrams and analyze them with vision-language AI.
        </p>
      </div>

      {/* Pipeline analyzer component */}
      <PipelineAnalyzer />
    </motion.div>
  );
};

export default MultimodalPage;
