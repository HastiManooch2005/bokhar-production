import { useState, useEffect } from "react";
import axios from "axios";
import { Search, MapPin } from "lucide-react";

export default function SearchLocation({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Auto Suggest ---
useEffect(() => {
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
}, [query]);

  return (
    <div className="relative w-full">
      {/* INPUT */}
      <div
        dir="rtl"
        className="
          flex items-center gap-2
          bg-white/80 dark:bg-[#262B40]/80
          border border-sky-300 dark:border-gray-600
          px-3 py-2 rounded-2xl
          shadow-sm shadow-sky-200/60
          focus-within:ring-1
          focus-within:ring-sky-400
          dark:focus-within:ring-[#8AA1C4]
          transition-all
        "
      >
        <Search
          className="text-gray-500 dark:text-gray-300"
          size={20}
        />

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
          "
        >
{results.map((item, index) => (
  <li
    key={index}
    onClick={() => {
      onSelect({
        lat: item.location.y,
        lng: item.location.x,
        address: item.address,
      });

      setQuery(item.address);
      setResults([]);
    }}
  >
    {item.title}
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