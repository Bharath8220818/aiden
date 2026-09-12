import React from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import * as LucideIcons from 'lucide-react';

export interface NavItemProps {
  label: string;
  path: string;
  iconName: string;
  badge?: string;
  badgeVariant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'ai';
  collapsed?: boolean;
  onClick?: () => void;
}

export const NavItem: React.FC<NavItemProps> = ({
  label,
  path,
  iconName,
  badge,
  badgeVariant = 'neutral',
  collapsed = false,
  onClick,
}) => {
  // Dynamically resolve icon from lucide-react with fallback
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || LucideIcons.Circle;

  return (
    <NavLink
      to={path}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-all duration-150',
          isActive
            ? 'bg-gradient-to-r from-indigo-500/15 to-transparent text-[#F5F7FA] font-semibold border-l-2 border-indigo-500'
            : 'text-[#9CA3AF] hover:text-[#F5F7FA] hover:bg-[#1A1D24]/60',
          collapsed && 'justify-center px-2 py-2.5'
        )
      }
      title={collapsed ? label : undefined}
    >
      <IconComponent className={cn('w-4 h-4 shrink-0 transition-transform group-hover:scale-110 text-[#9CA3AF] group-hover:text-[#F5F7FA]')} />

      {!collapsed && (
        <span className="truncate flex-1 tracking-tight text-left">{label}</span>
      )}

      {!collapsed && badge && (
        <Badge variant={badgeVariant} size="sm" className="ml-auto py-0 px-1.5 text-[10px]">
          {badge}
        </Badge>
      )}

      {collapsed && badge && (
        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-500" />
      )}
    </NavLink>
  );
};
