import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  className,
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {label && <label className="block text-sm font-medium text-gray-400 mb-1.5">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border transition-all duration-200',
          'bg-[#0D1A2A] text-white placeholder-gray-500',
          error ? 'border-red-500' : 'border-[#1E293B] hover:border-purple-500/40',
          'focus:outline-none focus:ring-2 focus:ring-purple-500/20'
        )}
      >
        <div className="flex items-center gap-2">
          {selected?.icon && <span className="text-gray-400">{selected.icon}</span>}
          <span className={selected ? 'text-white' : 'text-gray-500'}>
            {selected?.label || placeholder}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-gray-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-1 w-full min-w-[200px] rounded-xl border border-[#1E293B] bg-[#111827] shadow-xl shadow-black/30 overflow-hidden',
              align === 'right' && 'right-0'
            )}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors',
                  option.value === value
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'text-gray-300 hover:bg-[#1E293B] hover:text-white',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {option.icon && <span className="text-gray-400">{option.icon}</span>}
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

Dropdown.displayName = 'Dropdown';
