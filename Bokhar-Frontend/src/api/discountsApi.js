const API_BASE = import.meta.env.VITE_API_URL;

// ---------- Helper Request ----------
async function request(endpoint, method = "GET", body = null) {
  const options = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);

  if (!res.ok) {
    const errorText = await res.text();
    console.error("API Error:", errorText);
    throw new Error(`API Error ${res.status}`);
  }

  // برای DELETE معمولاً بدون محتوای response برمیگردد (204 No Content)
  if (res.status === 204) return null;
  
  return res.json();
}

// =====================================================
// PRODUCTS
// =====================================================

export const fetchProducts = () => request("/products/");
export const fetchProduct = (id) => request(`/products/${id}/`);
export const searchProducts = (query = "") =>
  request(`/products/search/?search=${encodeURIComponent(query)}`);
export const fetchProductFullPricing = (id) => request(`/products/${id}/`);

// =====================================================
// CATEGORIES
// =====================================================

export const fetchCategories = () => request("/categories/");
export const fetchCategory = (id) => request(`/categories/${id}/`);

// =====================================================
// PRODUCT DISCOUNTS
// =====================================================

export const createProductDiscount = (data) =>
  request("/discounts/product-discounts/", "POST", data);

// =====================================================
// GLOBAL DISCOUNTS
// =====================================================

export const fetchGlobalDiscounts = () =>
  request("/discounts/global-discounts/");

export const createGlobalDiscount = (data) =>
  request("/discounts/global-discounts/", "POST", data);

export const updateGlobalDiscount = (id, data) =>
  request(`/discounts/global-discounts/${id}/`, "PUT", data);

export const deleteGlobalDiscount = (id) =>
  request(`/discounts/global-discounts/${id}/`, "DELETE");

// =====================================================
// COUPONS
// =====================================================

export const fetchCoupons = () => request("/discounts/coupons/");
export const createCoupon = (data) => request("/discounts/coupons/", "POST", data);
export const updateCoupon = (id, data) => request(`/discounts/coupons/${id}/`, "PUT", data);
export const deleteCoupon = (id) => request(`/discounts/coupons/${id}/`, "DELETE");
