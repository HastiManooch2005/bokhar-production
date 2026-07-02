import { Search as SearchIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function Search({
  value,
  onChange,
  items = [],
  onSelect,
  renderItem,
  loading = false,
  placeholder = "جستجو...",
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // بستن dropdown وقتی بیرون کلیک شد
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    onSelect(item);
    setOpen(false); // ساجست می‌پره
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        dir="rtl"
        className="flex items-center gap-2 shadow-lg px-3 py-3 rounded-3xl
        bg-white border border-sky-300/50
        dark:bg-[#E3E7F9] dark:border-white/80"
      >
        <SearchIcon className="text-gray-500 dark:text-gray-700" size={20} />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent outline-none text-sm text-gray-800"
        />
      </div>

      {loading && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-100">
          در حال جستجو...
        </div>
      )}

      {open && items.length > 0 && (
        <ul
          className="absolute w-full border rounded-2xl mt-2 z-50 shadow
           bg-white dark:bg-[#E3E7F9] dark:text-gray-600"
        >
          {items.map((item, index) => (
            <li
              key={index}
              onClick={() => handleSelect(item)}
              className="px-4 py-2 rounded-xl hover:bg-sky-100 dark:hover:bg-blue-950 dark:hover:text-gray-100 cursor-pointer"
            >
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}