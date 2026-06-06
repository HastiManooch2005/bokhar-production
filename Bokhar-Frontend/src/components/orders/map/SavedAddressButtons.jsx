import { useState, useRef, useEffect } from "react";
import { FaTrash } from "react-icons/fa";
import { Locate } from "lucide-react";

export default function SavedAddressButtons({
  addresses,
  onSelect,
  onDelete,
  onCurrentLocation,
}) {
  const [longPressId, setLongPressId] = useState(null);

  const timerRef = useRef(null);
  const preventClickRef = useRef(false);
  const containerRef = useRef(null);

  if (!addresses?.length && !onCurrentLocation) return null;

  const startPress = (id) => {
    preventClickRef.current = false;

    timerRef.current = setTimeout(() => {
      setLongPressId(id);
      preventClickRef.current = true;
      if (navigator.vibrate) navigator.vibrate(30);
    }, 600);
  };

  const endPress = () => {
    clearTimeout(timerRef.current);
  };

  const handleDelete = (item) => {
    onDelete?.(item.id);
    setLongPressId(null);
    preventClickRef.current = false;
  };

  // اضافه کردن listener برای کلیک خارج از دکمه‌ها
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setLongPressId(null);
        preventClickRef.current = false;
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] w-[95%] flex items-center gap-3 px-2"
    >
      {onCurrentLocation && (
        <button
          onClick={onCurrentLocation}
          className="
        w-9 h-9 rounded-full transition-colors flex items-center justify-center shadow-md
        bg-white/80 text-sky-600 hover:bg-white hover:text-sky-600 text-shadow-2xl
        dark:bg-white/80 dark:text-purple-800 dark:hover:bg-white dark:hover:text-purple-900
      "
          style={{ touchAction: "manipulation" }}
        >
          <Locate size={18} />
        </button>
      )}

      <div className="flex gap-2 ml-auto">
        {addresses.slice(0, 3).map((item) => {
          const isLongPress = longPressId === item.id;

          return (
            <div
              key={item.id}
              className="relative"
              onMouseDown={() => startPress(item.id)}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={() => startPress(item.id)}
              onTouchEnd={endPress}
            >
              <button
                onClick={(e) => {
                  if (preventClickRef.current) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                  }
                  onSelect(item);
                }}
                className={`px-3 py-1 rounded-2xl text-sm border transition
                  ${
                    isLongPress
                      ? "bg-red-100 border-red-400"
                      : " bg-white/80 dark:bg-white/80 text-sky-600 hover:bg-white hover:text-sky-600 text-shadow-2xldark:bg-white/70 dark:text-purple-800 dark:hover:bg-white dark:hover:text-purple-900"
                  }`}
                style={{ touchAction: "manipulation" }}
              >
                {item.title}
              </button>

              {isLongPress && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item);
                  }}
                  className="absolute -left-3 -top-1 bg-white rounded-full p-1 shadow text-red-600"
                >
                  <FaTrash size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
