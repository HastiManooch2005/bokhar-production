import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

export default api;

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// تبدیل Jalali به Gregorian
export const toGregorian = (jalaliDate) => {
  if (!jalaliDate) return null;
  try {
    const { DateObject } = require("react-date-object");
    const persian = require("react-date-object/calendars/persian");
    const persian_fa = require("react-date-object/locales/persian_fa");
    const gregorian = require("react-date-object/calendars/gregorian");
    
    const date = new DateObject({
      date: jalaliDate,
      calendar: persian,
      locale: persian_fa,
    });
    return date.convert(gregorian).format("YYYY-MM-DD");
  } catch {
    return jalaliDate;
  }
};

// ✅ export TIME_SLOT_MAP
export const TIME_SLOT_MAP = {
  "۸ صبح تا ۱۳": "morning",
  "۱۶ تا ۲۰": "evening",
};

const REVERSE_TIME_MAP = {
  "morning": "۸ صبح تا ۱۳",
  "evening": "۱۶ تا ۲۰",
};

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

export const getOrderSummary = async (payload) => {
  const response = await api.post(
    "/order/order-summary/",
    payload
  );
  return response.data;
};

// ✅ اصلاح: createOrder — امن‌تر
export const createOrder = async ({
  cartItems,
  datetime,
  location,
  discountCode,
  customerNote = ""
}) => {
  const payload = {
    // ✅ فقط شناسه‌ها — قیمت Backend محاسبه می‌کنه
    cart_items: cartItems.map(item => ({
      service_item_id: item.id || item.productId || item.product_id,
      quantity: item.quantity || item.qty || 1,
      pricing_tab_id: item.pricing_tab_id || null,
      material: item.material || "نخ",
      size: item.size || null,
    })),
    
    pickup_date: toGregorian(datetime.pickup.date),
    pickup_shift: TIME_SLOT_MAP[datetime.pickup.time],
    delivery_date: toGregorian(datetime.delivery.date),
    delivery_shift: TIME_SLOT_MAP[datetime.delivery.time],
    
    // ✅ آدرس: فقط ID
    address_id: location.id,
    
    coupon_code: discountCode || null,
    customer_note: customerNote
  };

  try {
    const csrfToken = getCookie('csrftoken');
    const response = await fetch(`${API_URL}/orders/create/`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken || ''
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Order creation failed:', errorData);
      return { success: false, errors: errorData || { general: "خطای سرور" } };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Order creation failed:', error);
    return { success: false, errors: { general: 'خطای سرور' } };
  }
};

export const getTimeCapacity = async (date, shift) => {
  const gregorianDate = toGregorian(date);
  const params = new URLSearchParams({
    date: gregorianDate,
    shift: TIME_SLOT_MAP[shift]
  });

  try {
    const response = await fetch(`${API_URL}/orders/check-capacity/?${params.toString()}`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return { available: false, remaining: 0 };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return { available: false, remaining: 0 };
  }
};