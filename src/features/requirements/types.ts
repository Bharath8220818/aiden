export type InputMode = 'text' | 'audio' | 'sql' | 'diagram' | 'document';

export interface TextPayload {
  rawText: string;
  enhancedPrompt?: string;
  tags: string[];
}

export interface AudioPayload {
  audioBlobUrl?: string;
  durationSeconds: number;
  transcript: string;
  isRecording: boolean;
  confidence: number;
  timestamps: { time: string; text: string }[];
}

export interface SqlPayload {
  sqlQuery: string;
  dialect: 'postgresql' | 'snowflake' | 'bigquery' | 'mysql' | 'spark_sql';
  inferredSources: string[];
  inferredTarget?: string;
}

export interface DiagramPayload {
  imageUrl?: string;
  fileName?: string;
  detectedNodes: { id: string; name: string; type: 'source' | 'transform' | 'sink' | 'storage'; x?: number; y?: number }[];
  detectedEdges: { from: string; to: string; label?: string }[];
  extractedText: string[];
}

export interface DocumentPayload {
  fileName: string;
  fileType: 'ddl' | 'json_schema' | 'csv' | 'yaml_spec' | 'openapi';
  fileContent: string;
  parsedFieldsCount: number;
}

export interface MultimodalInputState {
  activeMode: InputMode;
  text: TextPayload;
  audio: AudioPayload;
  sql: SqlPayload;
  diagram: DiagramPayload;
  document: DocumentPayload;
}

export type PipelinePattern =
  | 'streaming_cdc'
  | 'batch_etl'
  | 'streaming_analytics'
  | 'reverse_etl'
  | 'data_quality_probe'
  | 'feature_store_pipeline';

export interface ExtractedEntity {
  name: string;
  type: 'source' | 'transform' | 'sink' | 'lookup';
  technology: string;
  schema?: string;
}

export interface IntentAnalysisResult {
  intentTitle: string;
  pipelinePattern: PipelinePattern;
  patternLabel: string;
  confidenceScore: number;
  executiveSummary: string;
  sourceEntities: ExtractedEntity[];
  targetEntities: ExtractedEntity[];
  detectedPii: {
    columnName: string;
    piiType: 'email' | 'ssn' | 'phone' | 'financial' | 'name' | 'address';
    riskLevel: 'high' | 'medium' | 'low';
    recommendedMasking: string;
  }[];
  suggestedSla: {
    latency: string;
    schedule: string;
    slaTier: 'Tier 1 (Mission Critical)' | 'Tier 2 (Operational)' | 'Tier 3 (Analytical)';
    availability: string;
  };
  agentSteps: {
    agent: string;
    action: string;
    status: 'completed' | 'in_progress' | 'queued';
  }[];
}

export interface ContractColumn {
  id: string;
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  description: string;
  piiClassification?: 'Confidential' | 'PII' | 'Internal' | 'Public';
  maskingPolicy?: string;
  businessRule?: string;
}

export interface ContractQualityRule {
  id: string;
  ruleType: 'completeness' | 'uniqueness' | 'freshness' | 'range' | 'regex_pattern' | 'custom_sql';
  targetColumn?: string;
  assertion: string;
  severity: 'error' | 'warning';
  threshold: string;
}

export interface ContractSLA {
  freshness: string;
  availability: string;
  maxLatency: string;
  updateFrequency: string;
  retentionPeriod: string;
  checkpointInterval: string;
}

export interface ContractGovernance {
  dataDomain: string;
  dataOwner: string;
  technicalOwner: string;
  securityClassification: 'Restricted' | 'Confidential' | 'Internal' | 'Public';
  complianceTags: string[];
  downstreamConsumers: string[];
}

export interface DataContractSpecification {
  id: string;
  contractVersion: string;
  title: string;
  status: 'draft' | 'under_review' | 'verified' | 'published';
  createdAt: string;
  updatedAt: string;
  datasetName: string;
  physicalTarget: string;
  targetFormat: 'Snowflake Table' | 'Delta Lake' | 'Iceberg' | 'Kafka Topic' | 'BigQuery Table';
  description: string;
  columns: ContractColumn[];
  qualityRules: ContractQualityRule[];
  sla: ContractSLA;
  governance: ContractGovernance;
  rawYaml: string;
}

export interface ValidationCheckItem {
  id: string;
  category: 'Schema' | 'Quality' | 'SLA' | 'Security';
  title: string;
  passed: boolean;
  message: string;
}
