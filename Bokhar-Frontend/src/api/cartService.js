const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const GUEST_CART_KEY = "guest_cart";
const CART_BACKUP_KEY = "cart_backup";
const CART_EXPIRY_HOURS = 24;

export const buildCartKey = (productId, service, material, size) => {
  const svc = service || "-";
  const mat = material || "-";
  const sz = size === null || size === undefined || size === "-" ? "null" : String(size);
  return `${productId}_${svc}_${mat}_${sz}`;
};

export const saveCartBackup = (items) => {
  try {
    const data = { items, timestamp: Date.now(), version: 1 };
    localStorage.setItem(CART_BACKUP_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving cart backup:", e);
  }
};

export const getCartBackup = () => {
  try {
    const raw = localStorage.getItem(CART_BACKUP_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.timestamp) return null;
    const ageHours = (Date.now() - data.timestamp) / (1000 * 60 * 60);
    if (ageHours > CART_EXPIRY_HOURS) {
      localStorage.removeItem(CART_BACKUP_KEY);
      return null;
    }
    return data.items || [];
  } catch {
    return null;
  }
};

export const clearCartBackup = () => {
  localStorage.removeItem(CART_BACKUP_KEY);
};

export const getGuestCart = () => {
  try {
    const cart = localStorage.getItem(GUEST_CART_KEY);
    return cart ? JSON.parse(cart) : [];
  } catch {
    return [];
  }
};

export const saveGuestCart = (cart) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
};

const generateGuestId = () =>
  `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const fetchCart = async () => {
  try {
    const res = await fetch(`${API_BASE}/cart/?_t=${Date.now()}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    if (res.status === 401) {
      const guestCart = getGuestCart();
      return {
        success: true,
        data: {
          items: guestCart,
          total: guestCart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
          is_guest: true,
        },
      };
    }

    if (!res.ok) throw new Error("Failed to fetch cart");
    const data = await res.json();
    return { success: true, data: { ...data, is_guest: false } };

  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const addToCart = async (productId, quantity = 1, options = {}, skipGuestFallback = false) => {
  try {
    const payload = {
      quantity: Number(quantity),
      service: options.service || "",
      material: options.material || "",
      size: (options.size && options.size !== "-" && options.size !== "" && options.size !== undefined && options.size !== null)
        ? Number(options.size)
        : null,
    };

    const res = await fetch(`${API_BASE}/cart/add/${productId}/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 401 && !skipGuestFallback) {
      const guestCart = getGuestCart();
      const cleanSize = (options.size && options.size !== "-" && options.size !== "")
        ? options.size
        : null;

      const index = guestCart.findIndex(
        (i) =>
          i.product_id === productId &&
          i.service === options.service &&
          i.material === options.material &&
          i.size === cleanSize
      );

      if (index >= 0) {
        guestCart[index].quantity += Number(quantity);
        guestCart[index].finalLineTotal = guestCart[index].quantity * (guestCart[index].price || options.price || 0);
      } else {
        const unitPrice = options.price || 0;
        const qty = Number(quantity);

        guestCart.push({
          id_unique: generateGuestId(),
          product_id: productId,
          product_name: options.product_name || "",
          quantity: qty,
          qty: qty,
          price: unitPrice,
          unit_price: unitPrice,
          unitPrice: unitPrice,
          original_price: options.original_price || unitPrice,
          originalUnitPrice: options.original_price || unitPrice,
          finalLineTotal: unitPrice * qty,
          originalLineTotal: (options.original_price || unitPrice) * qty,
          has_discount: options.has_discount || false,
          hasDiscount: options.has_discount || false,
          discount_type: options.discount_type,
          discount_value: options.discount_value,
          service: options.service || "",
          material: options.material || "",
          size: cleanSize,
          sizeDisplay: cleanSize || "-",
          image: options.image || null,
        });
      }
      saveGuestCart(guestCart);
      return { success: true, is_guest: true, data: { items: guestCart } };
    }

    if (!res.ok) {
      const errorText = await res.text();
      let errorData = {};
      try { errorData = JSON.parse(errorText); } catch { errorData = { detail: errorText || `Server error ${res.status}` }; }
      throw new Error(errorData.detail || errorData.message || `Add to cart failed (${res.status})`);
    }

    return { success: true, is_guest: false, data: await res.json() };

  } catch (err) {
    console.error("addToCart error:", err);
    return { success: false, error: err.message, is_guest: false };
  }
};

export const removeCartItem = async (idUnique) => {
  try {
    const res = await fetch(
      `${API_BASE}/cart/remove/${encodeURIComponent(idUnique)}/`,
      { method: "POST", credentials: "include", headers: { "X-CSRFToken": getCookie("csrftoken") } }
    );

    if (res.status === 401) {
      const cart = getGuestCart().filter((i) => i.id_unique !== idUnique);
      saveGuestCart(cart);
      return { success: true, is_guest: true };
    }

    if (!res.ok) throw new Error("Remove failed");
    return { success: true, is_guest: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const updateCartQuantity = async (idUnique, quantity) => {
  try {
    const qty = Number(quantity);
    const res = await fetch(
      `${API_BASE}/cart/update/${encodeURIComponent(idUnique)}/`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ quantity: qty }),
      }
    );

    if (res.status === 401) {
      const cart = getGuestCart();
      const index = cart.findIndex((i) => i.id_unique === idUnique);
      if (index >= 0) {
        if (qty <= 0) {
          cart.splice(index, 1);
        } else {
          cart[index].quantity = qty;
          cart[index].qty = qty;
          const price = cart[index].price || cart[index].unitPrice || 0;
          cart[index].finalLineTotal = price * qty;
          cart[index].originalLineTotal = (cart[index].original_price || price) * qty;
        }
        saveGuestCart(cart);
      }
      return { success: true, is_guest: true };
    }

    if (!res.ok) throw new Error("Update failed");
    return { success: true, is_guest: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const clearCart = async () => {
  try {
    const res = await fetch(`${API_BASE}/cart/delete/`, {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRFToken": getCookie("csrftoken") },
    });

    if (res.status === 401) {
      localStorage.removeItem(GUEST_CART_KEY);
      clearCartBackup();
      return { success: true, is_guest: true };
    }

    if (!res.ok) throw new Error("Clear failed");
    clearCartBackup();
    return { success: true, is_guest: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const syncGuestCartWithServer = async (guestCartItems = null) => {
  const itemsToSync = guestCartItems || getGuestCart();

  if (!itemsToSync || itemsToSync.length === 0) {
    return { success: true, merged: false, message: "No guest items to sync" };
  }

  localStorage.removeItem(GUEST_CART_KEY);

  const results = await Promise.allSettled(
    itemsToSync.map((item) => {
      const productId = item.product_id || item.productId;
      const quantity = item.quantity || item.qty || 1;

      let rawSize = item.size;
      if ((rawSize === undefined || rawSize === null) && item.sizeDisplay) {
        const match = String(item.sizeDisplay).match(/^(\d+)/);
        rawSize = match ? parseInt(match[1]) : null;
      }

      const cleanSize = (rawSize && rawSize !== "-" && rawSize !== "" && rawSize !== undefined && !isNaN(Number(rawSize)))
        ? Number(rawSize)
        : null;

      return addToCart(productId, quantity, {
        service: item.service || "",
        material: item.material || "",
        size: cleanSize,
        product_name: item.product_name || item.name || "",
        price: item.price || item.unitPrice || 0,
        original_price: item.original_price || item.originalUnitPrice || item.price || 0,
        has_discount: item.has_discount || item.hasDiscount || false,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        image: item.image,
      }, true);
    })
  );

  const failedItems = [];
  const successfulCount = results.filter((r, idx) => {
    if (r.status === 'fulfilled' && r.value?.success && !r.value?.is_guest) {
      return true;
    } else {
      failedItems.push(itemsToSync[idx]);
      return false;
    }
  }).length;

  if (failedItems.length === 0) {
    console.log(`Guest cart synced successfully: ${successfulCount} items`);
    return { success: true, merged: true, count: successfulCount };
  } else {
    saveGuestCart(failedItems);
    console.warn(`Partial sync: ${successfulCount} succeeded, ${failedItems.length} failed`);
    return {
      success: true,
      merged: true,
      partial: true,
      failedCount: failedItems.length,
      successfulCount,
      failedItems
    };
  }
};

function getCookie(name) {
  const cookie = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}

export default {
  fetchCart,
  addToCart,
  removeCartItem,
  updateCartQuantity,
  clearCart,
  syncGuestCartWithServer,
  getGuestCart,
  saveGuestCart,
  saveCartBackup,
  getCartBackup,
  clearCartBackup,
  buildCartKey,
};