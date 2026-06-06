export default function OrdersTable({
  orders,
  toggleSort,
  toggleCheck,
  activeTab,
  activeSection,
  onRowClick,
  showCheckbox = true,
  showDeliveryBadge = false,
}) {
  const tab = activeTab || activeSection || "new";
  
  const remainingDays = (date) => {
    const today = new Date();
    const delivery = new Date(date);
    const diff = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  return (
    <div className="bg-white/50 dark:bg-white/50 backdrop-blur-lg border border-sky-200/50 rounded-2xl mt-6 p-6 shadow-xl">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-black mb-4 border-b border-white/10 pb-2">
        سفارش‌ها
      </h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-right">
          <thead className="text-black border-b border-white/10">
            <tr>
              <th className="p-3">شماره سفارش</th>
              <th className="p-3">نام مشتری</th>
              <th
                className="p-3 cursor-pointer select-none"
                onClick={() => toggleSort?.("deliveryDate")}
              >
                مهلت
              </th>
              {/* ستون فاصله به دقیقه - بین مهلت و مبلغ */}
              <th className="p-3">فاصله</th>
              <th
                className="p-3 cursor-pointer select-none"
                onClick={() => toggleSort?.("price")}
              >
                مبلغ
                {showDeliveryBadge && <span className="block text-[10px] font-normal text-gray-500">(با احتساب تعجیل)</span>}
              </th>
            </tr>
          </thead>

          <tbody>
            {orders?.map((order) => (
              <tr
                key={order.id}
                onClick={() => onRowClick(order)}
                className="hover:bg-white/80 dark:text-gray-900 transition border-b border-white/5 cursor-pointer"
              >
                <td className="p-3">
                  {showCheckbox ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCheck(order.id);
                      }}
                      disabled={tab === "done"}
                      className={`px-4 py-2 rounded-xl font-bold transition ${
                        order.isChecked
                          ? "bg-green-100 border border-green-500 text-green-600"
                          : "bg-red-100 border border-red-500 text-red-600"
                      }`}
                    >
                      {order.id}
                    </button>
                  ) : (
                    <span className="px-4 py-2 rounded-xl font-bold bg-gray-100 border border-gray-300 text-gray-700">
                      {order.id}
                    </span>
                  )}
                </td>
                <td className="p-3">{order.name}</td>
                <td className="p-3">
                  {remainingDays(order.deliveryDate)} روز
                </td>
                {/* مقدار فاصله به دقیقه */}
                <td className="p-3">
                  {order.distance ? `${order.distance} دقیقه` : '-'}
                </td>
                <td className="p-3">
                  <div className="flex flex-col">
                    <span>{order.price?.toLocaleString()} تومان</span>
                    {showDeliveryBadge && order.deliveryBadge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full w-fit mt-1 ${
                        order.deliveryBadge.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                        order.deliveryBadge.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {order.deliveryBadge.text}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
