export const APP_NAME = 'AIDEN';
export const APP_TAGLINE = 'Autonomous Data Engineering';

export interface NavItemConfig {
  label: string;
  path: string;
  iconName: string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ai';
}

export interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
}

export const SIDEBAR_NAV_SECTIONS: NavSectionConfig[] = [
  {
    title: 'Main',
    items: [
      { label: 'Overview', path: '/overview', iconName: 'LayoutDashboard' },
      { label: 'Requirement Studio', path: '/requirements', iconName: 'Sparkles', badge: 'AI', badgeVariant: 'ai' },
      { label: 'Architecture Studio', path: '/architecture', iconName: 'Network' },
      { label: 'Pipeline Builder', path: '/pipelines', iconName: 'GitBranch' },
      { label: 'SQL Workspace', path: '/sql', iconName: 'Terminal' },
      { label: 'Connections', path: '/connections', iconName: 'Database' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Pipeline Manager', path: '/pipelines', iconName: 'Layers' },
      { label: 'Monitoring', path: '/monitoring', iconName: 'Activity', badge: 'Live', badgeVariant: 'success' },
      { label: 'Incidents', path: '/incidents', iconName: 'AlertTriangle', badge: '1', badgeVariant: 'warning' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'AI Self-Healing', path: '/self-healing', iconName: 'Cpu', badge: 'Active', badgeVariant: 'ai' },
      { label: 'Agent Control Center', path: '/agents', iconName: 'Bot' },
      { label: 'Knowledge / RAG', path: '/knowledge', iconName: 'BookOpen' },
      { label: 'MCP Integrations', path: '/integrations', iconName: 'Plug' },
      { label: 'Approvals', path: '/approvals', iconName: 'CheckSquare', badge: '2', badgeVariant: 'warning' },
    ],
  },
];

export const WORKSPACES = [
  { id: 'ws-1', name: 'Acme Data Platform', slug: 'acme-data', role: 'Owner', pipelinesCount: 42 },
  { id: 'ws-2', name: 'Fintech Analytics Core', slug: 'fintech-core', role: 'Admin', pipelinesCount: 18 },
  { id: 'ws-3', name: 'IoT Stream Ingestion', slug: 'iot-stream', role: 'Member', pipelinesCount: 9 },
];

export const ENVIRONMENTS = [
  { id: 'development', label: 'Development', color: '#22C55E' },
  { id: 'staging', label: 'Staging', color: '#F59E0B' },
  { id: 'production', label: 'Production', color: '#EF4444' },
] as const;
