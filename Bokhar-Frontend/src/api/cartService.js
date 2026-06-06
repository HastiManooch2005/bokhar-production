// src/api/cartService.js

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const GUEST_CART_KEY = "guest_cart";

/* ======================= */
/*  Cart Key Generator     */
/* ======================= */

/**
 * ساخت کلید یکتا برای آیتم سبد خرید
 * این کلید برای شناسایی آیتم‌های یکسان با سرویس/متریال/سایز متفاوت استفاده می‌شود
 */
export const buildCartKey = (productId, service, material, size) => {
  // تبدیل null/undefined به رشته استاندارد برای سازگاری
  const svc = service || "-";
  const mat = material || "-";
  const sz = size === null || size === undefined || size === "-" ? "null" : String(size);
  
  return `${productId}_${svc}_${mat}_${sz}`;
};

/* ======================= */
/*  Guest Cart Helpers     */
/* ======================= */

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

/* ======================= */
/*  Fetch Cart             */
/* ======================= */

export const fetchCart = async () => {
  try {
     const res = await fetch(`${API_BASE}/cart/?_t=${Date.now()}`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    // 🔴 مهمان
    if (res.status === 401) {
      const guestCart = getGuestCart();
      return {
        success: true,
        data: {
          items: guestCart,
          total: guestCart.reduce(
            (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
            0
          ),
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

/* ======================= */
/*  Add To Cart            */
/* ======================= */

export const addToCart = async (productId, quantity = 1, options = {}, skipGuestFallback = false) => {
  try {
    // ⭐ تمیز کردن و تبدیل تایپ‌های صحیح
    const payload = {
      quantity: Number(quantity),
      service: options.service || "",
      material: options.material || "",
      // ⭐ مهم: اگر size "-" یا خالی است، null بفرست؛ در غیر این صورت به عدد تبدیل کن
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

    // 🔴 مهمان → ذخیره در localStorage (فقط اگر skipGuestFallback false باشد)
    if (res.status === 401 && !skipGuestFallback) {
      const guestCart = getGuestCart();
      
      // ⭐ تمیز کردن size برای ذخیره در localStorage
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
        // ⭐ بروزرسانی قیمت خط در صورت تغییر
        guestCart[index].finalLineTotal = guestCart[index].quantity * (guestCart[index].price || options.price || 0);
      } else {
        const unitPrice = options.price || 0;
        const qty = Number(quantity);
        
        guestCart.push({
          id_unique: generateGuestId(),
          product_id: productId,
          product_name: options.product_name || "",
          quantity: qty,                          // ⭐ برای سازگاری با سرویس
          qty: qty,                               // ⭐ برای سازگاری با Factor.jsx
          price: unitPrice,
          unit_price: unitPrice,
          unitPrice: unitPrice,                   // ⭐ برای سازگاری با Factor
          original_price: options.original_price || unitPrice,
          originalUnitPrice: options.original_price || unitPrice, // ⭐ برای Factor
          finalLineTotal: unitPrice * qty,        // ⭐ محاسبه خط
          originalLineTotal: (options.original_price || unitPrice) * qty,
          has_discount: options.has_discount || false,
          hasDiscount: options.has_discount || false, // ⭐ برای Factor
          discount_type: options.discount_type,
          discount_value: options.discount_value,
          service: options.service || "",
          material: options.material || "",
          size: cleanSize,
          sizeDisplay: cleanSize || "-",          // ⭐ برای Factor
          image: options.image || null,
        });
      }
      saveGuestCart(guestCart);
      return { success: true, is_guest: true, data: { items: guestCart } };
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || "Add to cart failed");
    }
    
    return { success: true, is_guest: false, data: await res.json() };

  } catch (err) {
    console.error("addToCart error:", err);
    return { success: false, error: err.message, is_guest: false };
  }
};

/* ======================= */
/*  Remove & Update        */
/* ======================= */

export const removeCartItem = async (idUnique) => {
  try {
    const res = await fetch(
      `${API_BASE}/cart/remove/${encodeURIComponent(idUnique)}/`,
      { 
        method: "POST", 
        credentials: "include", 
        headers: { "X-CSRFToken": getCookie("csrftoken") } 
      }
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
          cart[index].qty = qty; // ⭐ همگام‌سازی با Factor
          // ⭐ بروزرسانی قیمت خط
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
      return { success: true, is_guest: true };
    }
    
    if (!res.ok) throw new Error("Clear failed");
    return { success: true, is_guest: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/* ======================= */
/*  ⭐ SYNC GUEST CART     */
/* ======================= */

export const syncGuestCartWithServer = async (guestCartItems = null) => {
  const itemsToSync = guestCartItems || getGuestCart();
  
  if (!itemsToSync || itemsToSync.length === 0) {
    return { success: true, merged: false, message: "No guest items to sync" };
  }

  // ⭐ پاک کردن فوری guest cart برای جلوگیری از دوبرابر شدن در صورت خطای 401
  // آیتم‌ها در حافظه نگهداری می‌شوند
  localStorage.removeItem(GUEST_CART_KEY);

  const results = await Promise.allSettled(
    itemsToSync.map((item) => {
      // ⭐ تبدیل نام فیلدها به فرمت استاندارد (هماهنگ با addToCart)
      const productId = item.product_id || item.productId;
      const quantity = item.quantity || item.qty || 1;
      
      // ⭐ تمیز کردن size (مهم برای جلوگیری از خطای 500)
      // اگر sizeDisplay داریم و عددی نیست، سعی کن عدد را استخراج کنی یا null بگذار
      let rawSize = item.size;
      if ((rawSize === undefined || rawSize === null) && item.sizeDisplay) {
        // تلاش برای استخراج عدد از sizeDisplay (مثلاً "10 عدد" → 10)
        const match = String(item.sizeDisplay).match(/^(\d+)/);
        rawSize = match ? parseInt(match[1]) : null;
      }
      
      const cleanSize = (rawSize && rawSize !== "-" && rawSize !== "" && rawSize !== undefined && !isNaN(Number(rawSize))) 
        ? Number(rawSize) 
        : null;

      // ⭐ فراخوانی با skipGuestFallback=true تا در صورت 401، آیتم به guest cart اضافه نشود
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
      }, true); // ⭐ true = skipGuestFallback
    })
  );

  const failedItems = [];
  const successfulCount = results.filter((r, idx) => {
    if (r.status === 'fulfilled' && r.value?.success && !r.value?.is_guest) {
      return true;
    } else {
      // ⭐ اگر خطا بود یا is_guest بود، آیتم را نگه دار
      failedItems.push(itemsToSync[idx]);
      return false;
    }
  }).length;

  if (failedItems.length === 0) {
    console.log(`Guest cart synced successfully: ${successfulCount} items`);
    return { success: true, merged: true, count: successfulCount };
  } else {
    // ⭐ ذخیره آیتم‌های ناموفق (شامل موارد 401) برای تلاش بعدی
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

/* ======================= */
/*  Cookie Helper          */
/* ======================= */

function getCookie(name) {
  const cookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith(name + "="));
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
  buildCartKey,  // ⭐ اضافه شد
};
