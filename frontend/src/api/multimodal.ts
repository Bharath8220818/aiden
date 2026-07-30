import api from './index';

export interface AnalyzeRequest {
  image: string;  // Base64 data URL
  prompt?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: string;
  error?: string;
  model?: string;
  prompt?: string;
  tokens?: number;
}

export const multimodalApi = {
  analyze: async (request: AnalyzeRequest): Promise<AnalyzeResponse> => {
    const response = await api.post('/api/v1/multimodal/analyze', request);
    return response.data;
  },

  uploadAndAnalyze: async (file: File, prompt?: string): Promise<AnalyzeResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (prompt) formData.append('prompt', prompt);

    const response = await api.post('/api/v1/multimodal/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getStatus: async (): Promise<{ available: boolean; model?: string }> => {
    const response = await api.get('/api/v1/multimodal/status');
    return response.data;
  },
};
