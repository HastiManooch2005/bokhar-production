const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

async function fetchWithAuth(url, options = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${API_BASE}${url}`, {
    credentials: "include",
    ...options,
    headers: isFormData
      ? { ...options.headers }
      : {
          "Content-Type": "application/json",
          ...options.headers,
        },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // ✅ اگر پاسخ body نداشت (DELETE / 204)
  if (response.status === 204) {
    return null;
  }

  // ✅ اگر content-type JSON نبود
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return null;
  }

  return response.json();
}


const api = {
  getCategories: () => fetchWithAuth("/categories/"),
  createCategory: (name) =>
    fetchWithAuth("/categories/", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteCategory: (id) =>
    fetchWithAuth(`/categories/${id}/`, { method: "DELETE" }),

  getProducts: () => fetchWithAuth("/products/"),
  getProduct: (id) => fetchWithAuth(`/products/${id}/`),

  createProduct: (data) => {
    // اگر فایل عکس وجود داشت، FormData بساز
    if (data.imageFile instanceof File) {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('category', data.category);
      formData.append('status', data.status || 'active');
      formData.append('base_price', data.base_price || 0);
      // pricing رو به صورت JSON string می‌فرستیم چون FormData nested object نمی‌پذیره
      formData.append('pricing', JSON.stringify(data.pricing));
      formData.append('image', data.imageFile);
      
      return fetchWithAuth("/products/create/", {
        method: "POST",
        body: formData,
      });
    }
    
    // در غیر این صورت JSON معمولی
    return fetchWithAuth("/products/create/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProduct: (id, data) => {
    if (data.imageFile instanceof File) {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('category', data.category);
      formData.append('status', data.status || 'active');
      formData.append('base_price', data.base_price || 0);
      formData.append('pricing', JSON.stringify(data.pricing));
      formData.append('image', data.imageFile);
      
      return fetchWithAuth(`/products/${id}/update/`, {
        method: "PUT",
        body: formData,
      });
    }
    
    return fetchWithAuth(`/products/${id}/update/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteProduct: (id) =>
    fetchWithAuth(`/products/${id}/delete/`, { method: "DELETE" }),

  searchProducts: (q) =>
    fetchWithAuth(`/products/search/?q=${encodeURIComponent(q)}`),
};

export default api;
