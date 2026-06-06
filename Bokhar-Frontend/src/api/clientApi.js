const API_BASE = import.meta.env.VITE_API_URL + "/public";

async function get(url) {
  const res = await fetch(API_BASE + url);
  if (!res.ok) throw new Error("API Error " + res.status);
  return res.json();
}

const clientApi = {
  getCategories: () => get("/categories/"),
  getProducts: () => get("/products/"),
  getProduct: (id) => get(`/products/${id}/`),
};

export default clientApi;
