import { useState, type ReactNode, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, GitBranch, Database,
  BarChart3, Brain, Shield, Users,
  Settings, Bell, LogOut, Menu, X, ChevronRight,
  Sparkles, Layers, FileJson, Activity, CheckSquare,
  FileText, Globe, HelpCircle, MonitorSmartphone,
  Workflow, Library, Plug
} from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import { useAuthStore } from '../../store/authStore';

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

const navSections: NavSection[] = [
  {
    title: 'Core',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, href: '/dashboard' },
    ],
  },
  {
    title: 'Design & Build',
    items: [
      { label: 'Architecture Studio', icon: <Layers className="h-4 w-4" />, href: '/architecture' },
      { label: 'Architecture Canvas', icon: <Layers className="h-4 w-4" />, href: '/architecture-canvas' },
      { label: 'Schema Designer', icon: <Database className="h-4 w-4" />, href: '/schema-designer' },
      { label: 'Pipeline Builder', icon: <Workflow className="h-4 w-4" />, href: '/builder' },
      { label: 'Pipeline Designer', icon: <Workflow className="h-4 w-4" />, href: '/pipeline-designer' },
      { label: 'Pipeline Studio', icon: <Layers className="h-4 w-4" />, href: '/studio' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Tool Gateway', icon: <Plug className="h-4 w-4" />, href: '/tool-gateway' },
      { label: 'Pipelines', icon: <GitBranch className="h-4 w-4" />, href: '/pipelines' },
      { label: 'Monitoring', icon: <Activity className="h-4 w-4" />, href: '/monitoring' },
      { label: 'Analytics', icon: <BarChart3 className="h-4 w-4" />, href: '/analytics' },
    ],
  },
  {
    title: 'AI & Automation',
    items: [
      { label: 'AI Workspace', icon: <Brain className="h-4 w-4" />, href: '/ai-workspace' },
      { label: 'Agents', icon: <Sparkles className="h-4 w-4" />, href: '/agents', badge: '15' },
      { label: 'Agent Activity', icon: <Activity className="h-4 w-4" />, href: '/agent-activity', badge: 'LIVE' },
      { label: 'Multimodal', icon: <MonitorSmartphone className="h-4 w-4" />, href: '/multimodal' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { label: 'Approvals', icon: <CheckSquare className="h-4 w-4" />, href: '/approvals' },
      { label: 'Audit Logs', icon: <FileJson className="h-4 w-4" />, href: '/audit-logs' },
      { label: 'Team', icon: <Users className="h-4 w-4" />, href: '/team' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { label: 'Templates', icon: <FileText className="h-4 w-4" />, href: '/templates' },
      { label: 'Getting Started', icon: <HelpCircle className="h-4 w-4" />, href: '/getting-started' },
      { label: 'Knowledge Base', icon: <Library className="h-4 w-4" />, href: '/knowledge-base' },
      { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/settings' },
    ],
  },
];

const bottomNav = [
  { label: 'About', icon: <Globe className="h-4 w-4" />, href: '/about' },
  { label: 'Admin', icon: <Shield className="h-4 w-4" />, href: '/admin' },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['Core', 'Design & Build', 'Operations', 'AI & Automation']));
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const isActive = (href: string) => {
    // Exact match for flat routes, prefix match for parameterized routes
    if (href.includes(':id')) return pathname.startsWith(href.split('/:')[0]);
    return pathname === href;
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* ── Sidebar ── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-[var(--color-border)] px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 text-white font-bold text-sm shadow-lg shadow-purple-500/30">
              A
            </div>
            <div className="flex-1">
              <span className="text-base font-bold text-[var(--color-text)]">AIDEN</span>
              <p className="text-[10px] text-[var(--color-text-muted)]">Autonomous Data Engineering</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="btn-icon btn-sm md:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {navSections.map((section) => (
              <div key={section.title}>
                <button
                  onClick={() => toggleSection(section.title)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  {section.title}
                  <ChevronRight className={`h-3 w-3 transition-transform ${expandedSections.has(section.title) ? 'rotate-90' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {expandedSections.has(section.title) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-0.5 pt-0.5">
                        {section.items.map((item) => (
                          <Link
                            key={item.href}
                            to={item.href}
                            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                              isActive(item.href)
                                ? 'bg-purple-500/10 text-purple-400 font-medium'
                                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-text)]'
                            }`}
                          >
                            <span className={`${isActive(item.href) ? 'text-purple-400' : 'text-[var(--color-text-muted)]'}`}>
                              {item.icon}
                            </span>
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <span className="rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* Bottom nav */}
          <div className="border-t border-[var(--color-border)] p-3 space-y-0.5">
            {bottomNav.map((item) => (
              <Link key={item.href} to={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                  isActive(item.href)
                    ? 'bg-purple-500/10 text-purple-400 font-medium'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-card-hover)] hover:text-[var(--color-text)]'
                }`}>
                <span className="text-[var(--color-text-muted)]">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </aside>
      </>

      {/* ── Main Area ── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Floating Top Nav */}
        <header className="sticky top-0 z-30 mx-4 mt-4 md:mx-6 md:mt-6">
          <div className="glass rounded-2xl px-4 py-2.5 md:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="btn-icon btn-sm md:hidden">
                  <Menu className="h-4 w-4" />
                </button>
                <div className="hidden md:flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                  <span className="text-purple-400">AIDEN</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-[var(--color-text-secondary)]">
                    {navSections.flatMap(s => s.items).find(i => isActive(i.href))?.label || 'Dashboard'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Command palette trigger */}
                <button
                  onClick={() => {
                    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
                    window.dispatchEvent(event);
                  }}
                  className="hidden md:flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]"
                >
                  <span>Search...</span>
                  <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-card-hover)] px-1.5 py-0.5 text-[10px]">⌘K</kbd>
                </button>

                <ThemeToggle />
                
                <button onClick={() => navigate('/notifications')} className="btn-icon btn-sm relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-purple-500 text-[8px] font-bold text-white">3</span>
                </button>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="btn-icon btn-sm"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>

                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 text-xs font-bold text-purple-400 cursor-pointer">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8 lg:px-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
