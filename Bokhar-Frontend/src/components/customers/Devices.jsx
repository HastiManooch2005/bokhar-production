import { useState, useEffect } from "react";
import { Smartphone, Monitor, Lock, LogOut, ArrowLeft, Loader2, Laptop } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include CSRF token
axiosInstance.interceptors.request.use((config) => {
  const csrfToken = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("csrftoken="));
  if (csrfToken) {
    config.headers["X-CSRFToken"] = csrfToken.split("=")[1];
  }
  return config;
});

export default function Devices() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(null);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  // Detect device type from session data
  const detectDeviceType = (session) => {
    const ua = (session.user_agent || "").toLowerCase();

    // Use device_name or device field
    const name = (session.device_name || session.device || "").toLowerCase();

    if (/iphone|android phone|mobile/.test(name) || /iphone|android.*mobile/.test(ua)) {
      return "mobile";
    }
    if (/ipad|android tablet|tablet/.test(name) || /ipad|android(?!.*mobile)/.test(ua)) {
      return "tablet";
    }
    if (/mac|macbook|windows pc|linux|desktop/.test(name) || /macintosh|windows nt|linux/.test(ua)) {
      return session.device_name?.toLowerCase().includes("macbook") ? "laptop" : "desktop";
    }
    return "unknown";
  };

  // Get best display name for device
  const getDeviceDisplayName = (session) => {
    // Priority: device_name > device_brand + device_model > device > Unknown
    if (session.device_name) {
      return session.device_name;
    }
    if (session.device_brand && session.device_model) {
      return `${session.device_brand} ${session.device_model}`;
    }
    if (session.device) {
      return session.device;
    }
    return "دستگاه ناشناس";
  };

  // Format relative time (Persian)
  const formatRelativeTime = (dateString) => {
    if (!dateString) return "نامشخص";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "چند لحظه پیش";
    if (diffMin < 60) return `${diffMin} دقیقه پیش`;
    if (diffHour < 24) return `${diffHour} ساعت پیش`;
    if (diffDay < 7) return `${diffDay} روز پیش`;
    if (diffDay < 30) return `${Math.floor(diffDay / 7)} هفته پیش`;
    return date.toLocaleDateString("fa-IR");
  };

  // Fetch sessions from backend
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/sessions/");
      const sessions = response.data || [];

      // Sort by last_used (most recent first)
      const sorted = [...sessions].sort(
        (a, b) => new Date(b.last_used) - new Date(a.last_used)
      );

      const enriched = sorted.map((session, index) => {
        const type = detectDeviceType(session);
        return {
          ...session,
          type,
          displayName: getDeviceDisplayName(session),
          lastActive: formatRelativeTime(session.last_used),
          current: index === 0, // Most recent = current
        };
      });

      setDevices(enriched);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      if (error.response?.status === 401) {
        toast.error("نشست شما منقضی شده است. لطفاً دوباره وارد شوید.");
        navigate("/login");
      } else {
        toast.error("خطا در دریافت لیست دستگاه‌ها");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Logout from a specific device
  const handleLogoutDevice = async (sessionId) => {
    try {
      setLogoutLoading(sessionId);
      await axiosInstance.delete(`/sessions/${sessionId}/`);
      toast.success("دستگاه با موفقیت خارج شد");
      setDevices((prev) => prev.filter((d) => d.id !== sessionId));
    } catch (error) {
      console.error("Error logging out device:", error);
      if (error.response?.status === 401) {
        toast.error("نشست شما منقضی شده است");
        navigate("/login");
      } else {
        toast.error("خطا در خروج از دستگاه");
      }
    } finally {
      setLogoutLoading(null);
    }
  };

  // Logout from all devices (except current)
  const handleLogoutAll = async () => {
    try {
      setLogoutAllLoading(true);
      const otherDevices = devices.filter((d) => !d.current);

      await Promise.all(
        otherDevices.map((d) => axiosInstance.delete(`/sessions/${d.id}/`))
      );

      toast.success("خروج از تمام دستگاه‌ها با موفقیت انجام شد");
      setDevices((prev) => prev.filter((d) => d.current));
    } catch (error) {
      console.error("Error logging out all:", error);
      toast.error("خطا در خروج از دستگاه‌ها");
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case "mobile":
        return <Smartphone size={20} className="text-blue-600 dark:text-blue-400" />;
      case "tablet":
        return <Monitor size={20} className="text-orange-600 dark:text-orange-400" />;
      case "laptop":
        return <Laptop size={20} className="text-purple-600 dark:text-purple-400" />;
      case "desktop":
        return <Monitor size={20} className="text-purple-600 dark:text-purple-400" />;
      default:
        return <Lock size={20} className="text-gray-600 dark:text-gray-400" />;
    }
  };

  const getDeviceColor = (type) => {
    switch (type) {
      case "mobile":
        return "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400";
      case "tablet":
        return "bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400";
      case "laptop":
      case "desktop":
        return "bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400";
      default:
        return "bg-gray-500/10 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div dir="rtl" className="w-full max-w-lg mx-auto p-4">
      <div className="relative md:mt-20 mb-20 md:mb-0 bg-sky-50 dark:bg-gray-900/40 rounded-2xl shadow-xl shadow-black/5 border border-sky-200 dark:border-white/10">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200/30 dark:border-white/5">
            <div className="p-2 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg">
              <Smartphone className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                دستگاه‌ها و نشست‌ها
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                مدیریت دستگاه‌های متصل به حساب کاربری
              </p>
            </div>

            <button
              onClick={() => navigate("/customer-dashboard")}
              className="ms-auto w-10 h-10 rounded-full border shadow-sm hover:shadow-md cursor-pointer
              bg-white/80 hover:bg-gray-200 border-sky-300 shadow-sky-200
              dark:bg-purple-800 dark:hover:bg-purple-900 dark:border-indigo-500
              dark:shadow-indigo-500 flex items-center justify-center transition"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={32} className="animate-spin text-purple-600 dark:text-purple-400" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">در حال دریافت اطلاعات...</p>
            </div>
          )}

          {/* Devices List */}
          {!loading && (
            <div className="space-y-3">
              {devices.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Lock size={40} className="mx-auto mb-3 opacity-50" />
                  <p>هیچ دستگاه فعالی یافت نشد</p>
                </div>
              ) : (
                devices.map((d, index) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`group flex justify-between items-center p-4 rounded-xl
                      bg-white/50 dark:bg-black/20 border border-gray-200/50 dark:border-gray-700/50
                      hover:bg-white/70 dark:hover:bg-white/30 transition-all duration-200
                      backdrop-blur-sm ${d.current ? "ring-1 ring-blue-500/20 dark:ring-blue-400/20" : ""}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`p-2.5 rounded-xl ${getDeviceColor(d.type)} transition-transform group-hover:scale-105 shrink-0`}>
                        {getDeviceIcon(d.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {d.displayName}
                          </p>
                          {d.current && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium shrink-0">
                              فعال
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {d.lastActive}
                          {d.ip_address && (
                            <span className="mx-1 text-gray-300 dark:text-gray-600">|</span>
                          )}
                          {d.ip_address && (
                            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                              {d.ip_address}
                            </span>
                          )}
                        </p>
                        {(d.display_os || d.display_browser) && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {d.display_os} {d.display_browser && `• ${d.display_browser}`}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      dir="ltr"
                      onClick={() => handleLogoutDevice(d.id)}
                      disabled={logoutLoading === d.id}
                      className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300
                        text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20
                        transition-colors flex items-center gap-1.5
                        opacity-100 md:opacity-0 md:group-hover:opacity-100
                        focus:opacity-100 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                      title={d.current ? "خروج از این دستگاه" : "خروج از دستگاه"}
                    >
                      {logoutLoading === d.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <LogOut size={16} className="scale-x-[-1]" />
                      )}
                      <span className="hidden sm:inline">
                        {logoutLoading === d.id ? "در حال خروج..." : "خروج"}
                      </span>
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Logout All Button */}
          {!loading && devices.length > 1 && (
            <div className="pt-4 border-t border-gray-200/30 dark:border-white/5">
              <button
                onClick={handleLogoutAll}
                disabled={logoutAllLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium
                  text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                  bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20
                  border border-red-200/50 dark:border-red-800/50
                  transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {logoutAllLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <LogOut size={18} />
                )}
                {logoutAllLoading ? "در حال خروج..." : "خروج از تمام دستگاه‌ها"}
              </button>
            </div>
          )}

          {/* Security Note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/30 dark:border-blue-500/20">
            <Lock size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              در صورت مشاهده دستگاه ناشناس، سریعاً آن را حذف کرده و رمز عبور خود را تغییر دهید.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}