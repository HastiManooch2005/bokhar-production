import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function RequireAdminSeller({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const hasRedirected = useRef(false);
  const prevUserRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  // وقتی identity کاربر عوض شد (لاگین/لاگ‌اوت/تغییر role)، reset کن
  useEffect(() => {
    const userId = user?.id || user?.phone;
    const prevId = prevUserRef.current?.id || prevUserRef.current?.phone;
    const userRole = user?.role;
    const prevRole = prevUserRef.current?.role;
    const isAdmin = user?.is_admin;
    const prevIsAdmin = prevUserRef.current?.is_admin;

    if (userId !== prevId || userRole !== prevRole || isAdmin !== prevIsAdmin) {
      hasRedirected.current = false;
      prevUserRef.current = user ? { ...user } : null;
    }
  }, [user]);

  // ⭐ مهم: فقط وقتی redirect بده که loading تموم شده AND user قطعی شده (نه null موقت)
  useEffect(() => {
    if (loading) return;
    
    // اگه هنوز auth قطعی نشده (user null یا isAuthenticated=null)، صبر کن
    if (!user || user.isAuthenticated === null || user.isAuthenticated === undefined) {
      return;
    }

    if (hasRedirected.current) return;

    const isAllowed = Boolean(user?.is_admin) || user?.role === "seller";

    if (!isAllowed) {
      hasRedirected.current = true;
      addToast("برای دسترسی به این بخش باید لاگین کنید", "error");
      navigate("/shop", { replace: true });
    } else {
      setIsReady(true);
    }
  }, [user, loading, navigate, addToast]);

  // loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-bl from-sky-200/80 via-pink-100/60 to-sky-200/80 dark:bg-gradient-to-br dark:from-[#262B40] dark:via-none dark:to-[#0B248A]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  // ⭐ مهم: اگه هنوز auth قطعی نشده، اسپینر نشون بده نه redirect
  if (!user || user.isAuthenticated === null || user.isAuthenticated === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-bl from-sky-200/80 via-pink-100/60 to-sky-200/80 dark:bg-gradient-to-br dark:from-[#262B40] dark:via-none dark:to-[#0B248A]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  const isAllowed = Boolean(user?.is_admin) || user?.role === "seller";
  return isAllowed ? children : null;
}