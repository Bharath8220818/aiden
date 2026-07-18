import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'red' | 'purple';
}

const colorMap = {
  blue: 'from-primary-50 to-blue-100 text-primary-700',
  green: 'from-emerald-50 to-green-100 text-emerald-700',
  red: 'from-rose-50 to-red-100 text-rose-700',
  purple: 'from-violet-50 to-purple-100 text-violet-700',
};

const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => (
  <div className="soft-panel p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${colorMap[color]} text-2xl`}>
        {icon}
      </div>
    </div>
  </div>
);

export default StatsCard;
