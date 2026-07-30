import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle2, XCircle, Brain } from 'lucide-react';

const mockProblem = {
  id: 1,
  title: 'High-Engagement Video Filtering',
  difficulty: 'Medium' as const,
  company: 'Google',
  category: 'PySpark',
  description: `Given a stream of video metadata, return only the videos that have:\n- More than 1,000,000 views\n- Release year >= 2019\n- Sorted by duration in ascending order`,
  inputSchema: 'video_id: INT, title: STRING, view_count: INT, release_year: INT, duration: INT, category: STRING',
  outputSchema: 'video_id: INT, title: STRING, view_count: INT, duration: INT',
  constraints: 'Use PySpark DataFrame API. Do not use SQL.',
};

const difficultyColors: Record<string, string> = {
  Easy: 'bg-green-500/10 text-green-400 border-green-500/20',
  Medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Hard: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function CodingProblemDetailPage() {
  const { id: _problemId } = useParams();
  const [code, setCode] = useState('from pyspark.sql import functions as F\n\ndef etl(video_stream_df):\n    # Your solution here\n    pass');
  const [activeTab, setActiveTab] = useState<'description' | 'solution' | 'submissions'>('description');

  return (
    <div className="space-y-4">
      <Link to="/coding-problems" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
        <ArrowLeft className="h-4 w-4" /> Back to Problems
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Problem Description */}
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold text-purple-400 border-purple-500/20 bg-purple-500/10">{mockProblem.company}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${difficultyColors[mockProblem.difficulty]}`}>{mockProblem.difficulty}</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">{mockProblem.category}</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{mockProblem.title}</h1>
          </motion.div>

          <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-1">
            {['description', 'solution', 'submissions'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  activeTab === tab ? 'bg-purple-500/10 text-purple-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                }`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'description' && (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Problem</h3>
                <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-line">{mockProblem.description}</p>
              </div>
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Input Schema</h3>
                <code className="text-xs text-[var(--color-text-muted)] font-mono">{mockProblem.inputSchema}</code>
              </div>
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Output Schema</h3>
                <code className="text-xs text-[var(--color-text-muted)] font-mono">{mockProblem.outputSchema}</code>
              </div>
              <div className="glass-card p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2">Constraints</h3>
                <p className="text-xs text-[var(--color-text-muted)]">{mockProblem.constraints}</p>
              </div>
            </div>
          )}

          {activeTab === 'solution' && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-green-400 mb-2">Solution</h3>
              <pre className="text-xs text-[var(--color-text-secondary)] font-mono whitespace-pre-wrap">
{`from pyspark.sql import functions as F

def etl(video_stream_df):
    return video_stream_df.filter(
        (F.col('view_count') > 1000000) & 
        (F.col('release_year') >= 2019)
    ).orderBy(F.col('duration').asc())`}
              </pre>
              <p className="mt-3 text-xs text-[var(--color-text-muted)]">Time: O(n log n) · Space: O(n)</p>
            </div>
          )}
        </div>

        {/* Code Editor */}
        <div className="space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">solution.py</span>
              <button className="btn-primary btn-sm"><Play className="h-3 w-3" /> Run Tests</button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-80 bg-[var(--color-card)] p-4 text-sm font-mono text-[var(--color-text)] outline-none resize-none"
              spellCheck={false}
            />
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Test Results</h3>
              <span className="text-xs text-[var(--color-text-muted)]">3 test cases</span>
            </div>
            <div className="space-y-2">
              {[
                { id: 1, passed: true, desc: 'view_count > 1M and release >= 2019' },
                { id: 2, passed: true, desc: 'sorted by duration ascending' },
                { id: 3, passed: false, desc: 'handles empty input' },
              ].map((tc) => (
                <div key={tc.id} className="flex items-center gap-2 text-xs">
                  {tc.passed ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  )}
                  <span className={tc.passed ? 'text-green-400' : 'text-red-400'}>{tc.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-secondary w-full py-2.5"><Brain className="h-4 w-4" /> AI Hint</button>
        </div>
      </div>
    </div>
  );
}
