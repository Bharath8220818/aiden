export interface Approval {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  risk: 'low' | 'medium' | 'high' | 'critical';
  created_by: number;
  created_by_name: string;
  change: string;
  resource_type: string;
  resource_name: string;
  created_at: string;
  updated_at?: string;
  reviewed_by?: number;
  reviewed_by_name?: string;
  review_comment?: string;
  reviewed_at?: string;
}

export interface ApprovalAction {
  id: number;
  approval_id: number;
  action: 'approve' | 'reject' | 'comment';
  user_id: number;
  user_name: string;
  comment?: string;
  created_at: string;
}
