import { Search as SearchIcon } from "lucide-react";

export default function Search({
  value,
  onChange,
  items = [],
  onSelect,
  renderItem,
  loading = false,
  placeholder = "جستجو...",
}) {
  return (
    <div className="relative w-full">
      <div
        dir="rtl"
        className="flex items-center gap-2 shadow-lg px-3 py-3  rounded-3xl
        bg-white border border-sky-300/50
        dark:bg-white/60 dark:border-white/80 
        "
      >
        <SearchIcon className="text-gray-500 dark:text-gray-100" size={20} />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 "
        />
      </div>

      {loading && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-100">
          در حال جستجو...
        </div>
      )}

      {items.length > 0 && (
        <ul className="absolute w-full border rounded-2xl mt-2 z-50 shadow
           bg-white dark:bg-gray-500/95 dark:text-white 
         ">
          {items.map((item, index) => (
            <li
              key={index}
              onClick={() => onSelect(item)}
              className="px-4 py-2 rounded-xl hover:bg-sky-100 dark:hover:bg-purple-900 cursor-pointer"
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
