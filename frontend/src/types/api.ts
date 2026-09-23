export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface ApiError {
  status: number;
  message: string;
  details?: Record<string, unknown>;
}
