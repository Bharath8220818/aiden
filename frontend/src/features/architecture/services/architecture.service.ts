import { api } from '@/services/api';
import { useHandoffStore } from '@/store/handoffStore';
import {
  ArchitectureFlowNode,
  ArchitectureFlowEdge,
  ArchitectureNodeKind,
  ArchitectureValidationReport,
  ArchitectureValidationIssue,
} from '../types';
import {
  ARCHITECTURE_TEMPLATES,
  BLUEPRINT_ORDERS_CDC_NODES,
  BLUEPRINT_ORDERS_CDC_EDGES,
  INITIAL_VALIDATION_REPORT,
  BLUEPRINT_FRAUD_NODES,
  BLUEPRINT_FRAUD_EDGES,
} from '../mockData';

const isMockEnabled = () => import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false';

/* ------------------------------------------------------------------ */
/* Node palette definitions                                            */
/* ------------------------------------------------------------------ */

export interface PaletteItem {
  kind: ArchitectureNodeKind;
  label: string;
  technology: string;
  description: string;
}

export const NODE_PALETTE: PaletteItem[] = [
  { kind: 'source', label: 'Data Source', technology: 'PostgreSQL / MySQL / API', description: 'OLTP databases, SaaS APIs, event producers' },
  { kind: 'ingestion', label: 'Ingestion', technology: 'Debezium / Fivetran / Airbyte', description: 'CDC connectors and batch extractors' },
  { kind: 'processing', label: 'Processing', technology: 'Spark / Flink / dbt', description: 'Transformations, enrichment, windowing' },
  { kind: 'storage', label: 'Storage / Bus', technology: 'Kafka / S3 / HDFS', description: 'Raw zones, event buses, landing buckets' },
  { kind: 'quality', label: 'Quality Gate', technology: 'Great Expectations / dbt tests', description: 'Assertions evaluated before promotion' },
  { kind: 'sink', label: 'Sink / Consumer', technology: 'Snowflake / BigQuery / Redis', description: 'Warehouse marts, feature stores, alert sinks' },
  { kind: 'orchestration', label: 'Orchestration', technology: 'Airflow / Dagster', description: 'Scheduling, backfills, dependency management' },
];

const KIND_TECH: Record<ArchitectureNodeKind, string> = {
  source: 'PostgreSQL 15',
  ingestion: 'Debezium 2.5',
  processing: 'Spark Structured Streaming',
  storage: 'Kafka 3.6',
  quality: 'Great Expectations',
  sink: 'Snowflake Enterprise',
  orchestration: 'Apache Airflow 2.9',
};

const KIND_LABEL: Record<ArchitectureNodeKind, string> = {
  source: 'Data Source',
  ingestion: 'Ingestion',
  processing: 'Processing',
  storage: 'Storage / Bus',
  quality: 'Quality Gate',
  sink: 'Sink / Consumer',
  orchestration: 'Orchestration',
};

/* ------------------------------------------------------------------ */
/* Node factory                                                        */
/* ------------------------------------------------------------------ */

export function createNodeFromPalette(
  kind: ArchitectureNodeKind,
  position: { x: number; y: number },
  index: number
): ArchitectureFlowNode {
  const id = `${kind}-${Date.now()}-${index}`;
  return {
    id,
    type: 'architecture',
    position,
    data: {
      label: `${KIND_LABEL[kind]} ${index}`,
      kind,
      status: 'idle',
      technology: KIND_TECH[kind],
      description: 'Newly added node — configure properties in the inspector panel.',
      metrics: [{ label: 'State', value: 'Unconfigured' }],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Validation engine (runs client-side, backend-ready)                 */
/* ------------------------------------------------------------------ */

export function validateArchitecture(
  nodes: ArchitectureFlowNode[],
  edges: ArchitectureFlowEdge[]
): ArchitectureValidationReport {
  const issues: ArchitectureValidationIssue[] = [];

  const sources = nodes.filter((n) => n.data?.kind === 'source');
  const sinks = nodes.filter((n) => n.data?.kind === 'sink');
  const contractNodes = nodes.filter((n) => n.data?.contract);
  const contractCoverage = nodes.length ? Math.round((contractNodes.length / nodes.length) * 100) : 0;

  // Rule 1: at least one source
  if (sources.length === 0) {
    issues.push({
      id: 'val-no-source',
      severity: 'error',
      title: 'No data source defined',
      message: 'Every pipeline blueprint requires at least one source node (database, API, or event producer).',
    });
  }

  // Rule 2: at least one sink
  if (sinks.length === 0) {
    issues.push({
      id: 'val-no-sink',
      severity: 'error',
      title: 'No sink / consumer defined',
      message: 'Add a destination node (warehouse mart, feature store, or topic) to complete the flow.',
    });
  }

  // Rule 3: orphan nodes (no incoming and no outgoing edges)
  const connectedIds = new Set(edges.flatMap((e) => [e.source, e.target]));
  const orphans = nodes.filter((n) => !connectedIds.has(n.id));
  orphans.forEach((orphan) => {
    issues.push({
      id: `val-orphan-${orphan.id}`,
      severity: 'warning',
      title: 'Disconnected node',
      message: `"${orphan.data?.label ?? orphan.id}" is not connected to any data flow. Connect it or remove it before deployment.`,
      nodeId: orphan.id,
    });
  });

  // Rule 4: source nodes must not receive incoming edges
  const sourceIds = new Set(sources.map((s) => s.id));
  edges.forEach((e) => {
    if (sourceIds.has(e.target)) {
      const target = nodes.find((n) => n.id === e.target);
      issues.push({
        id: `val-source-inbound-${e.id}`,
        severity: 'error',
        title: 'Invalid inbound connection to a source',
        message: `"${target?.data?.label ?? e.target}" is a source and cannot receive data. Sources only emit.`,
        nodeId: e.target,
      });
    }
  });

  // Rule 5: sink nodes must not emit
  const sinkIds = new Set(sinks.map((s) => s.id));
  edges.forEach((e) => {
    if (sinkIds.has(e.source)) {
      const source = nodes.find((n) => n.id === e.source);
      issues.push({
        id: `val-sink-outbound-${e.id}`,
        severity: 'warning',
        title: 'Sink emitting downstream data',
        message: `"${source?.data?.label ?? e.source}" is a sink but has outgoing edges. Consider a processing node for fan-out.`,
        nodeId: e.source,
      });
    }
  });

  // Rule 6: simple cycle detection via DFS
  const adjacency = new Map<string, string[]>();
  edges.forEach((e) => {
    adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
  });
  const visiting = new Set<string>();
  const visited = new Set<string>();
  let cyclicConnections = 0;
  const dfs = (nodeId: string) => {
    if (visiting.has(nodeId)) {
      cyclicConnections += 1;
      return;
    }
    if (visited.has(nodeId)) return;
    visiting.add(nodeId);
    (adjacency.get(nodeId) ?? []).forEach(dfs);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  nodes.forEach((n) => dfs(n.id));
  if (cyclicConnections > 0) {
    issues.push({
      id: 'val-cycle',
      severity: 'error',
      title: 'Cyclic data flow detected',
      message: `${cyclicConnections} cycle(s) found. Pipelines must be directed acyclic graphs (DAG).`,
    });
  }

  // Rule 7: contract coverage advisories
  if (contractCoverage < 100 && issues.filter((i) => i.severity === 'error').length === 0) {
    issues.push({
      id: 'val-contract-coverage',
      severity: 'info',
      title: `Contract coverage ${contractCoverage}%`,
      message: `${contractNodes.length} of ${nodes.length} hops reference a published ODCS data contract.`,
    });
  }

  // Rule 8: warning-status nodes surface health advisories
  nodes
    .filter((n) => n.data?.status === 'warning')
    .forEach((n) => {
      issues.push({
        id: `val-health-${n.id}`,
        severity: 'warning',
        title: `Health advisory on ${n.data?.label ?? n.id}`,
        message: `${n.data?.technology ?? 'Node'} reports degraded metrics: ${(n.data?.metrics ?? [])
          .map((m) => `${m.label} ${m.value}`)
          .join(', ')}.`,
        nodeId: n.id,
      });
    });

  const hasErrors = issues.some((i) => i.severity === 'error');

  return {
    passed: !hasErrors,
    checkedAt: new Date().toISOString(),
    issues,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      sources: sources.length,
      sinks: sinks.length,
      orphanNodes: orphans.length,
      cyclicConnections,
      contractCoverage,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Auto-layout — layered topological arrangement                       */
/* ------------------------------------------------------------------ */

const NODE_WIDTH = 220;
const NODE_GAP_X = 70;
const NODE_GAP_Y = 130;
const LAYER_ORIGIN_X = 40;
const LAYER_ORIGIN_Y = 60;

export function autoLayout(nodes: ArchitectureFlowNode[], edges: ArchitectureFlowEdge[]): ArchitectureFlowNode[] {
  if (nodes.length === 0) return nodes;

  // Kahn layering: longest-path layering over the DAG (cycles tolerated by clamping)
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  nodes.forEach((n) => {
    inDegree.set(n.id, 0);
    adjacency.set(n.id, []);
  });
  edges.forEach((e) => {
    if (inDegree.has(e.target) && adjacency.has(e.source)) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
      adjacency.get(e.source)!.push(e.target);
    }
  });

  const layerOf = new Map<string, number>();
  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) {
      queue.push(id);
      layerOf.set(id, 0);
    }
  });

  let head = 0;
  let processed = 0;
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    processed += 1;
    const currentLayer = layerOf.get(current) ?? 0;
    (adjacency.get(current) ?? []).forEach((next) => {
      const candidateLayer = currentLayer + 1;
      if (candidateLayer > (layerOf.get(next) ?? -1)) {
        layerOf.set(next, candidateLayer);
      }
      const remaining = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, remaining);
      if (remaining === 0) queue.push(next);
    });
  }

  // Nodes stuck in cycles keep a layer after their deepest processed parent
  nodes.forEach((n) => {
    if (!layerOf.has(n.id)) layerOf.set(n.id, 0);
  });
  void processed;

  // Group nodes per layer, stacked vertically; layers spread horizontally
  const layers = new Map<number, string[]>();
  nodes.forEach((n) => {
    const layer = layerOf.get(n.id) ?? 0;
    layers.set(layer, [...(layers.get(layer) ?? []), n.id]);
  });

  const positioned = new Map<string, { x: number; y: number }>();
  layers.forEach((ids, layer) => {
    ids.forEach((id, row) => {
      positioned.set(id, {
        x: LAYER_ORIGIN_X + layer * (NODE_WIDTH + NODE_GAP_X),
        y: LAYER_ORIGIN_Y + row * NODE_GAP_Y,
      });
    });
  });

  return nodes.map((n) => ({ ...n, position: positioned.get(n.id) ?? n.position }));
}

/* ------------------------------------------------------------------ */
/* AI blueprint generation (mock simulation of AIDEN architect agent)  */
/* ------------------------------------------------------------------ */

export interface GenerateBlueprintRequest {
  prompt: string;
  pattern?: 'batch_etl' | 'streaming_cdc' | 'streaming_analytics' | 'reverse_etl';
}

export async function generateBlueprint(
  request: GenerateBlueprintRequest
): Promise<{ nodes: ArchitectureFlowNode[]; edges: ArchitectureFlowEdge[]; rationale: string }> {
  if (!isMockEnabled()) {
    return api.post('/architecture/generate', request);
  }

  // Client-side simulation — pick the closest curated blueprint to the prompt
  await new Promise((resolve) => setTimeout(resolve, 1400));

  const lower = request.prompt.toLowerCase();
  const wantsFraud = ['fraud', 'payment', 'card', 'velocity', 'risk'].some((k) => lower.includes(k));

  const nodes = wantsFraud ? BLUEPRINT_FRAUD_NODES : BLUEPRINT_ORDERS_CDC_NODES;
  const edges = wantsFraud ? BLUEPRINT_FRAUD_EDGES : BLUEPRINT_ORDERS_CDC_EDGES;

  const rationale = wantsFraud
    ? 'Architect Agent selected a streaming-analytics topology: payment webhooks land on Kafka, Flink computes 5-minute sliding velocity windows, and features publish to Redis with a risk alert branch.'
    : 'Architect Agent selected a streaming-CDC topology: PostgreSQL changes replicate through Debezium to Kafka, Spark tokenizes PII, a Great Expectations gate certifies quality, and Snowpipe streams into the Snowflake mart.';

  return {
    nodes: nodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: edges.map((e) => ({ ...e })),
    rationale,
  };
}

/* ------------------------------------------------------------------ */
/* Blueprint persistence + templates                                   */
/* ------------------------------------------------------------------ */

/**
 * Coerce any blueprint payload into the React Flow shape. The backend
 * normalizes legacy flat nodes ({id, kind, label} without `data`), but the
 * client must never trust that — an undefined `data` crashes the canvas and
 * the validation engine.
 */
function normalizeBlueprintPayload(payload: {
  nodes: unknown[];
  edges: unknown[];
}): { nodes: ArchitectureFlowNode[]; edges: ArchitectureFlowEdge[] } {
  const nodes = (payload.nodes ?? []).filter(
    (n): n is ArchitectureFlowNode =>
      !!n && typeof n === 'object' && 'id' in n && !!(n as ArchitectureFlowNode).data
  );
  const edges = (payload.edges ?? []).filter(
    (e): e is ArchitectureFlowEdge =>
      !!e && typeof e === 'object' && 'source' in e && 'target' in e
  );
  return { nodes, edges };
}

export async function fetchBlueprint(): Promise<{
  nodes: ArchitectureFlowNode[];
  edges: ArchitectureFlowEdge[];
}> {
  if (!isMockEnabled()) {
    return normalizeBlueprintPayload(await api.get('/architecture/blueprint'));
  }
  await new Promise((resolve) => setTimeout(resolve, 350));
  return {
    nodes: BLUEPRINT_ORDERS_CDC_NODES.map((n) => ({ ...n, data: { ...n.data } })),
    edges: BLUEPRINT_ORDERS_CDC_EDGES.map((e) => ({ ...e })),
  };
}

export async function fetchTemplates(): Promise<ArchitectureTemplateImport[]> {
  if (!isMockEnabled()) {
    return api.get('/architecture/templates');
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  return ARCHITECTURE_TEMPLATES;
}

type ArchitectureTemplateImport = (typeof ARCHITECTURE_TEMPLATES)[number];

export function buildValidationReportDefaults(): ArchitectureValidationReport {
  return { ...INITIAL_VALIDATION_REPORT, issues: [...INITIAL_VALIDATION_REPORT.issues], stats: { ...INITIAL_VALIDATION_REPORT.stats } };
}

/* ------------------------------------------------------------------ */
/* Export utilities                                                    */
/* ------------------------------------------------------------------ */

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function exportBlueprintJson(name: string, nodes: ArchitectureFlowNode[], edges: ArchitectureFlowEdge[]) {
  downloadFile(
    `${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_blueprint.json`,
    JSON.stringify({ name, exportedAt: new Date().toISOString(), nodes, edges }, null, 2),
    'application/json'
  );
}

export function exportBlueprintYaml(name: string, nodes: ArchitectureFlowNode[], edges: ArchitectureFlowEdge[]) {
  const lines: string[] = [
    `name: ${name}`,
    `exportedAt: "${new Date().toISOString()}"`,
    'nodes:',
  ];
  nodes.forEach((n) => {
    lines.push(`  - id: ${n.id}`);
    lines.push(`    label: "${n.data?.label ?? n.id}"`);
    lines.push(`    kind: ${n.data?.kind ?? 'processing'}`);
    lines.push(`    technology: "${n.data?.technology ?? 'Unspecified'}"`);
  });
  lines.push('edges:');
  edges.forEach((e) => {
    lines.push(`  - from: ${e.source}`);
    lines.push(`    to: ${e.target}`);
    if (e.label) lines.push(`    label: "${e.label}"`);
  });
  downloadFile(`${name.replace(/[^a-zA-Z0-9_-]/g, '_')}_blueprint.yaml`, lines.join('\n'), 'text/yaml');
}

/* ------------------------------------------------------------------ */
/* Handoff to Pipeline Builder (Phase 4 closed loop)                   */
/* ------------------------------------------------------------------ */

export function publishGraphToPipelineBuilder(
  name: string,
  nodes: ArchitectureFlowNode[],
  edges: ArchitectureFlowEdge[]
) {
  const validation = validateArchitecture(nodes, edges);
  const store = useHandoffStore.getState();
  store.publishGraph({
    name,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    sources: nodes.filter((n) => n.data?.kind === 'source').map((n) => n.data?.label ?? n.id),
    sinks: nodes.filter((n) => n.data?.kind === 'sink').map((n) => n.data?.label ?? n.id),
    pattern: 'Architecture Studio handoff',
    nodes: nodes.map((n) => ({
      id: n.id,
      label: n.data?.label ?? n.id,
      kind: n.data?.kind ?? 'processing',
      technology: n.data?.technology ?? 'Unspecified',
    })),
    publishedAt: new Date().toISOString(),
    validationPassed: validation.passed,
  });
}
