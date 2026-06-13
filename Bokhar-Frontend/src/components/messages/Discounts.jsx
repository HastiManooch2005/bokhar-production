export default function Transactions({ transactions }) {
  if (!transactions.length)
    return (
      <p className="text-gray-500 text-sm text-center">
        تراکنشی وجود ندارد.
      </p>
    );

  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <div
          key={t.id}
          className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">
              سفارش #{t.order_id}
            </span>

            <span className="font-bold text-[color:var(--bk-primary,#06b6d4)]">
              {Number(t.amount).toLocaleString("fa-IR")} تومان
            </span>
          </div>

          <div className="text-sm text-gray-500">
            تاریخ: {formatDate(t.created_at)}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(date) {
  const dt = new Date(date);

  return isNaN(dt.getTime())
    ? date
    : dt.toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}