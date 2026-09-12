import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items?: DropdownItem[];
  children?: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  children,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-50 mt-2 min-w-[12rem] bg-[#14171C] border border-[#242831] rounded-lg shadow-elevated p-1.5 focus:outline-none backdrop-blur-md',
              align === 'right' ? 'right-0' : 'left-0',
              className
            )}
          >
            {items ? (
              <div className="space-y-0.5">
                {items.map((item) => (
                  <button
                    key={item.id}
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled && item.onClick) {
                        item.onClick();
                        setIsOpen(false);
                      }
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-colors text-left',
                      item.danger
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-[#F5F7FA] hover:bg-[#1F242C] hover:text-white',
                      item.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {item.icon && <span className="text-[#9CA3AF]">{item.icon}</span>}
                      {item.label}
                    </span>
                    {item.shortcut && (
                      <span className="text-[10px] text-[#6B7280] font-mono">
                        {item.shortcut}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div onClick={() => setIsOpen(false)}>{children}</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
