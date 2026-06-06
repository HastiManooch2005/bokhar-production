const API_KEY = import.meta.env.VITE_NESHAN_API_KEY;

const headers = {
  "Api-Key": API_KEY,
};

export async function searchLocation(term) {
  if (!term?.trim()) return [];

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/orders/neshan/search/?term=${encodeURIComponent(term)}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Search request failed");
  }

  const data = await response.json();

  return data.items || [];
}

export async function reverseGeocode(lat, lng) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/orders/neshan/reverse/?lat=${lat}&lng=${lng}`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Reverse geocode request failed");
  }

  return response.json();
}