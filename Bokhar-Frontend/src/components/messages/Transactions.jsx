export default function Transactions({ transactions }) {
  if (!transactions.length)
    return <p className="text-gray-500 text-sm text-center">هیچ تراکنشی ثبت نشده.</p>;

  return (
    <div className="space-y-3">
      {transactions.map(t => (
        <div
          key={t.id}
          className="p-4 rounded-2xl flex justify-between items-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow duration-200"
        >
          <div>
            <p className="font-medium">{t.title}</p>
            {t.date && (
              <p className="text-sm text-gray-500 mt-1">{formatDate(t.date)}</p>
            )}
          </div>
          <span className="text-[color:var(--bk-primary,#06b6d4)] font-bold">
            {formatAmount(t.amount)} تومان
          </span>
        </div>
      ))}
    </div>
  );
}

function formatDate(d) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("fa-IR");
}

function formatAmount(num) {
  return num.toLocaleString("fa-IR");
}
