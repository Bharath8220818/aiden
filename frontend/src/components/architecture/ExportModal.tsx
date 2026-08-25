import React, { useState, useCallback } from 'react';
import { X, Download, Image, FileCode, FileJson, Copy, Check, Loader2 } from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import type { Node, Edge } from 'reactflow';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  nodes: Node[];
  edges: Edge[];
  architectureName: string;
}

type ExportFormat = 'png' | 'svg' | 'json' | 'mermaid';

const FORMAT_OPTIONS: { format: ExportFormat; label: string; desc: string; icon: React.ReactNode }[] = [
  { format: 'png', label: 'PNG Image', desc: 'High-resolution raster image', icon: <Image size={18} /> },
  { format: 'svg', label: 'SVG Vector', desc: 'Scalable vector graphic', icon: <FileCode size={18} /> },
  { format: 'json', label: 'JSON Data', desc: 'Machine-readable architecture data', icon: <FileJson size={18} /> },
  { format: 'mermaid', label: 'Mermaid Diagram', desc: 'Markdown-compatible diagram code', icon: <FileCode size={18} /> },
];

function nodesToMermaid(nodes: Node[], edges: Edge[]): string {
  const lines = ['graph TD'];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  edges.forEach((e) => {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    const srcLabel = (src?.data?.label || e.source).replace(/[^a-zA-Z0-9 ]/g, '');
    const tgtLabel = (tgt?.data?.label || e.target).replace(/[^a-zA-Z0-9 ]/g, '');
    const edgeLabel = e.label ? ` -->|"${e.label}"|` : ' -->';
    lines.push(`  ${e.source}["${srcLabel}"]${edgeLabel}${e.target}["${tgtLabel}"]`);
  });

  // Add node definitions for nodes without edges
  nodes.forEach((n) => {
    if (!edges.some((e) => e.source === n.id || e.target === n.id)) {
      const label = (n.data?.label || n.id).replace(/[^a-zA-Z0-9 ]/g, '');
      lines.push(`  ${n.id}["${label}"]`);
    }
  });

  return lines.join('\n');
}

export function ExportModal({
  isOpen,
  onClose,
  reactFlowWrapper,
  nodes,
  edges,
  architectureName,
}: ExportModalProps) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [copied, setCopied] = useState(false);

  const downloadFile = useCallback((data: string | Blob, filename: string) => {
    const url = typeof data === 'string' ? URL.createObjectURL(new Blob([data], { type: 'text/plain' })) : URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    const el = reactFlowWrapper.current?.querySelector('.react-flow') as HTMLElement;
    if (!el && format !== 'json' && format !== 'mermaid') {
      alert('Canvas not found. Please try again.');
      return;
    }

    setExporting(format);
    try {
      const safeName = architectureName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

      switch (format) {
        case 'png': {
          if (!el) break;
          const dataUrl = await toPng(el, {
            backgroundColor: '#080B12',
            quality: 1.0,
            pixelRatio: 2,
          });
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${safeName}.png`;
          link.click();
          break;
        }
        case 'svg': {
          if (!el) break;
          const dataUrl = await toSvg(el, {
            backgroundColor: '#080B12',
          });
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `${safeName}.svg`;
          link.click();
          break;
        }
        case 'json': {
          const data = {
            architecture_name: architectureName,
            exported_at: new Date().toISOString(),
            version: '1.0',
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.data?.label || n.id,
              category: n.data?.category || '',
              position: n.position,
              config: n.data?.config || {},
              status: n.data?.status || 'unknown',
            })),
            edges: edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              label: e.label || '',
              type: e.type || 'default',
              animated: e.animated || false,
            })),
            metadata: {
              total_nodes: nodes.length,
              total_edges: edges.length,
            },
          };
          downloadFile(JSON.stringify(data, null, 2), `${safeName}.json`);
          break;
        }
        case 'mermaid': {
          const mermaid = nodesToMermaid(nodes, edges);
          downloadFile(mermaid, `${safeName}.mmd`);
          break;
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert(`Export failed: ${err}`);
    } finally {
      setExporting(null);
    }
  }, [reactFlowWrapper, nodes, edges, architectureName, downloadFile]);

  const handleCopyMermaid = useCallback(async () => {
    const mermaid = nodesToMermaid(nodes, edges);
    await navigator.clipboard.writeText(mermaid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [nodes, edges]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-[#111827] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">Export Architecture</h3>
            <p className="mt-0.5 text-sm text-gray-400">{architectureName}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Format Options */}
        <div className="mt-5 space-y-2">
          {FORMAT_OPTIONS.map(({ format, label, desc, icon }) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={exporting !== null}
              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-[#0F172A]/50 p-3.5 text-left transition-all hover:border-purple-500/20 hover:bg-[#0F172A] disabled:opacity-50 group"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.03] text-gray-400 group-hover:text-purple-400 transition-colors">
                {exporting === format ? <Loader2 size={18} className="animate-spin" /> : icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <Download size={16} className="shrink-0 text-gray-500 group-hover:text-purple-400 transition-colors" />
            </button>
          ))}
        </div>

        {/* Mermaid Copy Button */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0F172A]/30 px-4 py-3">
          <span className="text-xs text-gray-400">Copy Mermaid to clipboard</span>
          <button
            onClick={handleCopyMermaid}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/10"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-[11px] text-gray-600">
          PNG exports at 2× resolution for crisp printing
        </p>
      </div>
    </div>
  );
}
