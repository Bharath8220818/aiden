import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

/**
 * Resolves the API base URL:
 * 1. VITE_API_URL when set at build time (correct for Vercel/Render deploys),
 * 2. same-origin fallback when the site is served over https (production host
 *    proxying /api),
 * 3. localhost:8000 for local development only.
 */
const resolveBaseURL = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return `${window.location.origin}/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
};

const baseURL = resolveBaseURL();

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/* ------------------------------------------------------------------ */
/* Auth token wiring                                                   */
/* ------------------------------------------------------------------ */

/** Persisted zustand key from `features/auth/authStore.ts`. */
const AUTH_STORAGE_KEY = 'aiden-auth';

interface PersistedAuth {
  state: {
    user: unknown;
    token: string | null;
    expiresAt: string | null;
  };
  version: number;
}

/**
 * Reads the Bearer token from the persisted auth session.
 * Returns null when signed out or the session has expired.
 */
function readSessionToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedAuth;
    const { token, expiresAt } = parsed?.state ?? {};
    if (!token) return null;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return null;
    return token;
  } catch {
    return null;
  }
}

// Request interceptor: attach workspace + auth token from the real session
apiClient.interceptors.request.use(
  (config) => {
    const token = readSessionToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor: standard error parsing + session-expiry handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Expired/invalid session: clear it so the router guard redirects to /login
    if (error.response?.status === 401) {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as PersistedAuth;
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ ...parsed, state: { ...parsed.state, user: null, token: null, expiresAt: null } })
          );
        }
      } catch {
        /* ignore parse failures */
      }
    }

    const message = (error.response?.data as { message?: string })?.message || error.message;
    console.warn(`[AIDEN API Error] ${error.config?.url}:`, message);
    return Promise.reject(error);
  }
);

export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config).then((res) => res.data),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config).then((res) => res.data),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config).then((res) => res.data),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config).then((res) => res.data),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config).then((res) => res.data),
};

export default api;
