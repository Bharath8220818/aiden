export type AuditAction = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'run' | 'approve' | 'reject' | 'cancel';
export type AuditStatus = 'success' | 'failure';

export interface AuditLog {
  id: number;
  userId: number;
  username: string;
  action: AuditAction;
  resource: string;
  ipAddress: string;
  status: AuditStatus;
  timestamp: string;
  details: string;
}

export interface AuditFilter {
  search?: string;
  action?: AuditAction;
  status?: AuditStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
  sort?: 'newest' | 'oldest';
}
