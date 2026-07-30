export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'online' | 'away' | 'offline';
  avatar: string;
  pipelines: number;
  joinedAt: string;
}

export interface Comment {
  id: number;
  pipelineId: number;
  author: TeamMember;
  content: string;
  createdAt: string;
  resolved: boolean;
  replies?: Comment[];
}

export interface PipelineVersion {
  id: number;
  pipelineId: number;
  version: string;
  author: TeamMember;
  changes: string;
  createdAt: string;
  code?: string;
}

export interface SharedPipeline {
  id: number;
  pipelineId: number;
  sharedBy: TeamMember;
  sharedWith: TeamMember[];
  permission: 'view' | 'edit' | 'admin';
  sharedAt: string;
}

export interface TeamActivity {
  id: number;
  user: TeamMember;
  action: string;
  target: string;
  time: string;
  type: 'success' | 'approval' | 'create' | 'query' | 'fix';
}
