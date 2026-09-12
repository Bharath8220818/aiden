type MessageHandler = (data: unknown) => void;

export class AidenWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: number | null = null;

  constructor(url?: string) {
    this.url = url || import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[AIDEN WebSocket] Connected');
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
        console.log('[AIDEN WebSocket] Disconnected');
        this.attemptReconnect();
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
