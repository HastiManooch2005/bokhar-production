const API_BASE = process.env.REACT_APP_API_URL;

// تبدیل Jalali به Gregorian و TIME_SLOT_MAP و REVERSE_TIME_MAP مثل قبل ...

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

export const createOrder = async ({
  cartItems,
  datetime,
  location,
  discountCode,
  customerNote = ""
}) => {
  const payload = {
    cart_items: cartItems.map(item => ({
      service_item_id: item.id,
      quantity: item.quantity,
      unit_price: item.finalPrice || item.price,
      original_price: item.originalPrice || item.price,
      description: item.note || ""
    })),
    pickup_date: toGregorian(datetime.pickup.date),
    pickup_shift: TIME_SLOT_MAP[datetime.pickup.time],
    delivery_date: toGregorian(datetime.delivery.date),
    delivery_shift: TIME_SLOT_MAP[datetime.delivery.time],
    address_data: {
      title: location.title,
      address: location.address,
      plaque: location.plaque,
      unit: location.unit,
      description: location.description,
      latitude: location.coords?.lat,
      longitude: location.coords?.lng
    },
    coupon_code: discountCode || null,
    service_type: datetime.pricing?.type,
    rush_fee_amount: datetime.pricing?.amount || 0,
    customer_note: customerNote
  };

  try {
    const csrfToken = getCookie('csrftoken');
    const response = await fetch(`${API_BASE}/orders/create/`, {
      method: 'POST',
      credentials: 'include', // ارسال کوکی‌ها
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
    const response = await fetch(`${API_BASE}/orders/check-capacity/?${params.toString()}`, {
      method: 'GET',
      credentials: 'include', // ارسال کوکی‌ها
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
