import { useEffect, useState, useMemo, useCallback } from "react";
import { useCart } from "../../context/CartContext";
import { addToCart as addToCartAPI } from "../../api/cartService";
import BaseModal from "../basemodal/BaseModal";
import { toast } from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";

// ✅ تابع کمکی خالص برای محاسبه قیمت با تخفیف
const getEffectivePrice = (item) => {
  if (!item?.has_discount) return item.price;

  if (item.discount_type === "percent") {
    return Math.round(item.price * (1 - item.discount_value / 100));
  }

  if (item.discount_type === "fixed") {
    return Math.max(0, item.price - item.discount_value);
  }

  return item.price;
};

export default function ServiceModal({
  isOpen,
  onClose,
  productId,
  itemTitle = "سرویس",
  pricing = {},
}) {
  const { refreshCart, updateCartLocal } = useCart();
  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("");
  const [quantities, setQuantities] = useState({});

  // ✅ نرمال‌سازی داده‌های قیمت‌گذاری
  const normalizedPricing = useMemo(() => {
    const normalized = {};

    for (const [tab, tabData] of Object.entries(pricing || {})) {
      let materialPrices = {};

      if (Array.isArray(tabData.materialPrices)) {
        materialPrices = Object.fromEntries(
          tabData.materialPrices.map((mp) => [
            mp.material,
            {
              price: Number(mp.price),
              product_id: mp.product_id || productId,
              has_discount: mp.has_discount,
              discount_type: mp.discount_type,
              discount_value: Number(mp.discount_value ?? 0),
            },
          ])
        );
      }

      normalized[tab] = { ...tabData, materialPrices };
    }

    return normalized;
  }, [pricing, productId]);

  // ✅ تب‌های موجود
  const availableTabs = useMemo(
    () =>
      Object.keys(normalizedPricing).filter(
        (tab) =>
          Object.keys(normalizedPricing[tab].materialPrices || {}).length > 0
      ),
    [normalizedPricing]
  );

  // ✅ ست کردن تب پیش‌فرض
  useEffect(() => {
    if (availableTabs.length > 0 && !activeTab) {
      setActiveTab(availableTabs[0]);
    }
  }, [availableTabs, activeTab]);

  // ✅ تغییر تعداد
  const changeQuantity = useCallback(
    (material, delta) => {
      setQuantities((prev) => {
        const tabQuantities = prev[activeTab] || {};
        const currentQty = tabQuantities[material] || 0;
        const nextQty = Math.max(0, currentQty + delta);

        const updatedTab = { ...tabQuantities };

        if (nextQty === 0) {
          delete updatedTab[material];
        } else {
          updatedTab[material] = nextQty;
        }

        // اگر تب خالی شد، کلید تب را هم حذف کن
        if (Object.keys(updatedTab).length === 0) {
          const { [activeTab]: _, ...rest } = prev;
          return rest;
        }

        return { ...prev, [activeTab]: updatedTab };
      });
    },
    [activeTab]
  );

  // ✅ افزودن به سبد مهمان (Guest Cart)
  const addToGuestCart = useCallback(
    (items) => {
      try {
        const guestCart = JSON.parse(
          localStorage.getItem("guest_cart") || "[]"
        );

        const updatedCart = [...guestCart];

        items.forEach((item) => {
          const qty = Number(item.quantity);
          const finalPrice = item.price;
          const originalPrice = item.original_price || finalPrice;

          const service = item.options?.service || "-";
          const material = item.options?.material || "-";
          const size = item.options?.size ?? null;

          // ✅ ساخت cart_key یکسان با Auth
          const cartKey = `${item.product_id}-${service}-${material}-${size ?? "null"}`;

          const existingIndex = updatedCart.findIndex(
            (i) => i.cart_key === cartKey
          );

          if (existingIndex >= 0) {
            const existing = updatedCart[existingIndex];
            existing.qty += qty;
            existing.finalLineTotal = existing.qty * existing.unitPrice;
            existing.originalLineTotal =
              existing.qty * existing.originalUnitPrice;
          } else {
            updatedCart.push({
              cart_key: cartKey,
              id_unique: `guest-${cartKey}-${Date.now()}`,

              // ✅ ساختار واحد با Auth
              productId: item.product_id,
              product_id: item.product_id,
              name: item.product_name,
              product_name: item.product_name,

              qty,
              quantity: qty,

              unitPrice: finalPrice,
              price: finalPrice,
              unit_price: finalPrice,

              originalUnitPrice: originalPrice,
              original_price: originalPrice,

              finalLineTotal: finalPrice * qty,
              originalLineTotal: originalPrice * qty,

              hasDiscount: item.has_discount && originalPrice > finalPrice,
              has_discount: item.has_discount,

              service,
              material,
              size,
              sizeDisplay: size || "-",
            });
          }
        });

        localStorage.setItem("guest_cart", JSON.stringify(updatedCart));

        // ✅ sync فوری با CartContext
        updateCartLocal(updatedCart);

        return true;
      } catch (err) {
        console.error("Error saving guest cart:", err);
        return false;
      }
    },
    [updateCartLocal]
  );

  // ✅ محاسبه قیمت نهایی (با تخفیف)
  const totalPrice = useMemo(() => {
    return Object.entries(quantities).reduce((acc, [tabName, mats]) => {
      const tabPriceData = normalizedPricing[tabName]?.materialPrices || {};

      const tabSum = Object.entries(mats).reduce((sum, [mat, qty]) => {
        const item = tabPriceData[mat];
        return sum + (item ? getEffectivePrice(item) * qty : 0);
      }, 0);

      return acc + tabSum;
    }, 0);
  }, [quantities, normalizedPricing]);

  // ✅ محاسبه قیمت اصلی (قبل تخفیف)
  const originalTotalPrice = useMemo(() => {
    return Object.entries(quantities).reduce((acc, [tabName, mats]) => {
      const tabPriceData = normalizedPricing[tabName]?.materialPrices || {};

      const tabSum = Object.entries(mats).reduce((sum, [mat, qty]) => {
        const item = tabPriceData[mat];
        return sum + (item ? item.price * qty : 0);
      }, 0);

      return acc + tabSum;
    }, 0);
  }, [quantities, normalizedPricing]);

  const hasAnyDiscount = originalTotalPrice > totalPrice;
  const savingsAmount = originalTotalPrice - totalPrice;

  // ✅ آیتم‌های انتخاب شده
  const selectedItems = useMemo(() => {
    const items = [];

    Object.entries(quantities).forEach(([tabName, mats]) => {
      const tab = normalizedPricing[tabName]?.materialPrices || {};

      Object.entries(mats).forEach(([mat, qty]) => {
        const item = tab[mat];
        if (!item) return;

        const finalPrice = getEffectivePrice(item);

        items.push({
          product_id: item.product_id,
          product_name: itemTitle,
          quantity: Number(qty),
          price: finalPrice,
          original_price: item.price,
          has_discount: item.has_discount,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
          options: {
            service: tabName,
            material: mat,
            size: null,
          },
        });
      });
    });

    return items;
  }, [quantities, normalizedPricing, itemTitle]);

  // ✅ هندلر اصلی افزودن به سبد
  const handleAdd = useCallback(async () => {
    if (!productId) {
      toast.error("شناسه محصول نامعتبر است");
      return;
    }

    if (selectedItems.length === 0) {
      toast.error("لطفاً حداقل یک مورد را انتخاب کنید");
      return;
    }

    setLoading(true);

    try {
      if (!isAuthenticated) {
        const success = addToGuestCart(selectedItems);
        if (success) {
          await refreshCart();
          toast.success("آیتم‌ها به سبد خرید اضافه شدند");
          setQuantities({});
          onClose();
        }
        return;
      }

      // 🔵 حالت لاگین شده
      const toastId = toast.loading("در حال افزودن به سبد...");

      // ⭐ فقط فیلدهای مورد نیاز API را بفرست
      const promises = selectedItems.map((item) =>
        addToCartAPI(item.product_id, item.quantity, {
          service: item.options.service,
          material: item.options.material,
          size: item.options.size,
          // ⭐ فیلدهای اضافی فقط برای Guest Cart لازم هستند
          // در حالت لاگین شده، سرور خودش قیمت و تخفیف را محاسبه می‌کند
          product_name: item.product_name,
          price: item.price,
          original_price: item.original_price,
          has_discount: item.has_discount,
          discount_type: item.discount_type,
          discount_value: item.discount_value,
        })
      );

      const results = await Promise.all(promises);

      const hasError = results.some((r) => !r.success);
      if (hasError) {
        // ⭐ نمایش خطای دقیق‌تر
        const firstError = results.find((r) => !r.success);
        throw new Error(firstError?.error || "خطا در افزودن برخی آیتم‌ها");
      }

      // ⭐ ساخت آیتم‌های جدید از پاسخ سرور
      const newCartItems = selectedItems.map((item, index) => {
        const serverItem = results[index]?.data?.item || results[index]?.data;

        // ✅ ساخت cart_key یکسان
        const cartKey = `${item.product_id}-${item.options.service}-${item.options.material}-null`;

        return {
          cart_key: cartKey,
          id_unique: serverItem?.id_unique || `temp-${cartKey}`,

          productId: item.product_id,
          product_id: item.product_id,
          name: item.product_name,
          product_name: item.product_name,

          qty: Number(item.quantity),
          quantity: Number(item.quantity),

          unitPrice: item.price,
          price: item.price,
          unit_price: item.price,

          originalUnitPrice: item.original_price,
          original_price: item.original_price,

          finalLineTotal: item.price * item.quantity,
          originalLineTotal: item.original_price * item.quantity,

          hasDiscount: item.has_discount && item.original_price > item.price,
          has_discount: item.has_discount,

          service: item.options.service,
          material: item.options.material,
          size: item.options.size,
          sizeDisplay: item.options.size || "-",
          image: item.image || null,
        };
      });

      // ✅ merge درست با استفاده از cart_key
      updateCartLocal((prev) => {
        const updated = [...prev];

        newCartItems.forEach((item) => {
          const index = updated.findIndex((i) => i.cart_key === item.cart_key);

          if (index >= 0) {
            updated[index].qty += item.qty;
            updated[index].finalLineTotal =
              updated[index].qty * updated[index].unitPrice;
          } else {
            updated.push(item);
          }
        });

        return updated;
      });

      toast.success("آیتم‌ها به سبد اضافه شدند", { id: toastId });

      // ⭐ پاک کردن فرم و بستن مودال
      setQuantities({});
      onClose();
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(error.message || "خطا در افزودن به سبد");
    } finally {
      setLoading(false);
    }
  }, [
    productId,
    selectedItems,
    isAuthenticated,
    addToGuestCart,
    refreshCart,
    updateCartLocal,
    onClose,
  ]);

  const currentMaterials = normalizedPricing[activeTab]?.materialPrices || {};
  const currentTabQuantities = quantities[activeTab] || {};

  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={itemTitle} maxWidth="md">
      {/* تب‌ها */}
      {availableTabs.length > 1 && (
        <div className="flex gap-2 mt-2 mb-4 overflow-x-auto pb-1">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-xl text-sm border whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-sky-50 border-sky-500 text-sky-700 font-bold"
                  : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* لیست مواد */}
      <div className="space-y-3 max-h-[55vh] overflow-y-auto pb-4 px-1">
        {Object.entries(currentMaterials).map(([mat, item]) => {
          const qty = currentTabQuantities[mat] || 0;
          const finalPrice = getEffectivePrice(item);

          return (
            <div
              key={mat}
              className={`flex justify-between items-center p-4 rounded-xl border transition-all duration-200 ${
                qty > 0
                  ? "border-sky-500 bg-sky-50 shadow-sm"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-gray-800">{mat}</span>

                  {item.has_discount && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                      {item.discount_type === "percent"
                        ? `${item.discount_value}٪`
                        : `${item.discount_value.toLocaleString()} تومان`}
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  {item.has_discount && (
                    <span className="text-xs line-through text-gray-400 decoration-red-300">
                      {item.price.toLocaleString()} تومان
                    </span>
                  )}

                  <span
                    className={`font-bold ${
                      item.has_discount ? "text-green-600" : "text-gray-700"
                    }`}
                  >
                    {finalPrice.toLocaleString()} تومان
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => changeQuantity(mat, -1)}
                  disabled={qty === 0 || loading}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
                    qty > 0
                      ? "bg-white text-sky-600 shadow-sm border border-sky-200"
                      : "bg-gray-100 text-gray-300"
                  }`}
                >
                  −
                </button>

                <span className="w-6 text-center font-bold text-lg text-gray-800">
                  {qty}
                </span>

                <button
                  onClick={() => changeQuantity(mat, 1)}
                  disabled={loading}
                  className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-md hover:bg-sky-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* فوتر */}
      <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100">
        {/* نمایش میزان صرفه‌جویی */}
        {hasAnyDiscount && savingsAmount > 0 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <span className="text-gray-500">سود شما:</span>
            <span className="text-green-600 font-bold">
              {savingsAmount.toLocaleString()} تومان
            </span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">مبلغ قابل پرداخت:</span>

            <div className="flex items-center gap-2">
              {hasAnyDiscount && (
                <span className="text-sm line-through text-gray-400 decoration-red-300">
                  {originalTotalPrice.toLocaleString()}
                </span>
              )}
              <span
                className={`font-bold text-xl ${
                  hasAnyDiscount ? "text-green-600" : "text-sky-700"
                }`}
              >
                {totalPrice.toLocaleString()}
                <span className="text-sm font-normal text-gray-500 mr-1">
                  تومان
                </span>
              </span>
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={totalPrice === 0 || loading}
            className="px-6 py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-sky-200 flex items-center gap-2 min-w-[140px] justify-center"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>در حال افزودن...</span>
              </>
            ) : (
              "افزودن به سبد"
            )}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}