import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL;

// ================== Helper: گرفتن CSRF از کوکی ==================
function getCookie(name) {
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  return cookieValue ? decodeURIComponent(cookieValue.split("=")[1]) : null;
}

// ================== Helper: اطمینان از دریافت CSRF ==================
export async function ensureCSRFToken() {
  let csrfToken = getCookie("csrftoken");
  if (!csrfToken) {
    await fetch(`${API_BASE}/csrf/`, { credentials: "include" });
    csrfToken = getCookie("csrftoken");
  }
  return csrfToken;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = هنوز معلوم نیست
  const [loading, setLoading] = useState(true);

  const isRefreshing = useRef(false);
  const lastVerify = useRef(0);

  // ================= refresh token =================
  const tryRefreshToken = useCallback(async () => {
  if (isRefreshing.current) return false;
  isRefreshing.current = true;

  try {
    // ۱. حتماً توکن CSRF را دریافت و ارسال کنید
    const csrfToken = await ensureCSRFToken();

    const res = await fetch(`${API_BASE}/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken // اضافه شدن هدر برای عبور از csrf_protect
      },
    });

    if (!res.ok) {
      // اگر واقعاً رفرش توکن منقضی شده بود (بعد از ۷ روز)
      return false;
    }

    // ۲. برای بررسی وضعیت جدید، نیازی به ریکوئست مجدد به verify نیست،
    // چون خود متد refresh در بک‌اند کوکی‌های جدید را ست کرده است.
    setUser((prev) => ({ ...prev, isAuthenticated: true }));
    return true;

  } catch (err) {
    console.error("Refresh error:", err.message);
    return false;
  } finally {
    isRefreshing.current = false;
  }
}, []);
  // ================= verify auth =================
  const verifyAuth = useCallback(async () => {
    const currentVerify = Date.now();
    lastVerify.current = currentVerify;
    setLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${API_BASE}/verify/`, {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });

      if (res.ok) {
        const result = await res.json();
        if (lastVerify.current !== currentVerify) return;
        setUser({ isAuthenticated: true, ...result });
        return;
      }

      if (res.status === 401) {
        const refreshed = await tryRefreshToken();
        if (!refreshed && lastVerify.current === currentVerify) {
          setUser({ isAuthenticated: false });
        }
        return;
      }

      throw new Error("Verify failed");
    } catch (err) {
      console.error("verifyAuth error:", err);
      if (lastVerify.current === currentVerify) {
        // اینجا به جای false، وضعیت "نامشخص" نگه می‌داریم
        setUser((prev) => prev ?? { isAuthenticated: null });
      }
    } finally {
      clearTimeout(timeout);
      if (lastVerify.current === currentVerify) setLoading(false);
    }
  }, [tryRefreshToken]);

  // ================= auth handlers =================
  const handleAuthResponse = async (res) => {
    const result = await res.json();
    if (!res.ok) throw result;
    setUser({ isAuthenticated: true, ...result });
    return result;
  };

  const loginWithPassword = (data) =>
    fetch(`${API_BASE}/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(handleAuthResponse);

  const loginWithOTP = (data) =>
    fetch(`${API_BASE}/login/otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(handleAuthResponse);

  const registerWithOTP = ({ phone, otp, fullname }) =>
    fetch(`${API_BASE}/register/otp/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ phone, otp, fullname }),
    }).then(handleAuthResponse);

  // ================= logout =================
  const logout = useCallback(async () => {
    try {
      const csrfToken = await ensureCSRFToken();
      await fetch(`${API_BASE}/logout/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": csrfToken },
      });
    } catch (err) {
      console.error("Logout error:", err.message);
    } finally {
      setUser({ isAuthenticated: false });
    }
  }, []);

  // ================= effects =================
  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  useEffect(() => {
  if (!user?.isAuthenticated) return;

  const interval = setInterval(() => {
    tryRefreshToken();
  }, 10 * 60 * 1000);

  return () => clearInterval(interval);
}, [user?.isAuthenticated, tryRefreshToken]);
const refreshUser = useCallback(async () => {
  try {
    const res = await fetch(`${API_BASE}/verify/`, {
      credentials: "include",
    });
    if (res.ok) {
      const result = await res.json();
      setUser(prev => ({ ...prev, ...result }));
    }
  } catch (e) {
    console.error("refresh user error:", e);
  }
}, []);


  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        // فقط وقتی واقعاً true است، لاگین حساب می‌کنیم
        isAuthenticated: user?.isAuthenticated === true,
        loginWithPassword,
        loginWithOTP,
        registerWithOTP,
        logout,
        verifyAuth,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export async function fetchCustomers() {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/customers/`, {
    credentials: "include",
  });

  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}
