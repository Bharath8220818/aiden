export interface ArchitectureComponent {
  id: string;
  name: string;
  type: 'source' | 'streaming' | 'processing' | 'storage' | 'analytics' | 'visualization' | 'governance';
  cloudProvider: 'aws' | 'azure' | 'gcp';
  service: string;
  config: Record<string, string>;
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  dataFlow: 'stream' | 'batch' | 'api';
  protocol: 'http' | 'kafka' | 'grpc' | 'jdbc' | 's3';
  label?: string;
}

export interface DesignPrinciple {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

export interface MedallionLayer {
  name: 'bronze' | 'silver' | 'gold';
  label: string;
  description: string;
}

export interface ArchitectureModel {
  id: string;
  title: string;
  components: ArchitectureComponent[];
  connections: Connection[];
  principles: DesignPrinciple[];
  layers: MedallionLayer[];
  estimatedCost?: string;
  explanation?: string;
  terraformCode?: string;
}
