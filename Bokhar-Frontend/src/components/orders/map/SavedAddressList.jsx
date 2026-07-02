import { FaTrash, FaEdit } from "react-icons/fa";

export default function SavedAddressList({
  addresses,
  onSelect,
  onEdit,
  onDelete,
}) {
  if (!addresses.length) return null;

  return (
    <div dir="rtl" className="w-full md:w-[75%] mx-auto mt-4 flex flex-col gap-3 mb-15 md:mb-0">
      {addresses.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-3
          rounded-xl border bg-white dark:bg-[#262B40] dark:border-gray-700
          p-4 shadow-sm"
        >
          {/* info */}
          <div
            className="flex-1 cursor-pointer"
            onClick={() => onSelect(item)}
          >
            <p className="font-bold text-gray-800 dark:text-gray-200">
              {item.title}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {item.address}
            </p>
            {item.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {item.description}
              </p>
            )}
          </div>

          {/* actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(item)}
              className="p-2 rounded-lg bg-sky-100 text-sky-600 hover:bg-sky-200 dark:bg-[#1a1f2e] dark:text-[#8AA1C4] dark:hover:bg-[#2d3350]"
            >
              <FaEdit size={14} />
            </button>

            <button
              onClick={() => onDelete(item.id)}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}