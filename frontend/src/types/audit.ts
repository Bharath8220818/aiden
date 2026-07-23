export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  severity: 'info' | 'warning' | 'error';
  ip_address?: string;
  created_at: string;
}

export interface AuditFilter {
  search?: string;
  severity?: 'info' | 'warning' | 'error';
  action?: string;
  resource_type?: string;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export interface AuditResponse {
  logs: AuditLog[];
  total: number;
  stats: {
    totalEvents: number;
    creates: number;
    failures: number;
    autoActions: number;
  };
}
