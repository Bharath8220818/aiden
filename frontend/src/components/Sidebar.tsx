import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const menuItems = [
    { label: 'Chat', icon: '💬', href: '/' },
    { label: 'Pipelines', icon: '⚙️', href: '/pipelines' },
    { label: 'Multimodal', icon: '🔮', href: '/multimodal' },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed z-40 h-screen w-64 bg-gray-50 p-6 text-gray-900 transition-transform duration-300 dark:bg-gray-900 dark:text-white md:relative ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-bold">Menu</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white md:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-4 py-2 transition-colors ${
                location.pathname === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
