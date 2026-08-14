import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function RequireAdminSeller({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (loading) return;

    const isAllowed = user?.is_admin || user?.role === "seller";

    if (!isAllowed) {
      addToast("برای دسترسی به داشبورد مغازه باید ورود/ثبت نام کنید", "error");
      navigate("/shop", { replace: true });
    }
  }, [user, loading, navigate, addToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-bl from-sky-200/80 via-pink-100/60 to-sky-200/80 dark:bg-gradient-to-br dark:from-[#262B40] dark:via-none dark:to-[#0B248A]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  const isAllowed = user?.is_admin || user?.role === "seller";
  
  return isAllowed ? children : null;
}