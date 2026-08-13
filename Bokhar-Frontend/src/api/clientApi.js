const API_BASE = import.meta.env.VITE_API_URL + "/public";

// ========== کش گلوبال ==========
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقیقه

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.time > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// =================================

async function get(url) {
  const cached = getCache(url);
  if (cached) return cached;

  const res = await fetch(API_BASE + url);
  if (!res.ok) throw new Error("API Error " + res.status);
  const data = await res.json();
  
  setCache(url, data);
  return data;
}

const clientApi = {
  getCategories: () => get("/categories/"),
  getProducts: () => get("/products/"),
  getProduct: (id) => get(`/products/${id}/`),
  // متد برای پاک کردن کش (اختیاری)
  clearCache: () => cache.clear(),
};

export default clientApi;