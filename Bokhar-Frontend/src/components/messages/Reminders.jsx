export default function Reminders({ reminders }) {
  if (!reminders.length)
    return <p className="text-gray-500 text-sm text-center">هیچ یادآوری‌ای وجود ندارد.</p>;

  return (
    <div className="space-y-3">
      {reminders.map(r => (
        <div
          key={r.id}
          className={`p-4 rounded-2xl flex justify-between items-center transition-all duration-200
            ${r.read
              ? "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
              : "bg-[color:var(--bk-accent,#e6fcf5)] border-[color:var(--bk-primary,#06b6d4)] shadow-sm hover:shadow-md"
            }`}
        >
          <div>
            <p className="font-medium">{r.title}</p>
            {r.time && (
              <p className="text-sm text-gray-500 mt-1">{formatTime(r.time)}</p>
            )}
          </div>
          {!r.read && (
            <span className="text-xs text-[color:var(--bk-primary,#06b6d4)] font-semibold">
              جدید
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function formatTime(t) {
  const dt = new Date(t);
  return isNaN(dt.getTime()) ? t : dt.toLocaleString("fa-IR");
}
