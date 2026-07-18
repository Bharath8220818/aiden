export interface Pipeline {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'pending' | 'running' | 'success' | 'failed' | 'paused';
  schedule?: string;
  source_type: string;
  destination_type: string;
  created_at?: string;
  updated_at?: string;
  last_run_at?: string;
  code?: string;
}

export interface PromptRequest {
  prompt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface DatabaseConnection {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}
