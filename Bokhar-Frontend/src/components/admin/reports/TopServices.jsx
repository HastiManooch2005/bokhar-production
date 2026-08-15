import React from 'react';

export default function TopServices({ list }) {
  return (
    <div className="space-y-3">
      {list.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          داده‌ای موجود نیست
        </div>
      ) : (
        list.map((service, index) => (
          <div
            key={service.id || service.name + index}
            className="flex items-center justify-between"
          >
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-200">
                {service.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-gray-400">
                {service.count} سفارش
              </div>
            </div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-200">
              #{index + 1}
            </div>
          </div>
        ))
      )}
    </div>
  );
}