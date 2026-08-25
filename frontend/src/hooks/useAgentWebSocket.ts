/**
 * useAgentWebSocket — Real-time WebSocket connection for agent activity streaming.
 *
 * Connects to the AIDEN WebSocket endpoint and receives:
 *   - agent_step: When an agent starts, succeeds, or fails
 *   - execution_update: Orchestrator execution progress
 *   - pipeline_status: Pipeline stage updates
 *   - connector_health: Tool connector status changes
 *   - notification: System notifications
 *
 * Usage:
 *   const { connected, runs, latestRun, execute } = useAgentWebSocket();
 */
import { useEffect, useRef, useCallback, useState } from 'react';

// ── Types ─────────────────────────────────────────────────────────────

export interface AgentStep {
  agent: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  detail?: string;
  tools_used?: string[];
  execution_time_ms?: number;
  timestamp: string;
}

export interface AgentRun {
  run_id: string;
  objective: string;
  status: 'running' | 'success' | 'failure' | 'pending';
  intent?: {
    intent: string;
    confidence: number;
    agents: string[];
  };
  agents_used: string[];
  tools_used: string[];
  steps: AgentStep[];
  confidence?: number;
  execution_time_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface ConnectorHealthEvent {
  tool_name: string;
  status: 'healthy' | 'degraded' | 'error';
  latency_ms: number;
  timestamp: string;
}

export interface WebSocketMessage {
  type: 'agent_step' | 'execution_update' | 'pipeline_status' | 'connector_health' | 'notification' | 'pong' | 'connection';
  data?: any;
  run_id?: string;
  timestamp?: string;
}

interface UseAgentWebSocketReturn {
  connected: boolean;
  runs: AgentRun[];
  latestRun: AgentRun | null;
  connectorHealth: Record<string, ConnectorHealthEvent>;
  notifications: Array<{ type: string; message: string; timestamp: string }>;
  execute: (objective: string, projectId?: string) => void;
  disconnect: () => void;
  reconnect: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useAgentWebSocket(
  clientId: string = 'aiden-dashboard',
  maxRuns: number = 50,
): UseAgentWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const [connected, setConnected] = useState(false);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [latestRun, setLatestRun] = useState<AgentRun | null>(null);
  const [connectorHealth, setConnectorHealth] = useState<Record<string, ConnectorHealthEvent>>({});
  const [notifications, setNotifications] = useState<Array<{ type: string; message: string; timestamp: string }>>([]);

  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const wsUrl = baseUrl.replace(/^http/, 'ws') + `/api/v1/ws/${clientId}`;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setConnected(true);
        // Start ping to keep alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WebSocketMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Auto-reconnect after 3s
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [wsUrl]);

  const handleMessage = useCallback((msg: WebSocketMessage) => {
    const now = new Date().toISOString();

    switch (msg.type) {
      case 'agent_step': {
        const step: AgentStep = {
          agent: msg.data?.agent || 'unknown',
          status: msg.data?.status || 'running',
          detail: msg.data?.detail,
          tools_used: msg.data?.tools_used,
          execution_time_ms: msg.data?.execution_time_ms,
          timestamp: msg.timestamp || now,
        };
        const runId = msg.run_id || msg.data?.run_id;

        setRuns((prev) => {
          const idx = prev.findIndex((r) => r.run_id === runId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              steps: [...updated[idx].steps, step],
              status: step.status === 'failed' ? 'failure' : step.status === 'success' && updated[idx].steps.every((s) => s.status === 'success') ? 'success' : 'running',
              updated_at: now,
            };
            setLatestRun(updated[idx]);
            return updated;
          }
          // New run
          const newRun: AgentRun = {
            run_id: runId || `run_${Date.now()}`,
            objective: msg.data?.objective || '',
            status: 'running',
            agents_used: [step.agent],
            tools_used: step.tools_used || [],
            steps: [step],
            created_at: now,
            updated_at: now,
          };
          setLatestRun(newRun);
          return [newRun, ...prev].slice(0, maxRuns);
        });
        break;
      }

      case 'execution_update': {
        const runId = msg.run_id || msg.data?.run_id;
        setRuns((prev) => {
          const idx = prev.findIndex((r) => r.run_id === runId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              ...msg.data,
              updated_at: now,
            };
            setLatestRun(updated[idx]);
            return updated;
          }
          // Create new run from execution update
          const newRun: AgentRun = {
            run_id: runId || `run_${Date.now()}`,
            objective: msg.data?.objective || '',
            status: msg.data?.status || 'running',
            intent: msg.data?.intent,
            agents_used: msg.data?.agents_used || [],
            tools_used: msg.data?.tools_used || [],
            steps: [],
            confidence: msg.data?.confidence,
            execution_time_ms: msg.data?.execution_time_ms,
            created_at: msg.data?.created_at || now,
            updated_at: now,
          };
          setLatestRun(newRun);
          return [newRun, ...prev].slice(0, maxRuns);
        });
        break;
      }

      case 'connector_health': {
        const event: ConnectorHealthEvent = {
          tool_name: msg.data?.tool_name || 'unknown',
          status: msg.data?.status || 'healthy',
          latency_ms: msg.data?.latency_ms || 0,
          timestamp: msg.timestamp || now,
        };
        setConnectorHealth((prev) => ({
          ...prev,
          [event.tool_name]: event,
        }));
        break;
      }

      case 'notification': {
        setNotifications((prev) => [
          {
            type: msg.data?.type || 'info',
            message: msg.data?.message || '',
            timestamp: msg.timestamp || now,
          },
          ...prev,
        ].slice(0, 100));
        break;
      }
    }
  }, [maxRuns]);

  const execute = useCallback((objective: string, projectId?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'execute',
        data: { objective, project_id: projectId || 'default' },
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 500);
  }, [connect, disconnect]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return {
    connected,
    runs,
    latestRun,
    connectorHealth,
    notifications,
    execute,
    disconnect,
    reconnect,
  };
}

export default useAgentWebSocket;
