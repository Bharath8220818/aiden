import api from './index';

export interface ArchitectureComponent {
  id: string;
  name: string;
  type: string;
  category?: string;
  service?: string;
  icon?: string;
  status?: string;
  metrics?: Record<string, string>;
  config?: Record<string, unknown>;
}

export interface ArchitectureConnection {
  id?: string;
  source?: string;
  target?: string;
  from_id?: string;
  to_id?: string;
  label?: string;
  edgeType?: string;
  data_flow?: string;
  protocol?: string;
}

export interface ArchitectureResult {
  id?: string;
  title?: string;
  components: ArchitectureComponent[];
  connections: ArchitectureConnection[];
  design_principles?: string[];
  medallion_layers?: Record<string, string>;
  estimated_cost?: string;
  explanation?: string;
  terraform_code?: string;
}

export const architectureApi = {
  /**
   * Generate an architecture from a natural-language prompt.
   * Calls the backend LLM (Ollama → HuggingFace → rule-based fallback).
   */
  generate: async (
    prompt: string,
    cloudProvider?: string
  ): Promise<ArchitectureResult> => {
    const response = await api.post(
      '/api/v1/architecture/generate',
      { prompt, cloud_provider: cloudProvider || 'aws' },
      { timeout: 120000 }
    );
    return response.data;
  },
};
