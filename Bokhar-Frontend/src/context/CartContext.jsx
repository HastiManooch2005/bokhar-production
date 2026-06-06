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
} from "../api/cartService";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ همیشه پیش‌فرض guest
  const [isGuest, setIsGuest] = useState(true);

  // ✅ تشخیص login تازه (برای جلوگیری از load زودهنگام)
  const justLoggedInRef = useRef(false);
  const prevAuthRef = useRef(isAuthenticated);

  /* ------------------------------------------------------------------
   * ✅ Normalize cart items (cart_key preserved)
   * ------------------------------------------------------------------ */
  const transformCartItems = useCallback((items) => {
    if (!Array.isArray(items)) return [];

    return items.map((item) => {
      const qty = Number(item.qty ?? item.quantity ?? 1);

      const unitPrice = Number(
        item.unitPrice ??
          item.unit_price ??
          item.price ??
          item.discount_price ??
          0
      );

      const originalUnitPrice = Number(
        item.originalUnitPrice ??
          item.original_price ??
          item.price_before_discount ??
          unitPrice
      );

      const productId = item.productId ?? item.product_id;
      const service = item.service ?? "-";
      const material = item.material ?? "-";
      const size = item.size ?? null;

      const cart_key =
        item.cart_key ??
        `${productId}-${service}-${material}-${size ?? "null"}`;

      return {
        cart_key,

        id_unique:
          item.id_unique ?? `guest-${productId}-${cart_key}`,

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
   * ✅ loadCart (safe – aware of login transition)
   * ------------------------------------------------------------------ */
  const loadCart = useCallback(
    async (silent = false) => {
      // ⛔ اگر تازه لاگین شده‌ایم، load نکن
      if (isAuthenticated && justLoggedInRef.current) return;

      if (!silent) setLoading(true);

      try {
        if (!isAuthenticated) {
          const guestItems = getGuestCart();
          setCartItems(transformCartItems(guestItems));
          setIsGuest(true);
          return;
        }

        const result = await fetchCart();

        if (result?.success) {
          setCartItems(transformCartItems(result.data?.items || []));
          setIsGuest(result.data?.is_guest ?? false);
        } else {
          const guestItems = getGuestCart();
          setCartItems(transformCartItems(guestItems));
          setIsGuest(true);
        }
      } catch (err) {
        console.error("Cart load error:", err);
        const guestItems = getGuestCart();
        setCartItems(transformCartItems(guestItems));
        setIsGuest(true);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [isAuthenticated, transformCartItems]
  );

  /* ------------------------------------------------------------------
   * ✅ Auth transition handling (Login / Logout)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (authLoading) return;

    // ✅ Logout → Guest
    if (prevAuthRef.current && !isAuthenticated) {
      saveGuestCart(cartItems);
      setIsGuest(true);
      justLoggedInRef.current = false;
    }

    // ✅ Guest → Login (مهم‌ترین بخش)
    if (!prevAuthRef.current && isAuthenticated) {
      // ⭐ cart مهمان را دست نمی‌زنیم
      justLoggedInRef.current = true;
      setIsGuest(false);
    }

    prevAuthRef.current = isAuthenticated;
  }, [isAuthenticated, authLoading, cartItems]);

  /* ------------------------------------------------------------------
   * ✅ Initial load (only when safe)
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (authLoading) return;

    // ⛔ اگر تازه لاگین شده‌ایم، صبر می‌کنیم تا sync انجام شود
    if (isAuthenticated && justLoggedInRef.current) return;

    loadCart(false);
  }, [authLoading, isAuthenticated, loadCart]);

  /* ------------------------------------------------------------------
   * ✅ Local cart update (race-safe)
   * ------------------------------------------------------------------ */
  const updateCartLocal = useCallback(
    (updater) => {
      setCartItems((prev) => {
        const next =
          typeof updater === "function" ? updater(prev) : updater;

        const normalized = transformCartItems(next);

        if (!isAuthenticated) {
          saveGuestCart(normalized);
        }

        return normalized;
      });
    },
    [isAuthenticated, transformCartItems]
  );

  /* ------------------------------------------------------------------
   * ✅ Derived values
   * ------------------------------------------------------------------ */
  const totalItems = useMemo(
    () => cartItems.reduce((sum, i) => sum + (i.qty || 0), 0),
    [cartItems]
  );

  const totalPrice = useMemo(
    () =>
      cartItems.reduce(
        (sum, i) => sum + (i.finalLineTotal ?? 0),
        0
      ),
    [cartItems]
  );

  /* ------------------------------------------------------------------
   * ✅ Public API
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

    // ✅ برای Factor.jsx
    markCartSyncedAfterLogin: () => {
      justLoggedInRef.current = false;
      loadCart(false);
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
