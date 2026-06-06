import { useState, useRef } from "react";

export function useAddressSearch() {
  const [searchResults, setSearchResults] = useState([]);
  const searchTimeout = useRef(null);

  const searchAddress = (query) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      if (!query) return setSearchResults([]);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&accept-language=fa&limit=5&countrycodes=ir&q=${encodeURIComponent(
            query
          )}`
        );
        const data = await res.json();
        const unique = data.filter(
          (v, i, a) => a.findIndex((t) => t.display_name === v.display_name) === i
        );
        setSearchResults(unique);
      } catch (err) {
        console.error(err);
      }
    }, 400);
  };

  return { searchResults, searchAddress, setSearchResults };
}
