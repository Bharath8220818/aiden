import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  GitBranch,
  Activity,
  Cpu,
  BarChart3,
  BookOpen,
  CheckCircle,
  Settings,
  LogOut,
  ChevronLeft,
  PanelLeftClose,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Sparkles, label: 'AI Workspace', path: '/builder' },
  { icon: GitBranch, label: 'Pipelines', path: '/pipelines' },
  { icon: Activity, label: 'Monitoring', path: '/monitoring' },
  { icon: Cpu, label: 'AI Agents', path: '/agents' },
  { icon: BarChart3, label: 'Analytics', path: '/analytics' },
  { icon: BookOpen, label: 'Knowledge Base', path: '/templates' },
  { icon: CheckCircle, label: 'Approvals', path: '/approvals' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-[#0D1A2A] border-r border-[#1E293B] flex-shrink-0 z-40 sticky top-0 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo + Collapse toggle */}
      <div className="flex items-center gap-2 px-4 h-16 shrink-0 border-b border-[#1E293B]">
        <div className="w-8 h-8 min-w-[2rem] rounded-lg bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-purple-600/30">
          A
        </div>
        {!collapsed && (
          <div className="flex flex-col leading-none overflow-hidden">
            <span className="text-base font-bold text-white tracking-tight truncate">AIDEN</span>
            <span className="text-[9px] font-medium uppercase tracking-widest text-gray-500 truncate">Enterprise AI OS</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg hover:bg-[#1E293B] transition-colors text-gray-500 hover:text-white shrink-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeftClose size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${active
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-[#1E293B] border border-transparent'
                }
                ${collapsed ? 'justify-center px-0' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#1E293B] p-2 space-y-2 shrink-0">
        {/* Upgrade */}
        <button
          className={`w-full flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/20 text-purple-400 hover:from-purple-600/30 hover:to-cyan-600/30 transition-all text-sm font-medium ${
            collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
          }`}
          title="Upgrade Plan"
        >
          <Sparkles size={16} />
          {!collapsed && <span className="truncate">Upgrade Plan</span>}
        </button>

        {/* User */}
        <div
          className={`flex items-center gap-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors ${
            collapsed ? 'justify-center px-2 py-2' : 'px-2 py-2'
          }`}
          onClick={() => navigate('/settings')}
        >
          <div className="w-8 h-8 min-w-[2rem] rounded-full bg-gradient-to-br from-purple-500 to-cyan-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user?.full_name?.[0] || user?.username?.[0] || 'A'}
          </div>
          {!collapsed && (
            <>
              <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-200 truncate">{user?.full_name || user?.username || 'John Doe'}</span>
                <span className="text-[10px] text-gray-500 truncate">System Architect</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all shrink-0"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

Sidebar.displayName = 'Sidebar';
