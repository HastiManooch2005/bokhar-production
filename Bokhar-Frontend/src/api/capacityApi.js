import axios from 'axios';

const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,  // ✅ خیلی مهم برای Session Auth
  headers: {
    'Content-Type': 'application/json',
  }
});

// ✅ کپی دقیق CSRF از cartService.js
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

api.interceptors.request.use((config) => {
  const token = getCookie('csrftoken');
  if (token) {
    config.headers['X-CSRFToken'] = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('❌ Unauthorized - Please login');
    }
    return Promise.reject(error);
  }
);

// ✅ آبجکت capacityApi که TimeOrders.jsx انتظار داره
export const capacityApi = {
  getRushFeeSettings: async () => {
    return await api.get('/order/rush-fee-settings/');
  },

  getDeliveryTemplates: async () => {
    return await api.get('/order/delivery-templates/');
  },

  updateDeliveryTemplate: async (id, data) => {
    return await api.put(`/order/delivery-templates/${id}/update/`, data);
  },

  updateRushFeeSettings: async (data) => {
    return await api.put('/order/rush-fee-settings/', data);
  },

  checkCapacity: async (date, shift) => {
    return await api.get('/order/check-capacity/', {
      params: { date, shift }
    });
  },

  validateOrder: async (orderData) => {
    return await api.post('/order/validate-order/', orderData);
  }
};


// ✅ export default هم بذار اگه جای دیگه نیاز داشتی
export default api;
