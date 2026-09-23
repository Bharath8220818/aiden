type MessageHandler = (data: unknown) => void;

/**
 * Default WS endpoint:
 * 1. explicit VITE_WS_URL when set (production config),
 * 2. same-origin `/api/v1/ws` — correct for the Nginx container path and
 *    the Vite dev proxy, and secure (wss) whenever the page is https.
 */
function defaultWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8000/api/v1/ws';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/api/v1/ws`;
}

export class AidenWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: number | null = null;

  constructor(url?: string) {
    this.url = url || import.meta.env.VITE_WS_URL || defaultWsUrl();
  }

  /** Resolve the current Bearer token from the persisted auth session. */
  private sessionToken(): string | null {
    try {
      const raw = localStorage.getItem('aiden-auth');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { state?: { token?: string | null; expiresAt?: string | null } };
      const { token, expiresAt } = parsed.state ?? {};
      if (!token) return null;
      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return null;
      return token;
    } catch {
      return null;
    }
  }

  connect() {
    try {
      // The browser WebSocket API cannot set Authorization headers — the
      // backend accepts the JWT via the `token` query parameter instead.
      // Without a session, don't dial: the backend would 403 and retrying
      // would just spam the console on public pages (landing, auth popup).
      const token = this.sessionToken();
      if (!token) {
        if (import.meta.env.DEV) console.debug('[AIDEN WebSocket] No session — skipping connect');
        return;
      }
      const url = `${this.url}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        if (import.meta.env.DEV) console.debug('[AIDEN WebSocket] Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const type = parsed.type || 'message';
          const handlers = this.handlers.get(type);
          if (handlers) {
            handlers.forEach((h) => h(parsed.data || parsed));
          }
        } catch {
          console.warn('[AIDEN WebSocket] Unparseable message:', event.data);
        }
      };

      this.ws.onclose = () => {
        if (import.meta.env.DEV) console.debug('[AIDEN WebSocket] Disconnected');
        // Retry only while a session exists; a signed-out visitor's socket
        // stays down until connect() is called again after login.
        if (this.sessionToken()) this.attemptReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[AIDEN WebSocket] Error event:', err);
      };
    } catch {
      // Offline fallback
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
      this.reconnectTimer = window.setTimeout(() => this.connect(), delay);
    }
  }

  subscribe(eventType: string, handler: MessageHandler) {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)?.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new AidenWebSocketClient();
