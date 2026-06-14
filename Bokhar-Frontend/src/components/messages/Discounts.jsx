export default function Discounts({ discounts }) {
  if (!discounts.length)
    return <p className="text-gray-500 text-sm text-center">تخفیف فعالی وجود ندارد.</p>;

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {discounts.map(d => (
        <div
          key={d.id}
          className="p-4 rounded-2xl flex justify-between items-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow duration-200"
        >
          <div>
            <p className="font-medium">{d.title}</p>
            {d.valid_until && (
              <p className="text-sm text-gray-500 mt-1">
                اعتبار تا: {formatDate(d.valid_until)}
              </p>
            )}
          </div>
          <span className="text-[color:var(--bk-primary,#06b6d4)] font-bold">
            %{d.percent}
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
