import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  fetchCart,
  getGuestCart,
  saveGuestCart,
  saveCartBackup,
  getCartBackup,
  clearCartBackup,
  syncGuestCartWithServer,
} from "../api/cartService";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  const prevAuthRef = useRef(null);
  const isSyncingRef = useRef(false);
  const isMountedRef = useRef(false);

  /* ------------------------------------------------------------------
   * Normalize cart items
   * ------------------------------------------------------------------ */
  const transformCartItems = useCallback((items) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      const qty = Number(item.qty ?? item.quantity ?? 1);
      const unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? 0);
      const originalUnitPrice = Number(item.originalUnitPrice ?? item.original_price ?? unitPrice);
      const productId = item.productId ?? item.product_id;
      const service = item.service ?? "-";
      const material = item.material ?? "-";
      const size = item.size ?? null;
      const cart_key = item.cart_key ?? `${productId}-${service}-${material}-${size ?? "null"}`;

      return {
        cart_key,
        id_unique: item.id_unique ?? `guest-${productId}-${cart_key}`,
        productId,
        product_id: productId,
        name: item.name ?? item.product_name ?? "محصول",
        product_name: item.name ?? item.product_name ?? "محصول",
        qty,
        quantity: qty,
        unitPrice,
        unit_price: unitPrice,
        price: unitPrice,
        originalUnitPrice,
        original_price: originalUnitPrice,
        finalLineTotal: unitPrice * qty,
        originalLineTotal: originalUnitPrice * qty,
        hasDiscount: originalUnitPrice > unitPrice,
        has_discount: originalUnitPrice > unitPrice,
        service,
        material,
        size,
        sizeDisplay: item.sizeDisplay ?? size ?? "-",
        image: item.image ?? null,
      };
    });
  }, []);

  /* ------------------------------------------------------------------
   * Persist cart - همیشه backup کن، اگر مهمان هم guest_cart
   * ------------------------------------------------------------------ */
  const persistCart = useCallback((items) => {
    const normalized = Array.isArray(items) ? items : [];
    saveCartBackup(normalized);
    if (!isAuthenticated) {
      saveGuestCart(normalized);
    }
  }, [isAuthenticated]);

  /* ------------------------------------------------------------------
   * loadCart - نسخه اصلاح شده نهایی
   * ------------------------------------------------------------------ */
// CartContext.jsx - نسخه نهایی با optimistic update
const loadCart = useCallback(
  async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      if (!isAuthenticated) {
        const backup = getCartBackup();
        const legacy = getGuestCart();
        const items = backup?.length > 0 ? backup : legacy;
        setCartItems(transformCartItems(items));
        setIsGuest(true);
        if (!backup?.length && legacy?.length > 0) saveCartBackup(legacy);
        return;
      }

      // لاگین شده
      const result = await fetchCart();

      if (!result?.success || result.data?.is_guest) {
        const backup = getCartBackup();
        const legacy = getGuestCart();
        const items = backup?.length > 0 ? backup : legacy;
        setCartItems(transformCartItems(items));
        setIsGuest(true);
        return;
      }

      const serverItems = result.data?.items || [];

      if (serverItems.length > 0) {
        // ✅ سرور آیتم داره
        const normalized = transformCartItems(serverItems);
        setCartItems(normalized);
        persistCart(serverItems);
        setIsGuest(false);
      } else {
        // ⚠️ سرور خالی
        const backup = getCartBackup();
        
        if (backup?.length > 0 && !isSyncingRef.current) {
          isSyncingRef.current = true;
          
          try {
            const syncResult = await syncGuestCartWithServer(backup);
            
            // ⭐ اگر sync موفق بود، backup رو نشون بده (optimistic)
            // و بعد background refresh کن
            if (syncResult?.success && syncResult.merged) {
              const optimisticItems = transformCartItems(backup);
              setCartItems(optimisticItems);
              setIsGuest(false);
              persistCart(backup);
              
              // Background refresh بعد از تاخیر
              setTimeout(async () => {
                try {
                  const refreshed = await fetchCart();
                  if (refreshed?.success && !refreshed.data?.is_guest) {
                    const freshItems = refreshed.data?.items || [];
                    if (freshItems.length > 0) {
                      setCartItems(transformCartItems(freshItems));
                      persistCart(freshItems);
                    }
                  }
                } catch (e) {
                  console.error("Background refresh failed:", e);
                }
              }, 1000);
            } else {
              // sync نشد
              setCartItems([]);
              setIsGuest(false);
            }
          } catch (err) {
            console.error("Sync failed:", err);
            setCartItems(transformCartItems(backup));
          } finally {
            isSyncingRef.current = false;
          }
        } else {
          setCartItems([]);
          setIsGuest(false);
        }
      }
    } catch (err) {
      console.error("loadCart error:", err);
      const backup = getCartBackup();
      setCartItems(transformCartItems(backup || []));
      setIsGuest(!isAuthenticated);
    } finally {
      if (!silent) setLoading(false);
    }
  },
  [isAuthenticated, transformCartItems, persistCart]
);

  /* ------------------------------------------------------------------
   * Auth transition handling - اصلاح شده
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (authLoading) return;

    // فقط وقتی transition واقعی داریم (نه initial load)
    if (prevAuthRef.current !== null && prevAuthRef.current !== isAuthenticated) {
      
      if (prevAuthRef.current === true && isAuthenticated === false) {
        // 🔴 Logout: سبد فعلی را backup کن
        setCartItems((currentItems) => {
          saveCartBackup(currentItems);
          saveGuestCart(currentItems);
          return currentItems;
        });
        setIsGuest(true);
      }

      if (prevAuthRef.current === false && isAuthenticated === true) {
        // 🟢 Login: سبد را از سرور بگیر (sync خودکار در loadCart انجام می‌شود)
        setIsGuest(false);
        loadCart();
      }
    }

    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, authLoading, loadCart]);

  /* ------------------------------------------------------------------
   * Initial load - فقط یک بار در mount اولیه
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (authLoading) return;
    if (isMountedRef.current) return;
    
    isMountedRef.current = true;
    loadCart(false);
  }, [authLoading, loadCart]);

  /* ------------------------------------------------------------------
   * Local cart update - همیشه backup کن
   * ------------------------------------------------------------------ */
  const updateCartLocal = useCallback(
    (updater) => {
      setCartItems((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        const normalized = transformCartItems(next);
        persistCart(normalized);
        return normalized;
      });
    },
    [transformCartItems, persistCart]
  );

  /* ------------------------------------------------------------------
   * Derived values
   * ------------------------------------------------------------------ */
  const totalItems = useMemo(
    () => cartItems.reduce((sum, i) => sum + (i.qty || 0), 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () => cartItems.reduce((sum, i) => sum + (i.finalLineTotal ?? 0), 0),
    [cartItems]
  );

  /* ------------------------------------------------------------------
   * Public API
   * ------------------------------------------------------------------ */
  const value = {
    cartItems,
    loading,
    isGuest,
    totalItems,
    totalPrice,
    loadCart,
    refreshCart: loadCart,
    updateCartLocal,
    clearCart: () => {
      clearCartBackup();
      localStorage.removeItem("guest_cart");
      setCartItems([]);
    },
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
};