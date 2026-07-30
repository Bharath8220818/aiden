export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ApprovalSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ApprovalAction = 'restart' | 'schema_update' | 'threshold_breach' | 'cost_optimization' | 'key_rotation';

export interface Approval {
  id: number;
  pipelineId: number;
  action: ApprovalAction;
  description: string;
  severity: ApprovalSeverity;
  status: ApprovalStatus;
  requestedBy: {
    id: number;
    username: string;
    initials: string;
  };
  requestedAt: string;
  details: string;
  riskScore?: number;
}
