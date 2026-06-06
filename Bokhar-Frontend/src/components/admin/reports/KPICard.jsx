import React from 'react';

export default function KPICard({ title, value, icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className="p-5 rounded-2xl bg-white/30 dark:bg-white/50 backdrop-blur-lg
      border border-sky-200/50 hover:bg-white/80 dark:hover:text-gray-800
      transition-all shadow-xl
      hover:scale-[1.03] active:scale-[0.98]
      flex flex-col"
    >
      {icon && (
        <div
          className={`w-12 h-12 mb-3 flex items-center justify-center rounded-full 
          bg-gradient-to-br ${color} text-white`}
        >
          {icon}
        </div>
      )}

      <div className="text-xs text-slate-500 dark:text-gray-700">
        {title}
      </div>

      <div className="mt-3 text-2xl font-bold text-slate-800 dark:text-gray-900">
         {value !== null && value !== undefined ? value : "•"}
      </div>
    </div>
  );
}
