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
          rounded-xl border bg-white dark:bg-gray-800
          p-4 shadow-sm"
        >
          {/* info */}
          <div
            className="flex-1 cursor-pointer"
            onClick={() => onSelect(item)}
          >
            <p className="font-bold text-gray-800 dark:text-gray-100">
              {item.title}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {item.address}
            </p>
            {item.description && (
              <p className="text-xs text-gray-500 mt-1">
                {item.description}
              </p>
            )}
          </div>

          {/* actions */}
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(item)}
              className="p-2 rounded-lg bg-sky-100 text-sky-600 hover:bg-sky-200"
            >
              <FaEdit size={14} />
            </button>

            <button
              onClick={() => onDelete(item.id)}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
            >
              <FaTrash size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
