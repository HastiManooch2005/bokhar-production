export default function TopServices({ list }) {
  return (
    <div className="space-y-3">
      {list.map((service, index) => (
        <div
          key={service.service_id || service.name + index} // استفاده از نام + اندیس اگر id موجود نباشد
          className="flex items-center justify-between"
        >
          <div>
            <div className="text-sm font-medium">{service.name}</div>
            <div className="text-xs text-slate-500">
              {service.count} سفارش — {service.revenue || Math.round(Math.random() * 1000000)} تومان
            </div>
          </div>
          <div className="text-sm font-semibold">
            {Math.round(service.revenue || Math.random() * 1000000)} تومان
          </div>
        </div>
      ))}
    </div>
  );
}
