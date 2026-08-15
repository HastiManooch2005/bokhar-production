import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/admin/Sidebar";
import {
  FiUsers,
  FiShoppingCart,
  FiTag,
  FiPackage,
  FiLayout,
} from "react-icons/fi";
import axios from "axios";

// ─── API Setup (فقط برای داشبورد) ──────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// اضافه کردن خودکار توکن JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// مدیریت خطای 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ─── AdminDashboard ─────────────────────────────────────────────
export default function AdminDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // همگام‌سازی activeMenu با URL
  useEffect(() => {
    const pathSegment = location.pathname
      .replace("/admin-dashboard", "")
      .replace(/^\//, "");
    setActiveMenu(pathSegment || "dashboard");
  }, [location]);

  // دریافت داده‌های داشبورد از API
  useEffect(() => {
    const controller = new AbortController();

    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get("/report/dashboard/", {
          signal: controller.signal,
        });
        setDashboardData(response.data);
      } catch (err) {
        if (err.name === "AbortError" || err.name === "CanceledError") return;
        console.error("خطا در دریافت داده‌های داشبورد:", err);
        setError("خطا در بارگذاری داده‌ها. لطفاً دوباره تلاش کنید.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    return () => controller.abort();
  }, []);

  // داده‌های کارت‌ها از API
  const cards = dashboardData
    ? [
        {
          title: "سفارش‌ها",
          icon: <FiShoppingCart size={26} />,
          count: dashboardData.stats?.total_orders || 0,
          color: "from-blue-500 to-cyan-400",
          link: "/admin-dashboard/orders",
        },
        {
          title: "مشتریان",
          icon: <FiUsers size={26} />,
          count: "—",
          color: "from-purple-500 to-pink-400",
          link: "/admin-dashboard/customers",
        },
        {
          title: "تخفیف‌ها",
          icon: <FiTag size={26} />,
          count: "—",
          color: "from-green-500 to-emerald-400",
          link: "/admin-dashboard/discounts",
        },
        {
          title: "خدمات",
          icon: <FiPackage size={26} />,
          count: "—",
          color: "from-orange-500 to-yellow-400",
          link: "/admin-dashboard/services",
        },
      ]
    : [];

  // آخرین سفارش‌ها از API
  const orders = dashboardData?.last_orders?.map((order) => ({
    id: order.id,
    name: order.user__fullname || "—",
    total: `${(order.final_price || 0).toLocaleString("fa-IR")} تومان`,
    status: order.status,
  })) || [];

  const getStatusLabel = (status) => {
    const map = {
      pending: "در انتظار",
      processing: "در حال آماده‌سازی",
      delivered: "تحویل‌شده",
      cancelled: "لغوشده",
      completed: "تکمیل‌شده",
      paid: "پرداخت‌شده",
      ready: "آماده تحویل",
      shipped: "ارسال‌شده",
    };
    return map[status] || status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
      case "completed":
      case "paid":
        return "text-green-400";
      case "cancelled":
        return "text-red-400";
      case "processing":
      case "ready":
        return "text-yellow-400";
      case "shipped":
        return "text-blue-400";
      default:
        return "text-amber-300";
    }
  };

  if (loading) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-lg text-gray-600 dark:text-gray-300">در حال بارگذاری...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-lg text-red-500 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col min-h-screen transition-colors duration-300">
      <div className="flex flex-1">
        <Sidebar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
        />

        <main
          className={`flex-1 p-6 overflow-y-auto text-gray-800 dark:text-gray-200 transition-all duration-300
            ${!isSidebarOpen ? "md:mr-64" : ""}`}
        >
          <h1 className="flex items-center justify-center md:justify-start gap-2 text-2xl font-bold mb-8">
            <FiLayout className="text-2xl" />
            داشبورد مدیریت
          </h1>

          {/* درآمد امروز */}
          {dashboardData?.stats?.today_revenue > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg">
              <p className="text-sm opacity-90">درآمد امروز</p>
              <p className="text-2xl font-bold">
                {dashboardData.stats.today_revenue.toLocaleString("fa-IR")} تومان
              </p>
            </div>
          )}

          {/* کارت‌ها */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
            {cards.map((card, i) => (
              <div
                key={i}
                onClick={() => card.link && navigate(card.link)}
                className={`p-5 rounded-2xl bg-white/30 dark:bg-[#262B40]/50 backdrop-blur-lg 
                border border-sky-200/50 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-[#2d3350]/80 transition-all cursor-pointer shadow-xl 
                hover:scale-[1.03] active:scale-[0.98]`}
              >
                <div
                  className={`w-12 h-12 mb-3 flex items-center justify-center rounded-full 
                  bg-gradient-to-br ${card.color} text-white`}
                >
                  {card.icon}
                </div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{card.title}</h2>
                <p className="text-2xl font-bold mt-2 text-gray-800 dark:text-gray-200">{card.count}</p>
              </div>
            ))}
          </div>

          {/* جدول سفارش‌ها */}
          <div className="bg-white/50 dark:bg-[#262B40]/50 backdrop-blur-lg border border-sky-200/50 dark:border-gray-700/50 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b border-white/10 dark:border-gray-700/30 pb-2">
              آخرین سفارش‌ها
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-right">
                <thead className="text-black dark:text-gray-200 border-b border-white/10 dark:border-gray-700/30">
                  <tr>
                    <th className="p-3">شماره سفارش</th>
                    <th className="p-3">نام مشتری</th>
                    <th className="p-3">مبلغ کل</th>
                    <th className="p-3">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length > 0 ? (
                    orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-white/80 dark:hover:bg-[#2d3350]/60 dark:text-gray-300 transition border-b border-white/5 dark:border-gray-700/20"
                      >
                        <td className="p-3">{order.id}</td>
                        <td className="p-3">{order.name}</td>
                        <td className="p-3">{order.total}</td>
                        <td className={`p-3 ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-6 text-center text-gray-500 dark:text-gray-400">
                        سفارشی یافت نشد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}