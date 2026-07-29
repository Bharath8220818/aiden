import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ReactFlow, Background, Controls, MiniMap, addEdge, useNodesState, useEdgesState } from 'reactflow';
import type { Connection, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Save, Download, Play, Code2, Sparkles, EyeOff } from 'lucide-react';

const initialNodes: Node[] = [
  { id: '1', type: 'input', position: { x: 50, y: 200 }, data: { label: 'PostgreSQL' }, style: { background: 'rgba(124,58,237,0.1)', border: '2px solid rgba(124,58,237,0.3)', borderRadius: 12, color: '#fff', padding: 12, fontSize: 13, fontWeight: 600 } },
  { id: '2', type: 'default', position: { x: 350, y: 150 }, data: { label: 'Filter' }, style: { background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: 12, color: '#fff', padding: 12, fontSize: 13, fontWeight: 600 } },
  { id: '3', type: 'default', position: { x: 350, y: 300 }, data: { label: 'Aggregate' }, style: { background: 'rgba(245,158,11,0.1)', border: '2px solid rgba(245,158,11,0.3)', borderRadius: 12, color: '#fff', padding: 12, fontSize: 13, fontWeight: 600 } },
  { id: '4', type: 'output', position: { x: 650, y: 200 }, data: { label: 'Snowflake' }, style: { background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)', borderRadius: 12, color: '#fff', padding: 12, fontSize: 13, fontWeight: 600 } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: 'rgba(124,58,237,0.4)', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: 'rgba(124,58,237,0.4)', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: 'rgba(124,58,237,0.4)', strokeWidth: 2 } },
];

export default function PipelineDesignerPage() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [showCode, setShowCode] = useState(false);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const generatedCode = `from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime

default_args = {'owner': 'aiden', 'start_date': datetime(2024, 1, 1)}

with DAG('pipeline_design', default_args=default_args, schedule_interval='0 6 * * *') as dag:
    
    def extract():
        # PostgreSQL extraction logic
        return {'status': 'extracted', 'records': 1000}
    
    def transform():
        # Filter + Aggregate
        return {'status': 'transformed'}
    
    def load():
        # Snowflake load
        return {'status': 'loaded'}
    
    extract_task = PythonOperator(task_id='extract', python_callable=extract)
    transform_task = PythonOperator(task_id='transform', python_callable=transform)
    load_task = PythonOperator(task_id='load', python_callable=load)
    
    extract_task >> transform_task >> load_task`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">🔄 Pipeline Designer</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Drag, connect, and configure your data pipeline visually</p>
        </motion.div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setShowCode(!showCode)}>
            {showCode ? <EyeOff className="h-4 w-4" /> : <Code2 className="h-4 w-4" />} Code
          </button>
          <button className="btn-secondary btn-sm"><Save className="h-4 w-4" /> Save</button>
          <button className="btn-primary btn-sm"><Play className="h-4 w-4" /> Run</button>
        </div>
      </div>

      <div className="flex gap-4" style={{ height: '600px' }}>
        {/* Canvas */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="flex-1 rounded-2xl border border-[var(--color-border)] overflow-hidden relative">
          <ReactFlow
            nodes={nodes} edges={edges}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            fitView
            attributionPosition="bottom-left">
            <Background color="rgba(124,58,237,0.08)" gap={24} />
            <Controls className="!rounded-xl !border-[var(--color-border)] !bg-[var(--color-card)]" />
            <MiniMap className="!rounded-xl !border-[var(--color-border)]" style={{ background: 'var(--color-card)' }} />
          </ReactFlow>

          {/* Quick AI Input */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <div className="glass-card flex items-center gap-3 p-2.5 px-4">
              <Sparkles className="h-4 w-4 text-purple-400 shrink-0" />
              <input type="text" placeholder="Describe your pipeline... e.g., 'Extract from PostgreSQL, filter by date, load to Snowflake'"
                className="flex-1 border-0 bg-transparent px-0 text-xs text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:ring-0" />
              <button className="btn-primary btn-sm"><Sparkles className="h-4 w-4" /> Build</button>
            </div>
          </div>
        </motion.div>

        {/* Code Preview Panel */}
        {showCode && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="w-96 shrink-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2.5">
              <span className="text-xs font-semibold text-[var(--color-text)]">Generated DAG</span>
              <button className="btn-icon btn-sm"><Download className="h-3.5 w-3.5" /></button>
            </div>
            <pre className="p-4 text-[11px] font-mono text-[var(--color-text-secondary)] overflow-auto h-[calc(100%-44px)] leading-relaxed">
              {generatedCode}
            </pre>
          </motion.div>
        )}
      </div>
    </div>
  );
}
