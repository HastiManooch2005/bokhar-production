import { Search, MapPin } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function SearchLocation({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const skipNextSearch = useRef(false);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true);

        const url = new URL(
          `${import.meta.env.VITE_API_URL}/order/neshan/search/`
        );

        url.searchParams.append("term", query);

        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("Search failed");
        }

        const data = await res.json();

        setResults(data.items || []);
      } catch (err) {
        console.error("Search Error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (item) => {
    const lat = item?.location?.y;
    const lng = item?.location?.x;

    if (lat == null || lng == null) {
      console.error("Invalid location:", item);
      return;
    }

    onSelect({
      lat,
      lng,
      address: item.address || item.title || "",
    });

    skipNextSearch.current = true;
    setResults([]);
    setQuery(item.address || item.title || "");
  };

  return (
    <div className="relative w-full">
      <div
        className="
          flex items-center gap-2
          bg-white/90
          dark:bg-[#262B40]
          border border-sky-300
          dark:border-[#8AA1C4]
          rounded-2xl
          px-4 py-3
          shadow-md
        "
      >
        <Search className="w-4 h-4 text-sky-500 dark:text-[#8AA1C4]" />
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
            text-gray-800
            dark:text-gray-200
            placeholder:text-gray-400
            dark:placeholder:text-gray-500
          "
        />
      </div>

      {results.length > 0 && (
        <ul
          dir="rtl"
          className="
            absolute
            bottom-full
            mb-2
            w-full
            bg-white
            dark:bg-[#262B40]
            rounded-2xl
            shadow-xl
            z-50
            max-h-64
            overflow-y-auto
            border
            border-gray-100
            dark:border-gray-600
          "
        >
          {results.map((item, index) => (
            <li
              key={index}
              onClick={() => handleSelect(item)}
              className="
                flex
                gap-3
                px-4
                py-3
                cursor-pointer
                hover:bg-sky-50
                dark:hover:bg-gray-700
              "
            >
              <MapPin className="w-4 h-4 mt-1 text-sky-500 dark:text-[#8AA1C4]" />
              <div>
                <div className="text-sm text-gray-800 dark:text-gray-200">
                  {item.title}
                </div>
                {item.address && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.address}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {loading && (
        <div className="absolute left-5 top-1/2 text-xs text-gray-400 dark:text-gray-500">
          در حال جستجو...
        </div>
      )}
    </div>
  );
}