import { useState, useEffect } from "react";
import axios from "axios";
import { Search, MapPin } from "lucide-react";

export default function SearchLocation({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);

  // --- Auto Suggest ---
  useEffect(() => {
    if (selectedFromList) {
      setSelectedFromList(false);
      return;
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);

        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/order/neshan/search/`,
          {
            params: {
              term: query,
            },
          }
        );

        setResults(res.data.items || []);
      } catch (err) {
        console.error("Search Error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, selectedFromList]);

  return (
    <div className="relative w-full">
      {/* INPUT */}
      <div
        className="
          flex
          items-center
          gap-2

          bg-white/90
          dark:bg-[#262B40]

          border
          border-sky-300
          dark:border-gray-600

          rounded-2xl

          px-4
          py-3

          shadow-md
          shadow-sky-100

          backdrop-blur
        "
      >
        <Search className="w-4 h-4 text-sky-500" />

        <input
          type="text"
          placeholder="جستجوی آدرس..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="
            flex-1
            bg-transparent
            outline-none
            text-sm
            text-gray-700
            dark:text-gray-200
          "
        />
      </div>

      {/* RESULTS */}
      {results.length > 0 && (
        <ul
          dir="rtl"
          className="
            absolute
            bottom-full
            mb-2
            w-full

            bg-white/95
            dark:bg-[#262B40]/95

            border
            border-sky-300
            dark:border-gray-600

            rounded-2xl

            shadow-xl
            shadow-sky-200/60

            z-50

            max-h-64
            overflow-y-auto
            scroll-smooth
            overscroll-contain

            divide-y
            divide-gray-100
            dark:divide-gray-700
          "
        >
          {results.map((item, index) => (
            <li
              key={index}
              onClick={() => {
                onSelect(item.location.y, item.location.x);

                setSelectedFromList(true);
                setQuery(item.address || item.title || "");
                setResults([]);
              }}
              className="
                flex
                items-start
                gap-3

                px-4
                py-3

                cursor-pointer
                transition-colors

                hover:bg-sky-50
                dark:hover:bg-slate-700/50
              "
            >
              <MapPin className="w-4 h-4 mt-1 text-sky-500 shrink-0" />

              <div className="flex flex-col">
                <span className="text-sm text-gray-800 dark:text-gray-100">
                  {item.title}
                </span>

                {item.address && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {item.address}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* LOADING */}
      {loading && (
        <div
          className="
            absolute
            left-5
            top-1/2
            -translate-y-1/2
            text-xs
            text-gray-400
            dark:text-gray-500
          "
        >
          در حال جستجو...
        </div>
      )}
    </div>
  );
}