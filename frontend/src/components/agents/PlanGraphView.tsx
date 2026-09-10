/**
 * PlanGraphView — Renders the orchestrator's execution DAG.
 *
 * Nodes are agent steps grouped into dependency waves (computed client-side
 * from depends_on edges) and laid out left-to-right. Each node shows the
 * agent name, live status, and timing; edges are drawn as SVG connectors
 * between wave columns with an animated dash for in-flight dependencies.
 */
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Circle } from 'lucide-react';
import type { PlanGraph, PlanGraphNode } from '../../hooks/useAgentWebSocket';

// ── Wave layout ───────────────────────────────────────────────────────

/** Group nodes into waves: wave 0 = no deps, wave N = after all deps' waves. */
function computeWaves(nodes: PlanGraphNode[]): PlanGraphNode[][] {
  const byId = new Map(nodes.map((n) => [n.step_id, n]));
  const depth = new Map<string, number>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (depth.has(node.step_id)) continue;
      const deps = (node.depends_on || []).filter((d) => byId.has(d));
      if (deps.length === 0) {
        depth.set(node.step_id, 0);
        changed = true;
      } else if (deps.every((d) => depth.has(d))) {
        depth.set(node.step_id, Math.max(...deps.map((d) => depth.get(d)!)) + 1);
        changed = true;
      }
    }
  }
  const maxDepth = Math.max(0, ...depth.values());
  for (const node of nodes) depth.set(node.step_id, depth.get(node.step_id) ?? maxDepth);
  const waves: PlanGraphNode[][] = [];
  for (const node of nodes) {
    const w = depth.get(node.step_id)!;
    (waves[w] ||= []).push(node);
  }
  return waves.filter(Boolean);
}

// ── Status icon ───────────────────────────────────────────────────────

const StatusIcon: React.FC<{ status: PlanGraphNode['status'] }> = ({ status }) => {
  switch (status) {
    case 'success':
      return <CheckCircle size={13} className="text-green-400 shrink-0" />;
    case 'failed':
      return <XCircle size={13} className="text-red-400 shrink-0" />;
    case 'running':
      return <Loader2 size={13} className="animate-spin text-blue-400 shrink-0" />;
    default:
      return <Circle size={13} className="text-gray-600 shrink-0" />;
  }
};

const NODE_W = 148;
const NODE_H = 52;
const COL_GAP = 56;
const ROW_GAP = 12;

// ── Main component ────────────────────────────────────────────────────

export const PlanGraphView: React.FC<{ graph: PlanGraph }> = ({ graph }) => {
  const waves = useMemo(() => computeWaves(graph.nodes), [graph.nodes]);

  // Position each node by (wave column, row in column)
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number; wave: number; row: number }>();
    waves.forEach((wave, w) => {
      wave.forEach((node, r) => {
        pos.set(node.step_id, { x: w, y: r, wave: w, row: r });
      });
    });
    return pos;
  }, [waves]);

  const maxRows = Math.max(1, ...waves.map((w) => w.length));
  const width = waves.length * (NODE_W + COL_GAP) - COL_GAP;
  const height = maxRows * (NODE_H + ROW_GAP) - ROW_GAP;

  const nodeCenter = (stepId: string) => {
    const p = positions.get(stepId);
    if (!p) return null;
    return {
      x: p.x * (NODE_W + COL_GAP) + NODE_W / 2,
      y: p.row * (NODE_H + ROW_GAP) + NODE_H / 2,
    };
  };

  const overall = graph.status;

  return (
    <div className="rounded-lg border border-[#1F2937] bg-[#0B1220] overflow-x-auto">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1F2937]">
        <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
          Execution Graph
        </span>
        <span
          className={`font-mono text-[10px] uppercase ${
            overall === 'success'
              ? 'text-green-400'
              : overall === 'failure'
              ? 'text-red-400'
              : overall === 'partial'
              ? 'text-amber-400'
              : 'text-blue-400 animate-pulse'
          }`}
        >
          {overall}
        </span>
      </div>

      <div className="p-3" style={{ minWidth: width + 24 }}>
        <div className="relative" style={{ width, height: Math.max(height, NODE_H) }}>
          {/* Edges */}
          <svg className="absolute inset-0 pointer-events-none" width={width} height={Math.max(height, NODE_H)}>
            <defs>
              <marker id="pgv-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#374151" />
              </marker>
            </defs>
            {graph.edges.map((e, i) => {
              const from = nodeCenter(e.source);
              const to = nodeCenter(e.target);
              if (!from || !to) return null;
              const x1 = from.x + NODE_W / 2 - 4;
              const x2 = to.x - NODE_W / 2 + 4;
              const midX = (x1 + x2) / 2;
              const done = graph.nodes.find((n) => n.step_id === e.source)?.status === 'success';
              const active = graph.nodes.find((n) => n.step_id === e.target)?.status === 'running';
              return (
                <path
                  key={i}
                  d={`M ${x1} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${x2} ${to.y}`}
                  fill="none"
                  stroke={done ? '#22C55E' : '#374151'}
                  strokeWidth={1.5}
                  strokeDasharray={active ? '4 3' : undefined}
                  markerEnd="url(#pgv-arrow)"
                  className={active ? 'animate-[dashmove_1s_linear_infinite]' : ''}
                  opacity={done ? 0.9 : 0.6}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const p = positions.get(node.step_id);
            if (!p) return null;
            const x = p.x * (NODE_W + COL_GAP);
            const y = p.row * (NODE_H + ROW_GAP);
            const border =
              node.status === 'success'
                ? 'border-green-500/40 bg-green-500/5'
                : node.status === 'failed'
                ? 'border-red-500/40 bg-red-500/5'
                : node.status === 'running'
                ? 'border-blue-500/50 bg-blue-500/10'
                : 'border-[#1F2937] bg-[#111827]';
            return (
              <motion.div
                key={node.step_id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                title={node.objective || node.step_id}
                style={{ left: x, top: y, width: NODE_W, height: NODE_H }}
                className={`absolute rounded-lg border px-2.5 py-1.5 ${border} transition-colors`}
              >
                <div className="flex items-center gap-1.5">
                  <StatusIcon status={node.status} />
                  <span className="font-mono text-[11px] font-medium text-white truncate">
                    {node.agent}
                  </span>
                  <span className="font-mono text-[8px] text-gray-600 ml-auto">{node.step_id}</span>
                </div>
                {node.execution_time_ms !== undefined && node.execution_time_ms > 0 && (
                  <p className="font-mono text-[9px] text-gray-500 mt-0.5">
                    {node.execution_time_ms < 1000
                      ? `${node.execution_time_ms.toFixed(0)}ms`
                      : `${(node.execution_time_ms / 1000).toFixed(1)}s`}
                  </p>
                )}
                {node.detail && (
                  <p className="font-mono text-[9px] text-gray-500 truncate">{node.detail}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlanGraphView;
