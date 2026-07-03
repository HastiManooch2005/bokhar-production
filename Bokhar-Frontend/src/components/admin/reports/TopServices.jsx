export default function TopServices({ list }) {
  return (
    <div className="space-y-3">
      {list.map((service, index) => (
        <div
          key={service.service_id || service.name + index}
          className="flex items-center justify-between"
        >
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-200">{service.name}</div>
            <div className="text-xs text-slate-500 dark:text-gray-400">
              {service.count} سفارش — {service.revenue || Math.round(Math.random() * 1000000)} تومان
            </div>
          </div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-200">
            {Math.round(service.revenue || Math.random() * 1000000)} تومان
          </div>
        </div>
      ))}
    </div>
  );
}