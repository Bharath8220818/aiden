import React from 'react';

interface HeaderProps {
  title?: string;
  showStatus?: boolean;
}

const Header: React.FC<HeaderProps> = ({ title = 'AIDEN', showStatus = true }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-lg md:text-xl">
            A
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-gray-900">{title}</h1>
            <p className="text-xs md:text-sm text-gray-500">Autonomous Data Engineering</p>
          </div>
        </div>
        {showStatus && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
              Online
            </span>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
