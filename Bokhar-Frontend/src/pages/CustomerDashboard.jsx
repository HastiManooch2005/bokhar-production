import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Wallet,
  Package,
  Shield,
  Headphones,
  Info,
  Smartphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { FiSun, FiMoon } from "react-icons/fi";
import { PencilSquareIcon } from "@heroicons/react/24/solid";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import toast from "react-hot-toast";

// ─── API Setup ───
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// ─── Helpers ───
const formatBalance = (rial) => {
  if (rial === null || rial === undefined) return "---";
  const toman = Math.floor(rial / 10);
  return toman.toLocaleString("fa-IR") + " تومان";
};

// ─── Components ───
function QuickCard({ title, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="
        flex flex-col items-center gap-2 p-4 rounded-2xl transition w-full shadow-md hover:shadow-lg
        bg-sky-50 cursor-pointer
        dark:bg-[#262B40]
        border border-sky-200 dark:border-gray-700 shadow-sky-200 dark:shadow-black/40
      "
    >
      <div className="text-gray-700 dark:text-gray-300">{icon}</div>
      <span className="font-medium text-gray-800 dark:text-gray-200">
        {title}
      </span>
    </button>
  );
}

function SettingItem({ title, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex justify-between items-center py-3 px-4 rounded-xl hover:bg-sky-200 dark:hover:bg-[#2d3350] cursor-pointer transition group"
    >
      <div className="flex items-center gap-3">
        <span className="text-gray-600 dark:text-gray-400 group-hover:text-sky-600 dark:group-hover:text-[#8AA1C4] transition">
          {icon}
        </span>
        <span className="text-gray-800 dark:text-gray-200">{title}</span>
      </div>
      <ChevronRight
        className="w-5 h-5 text-gray-400 dark:text-gray-500 rtl:rotate-180"
      />
    </button>
  );
}

export default function CustomersDashboard() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });

  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Theme effect
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Fetch wallet balance on mount
  useEffect(() => {
    const getBalance = async () => {
      try {
        const response = await api.get("/wallet/balance/");
        setBalance(response.data.balance);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        toast.error("خطا در دریافت موجودی");
      } finally {
        setBalanceLoading(false);
      }
    };
    getBalance();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8">
      {/* Profile Header */}
      <div
        className="
          rounded-2xl p-5 flex items-center gap-4 md:mt-16 shadow-md md:max-w-3xl md:mx-auto
          bg-sky-50 border border-sky-200 shadow-sky-200 dark:shadow-black/40
          dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40] dark:border-gray-700
        "
      >
        <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-[#262B40] flex items-center justify-center text-2xl">
          👤
        </div>
        <div className="flex-1">
          <p className="font-semibold text-lg text-gray-900 dark:text-gray-200">
            {user?.fullname || "—"}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.phone || ""}
          </p>
        </div>
        <button
          onClick={() => navigate("/customer-dashboard/edit")}
          className="text-sky-600 dark:text-[#8AA1C4] dark:hover:text-[#7a93b8] cursor-pointer font-medium"
        >
          <PencilSquareIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Wallet */}
      <div
        className="
          mt-5 p-5 rounded-2xl shadow-md md:max-w-3xl md:mx-auto
          bg-sky-50
          dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40]
          border border-sky-200 dark:border-gray-700 shadow-sky-200 dark:shadow-black/40
        "
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <Wallet size={20} />
            کیف پول
          </div>
          <span className="font-semibold text-lg text-gray-900 dark:text-gray-200">
            {balanceLoading ? (
              <span className="text-gray-400 dark:text-gray-500 text-sm font-normal">
                در حال دریافت...
              </span>
            ) : (
              formatBalance(balance)
            )}
          </span>
        </div>
        <button
          onClick={() => navigate("/customer-dashboard/wallet")}
          className="mt-3 w-full bg-sky-600 hover:bg-sky-700 dark:bg-[#8AA1C4] dark:hover:bg-[#7a93b8] text-white py-2 rounded-xl cursor-pointer transition font-medium"
        >
          افزایش موجودی
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-3 mt-5 md:max-w-3xl md:mx-auto ">
        <QuickCard
          title="پیگیری سفارش‌ها"
          onClick={() => navigate("/customer-dashboard/orders-tracking")}
          icon={<Package size={24} className="text-sky-600 dark:text-[#8AA1C4]" />}
        />
      </div>

      {/* Settings */}
      <div
        className="
          mt-5 rounded-2xl p-5 shadow-md space-y-1 md:max-w-3xl md:mx-auto
          bg-sky-50
          dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40]
          border border-sky-200 dark:border-gray-700 shadow-sky-200 dark:shadow-black/40
        "
      >
        <SettingItem
          title="امنیت و حریم خصوصی"
          icon={<Shield size={20} />}
          onClick={() => navigate("/customer-dashboard/privacy")}
        />
        <SettingItem
          title="دستگاه‌ها"
          icon={<Smartphone size={20} />}
          onClick={() => navigate("/customer-dashboard/devices")}
        />
        <SettingItem
          title="پشتیبانی"
          icon={<Headphones size={20} />}
          onClick={() => navigate("/customer-dashboard/support")}
        />
        <SettingItem
          title="درباره خشکشویی افشار"
          icon={<Info size={20} />}
          onClick={() => navigate("/aboutDryCleaning")}
        />
        <SettingItem
          title="درباره رایبان"
          icon={
            <img
              src="/rayban-dark2.png"
              alt="rayban"
              className="h-7 w-7 object-contain"
            />
          }
          onClick={() => navigate("/aboutUs")}
        />
      </div>

      {/* Logout Desktop */}
      <button
        onClick={async () => {
          await logout();
          navigate("/");
        }}
        className="mt-8 mb-20 md:mb-0 hidden md:flex w-full items-center justify-center gap-2 text-red-600 md:max-w-3xl md:mx-auto cursor-pointer font-medium"
      >
        <LogOut size={20} />
        خروج از حساب
      </button>

      {/* Mobile Footer */}
      <div className="mb-20 mt-5 rounded-2xl bottom-0 left-0 right-0 bg-sky-50 dark:bg-[#1a1f2e] shadow-sky-200 dark:shadow-black/40 p-4 flex justify-between items-center shadow-md md:hidden">
        <button
          onClick={async () => {
            await logout();
            navigate("/");
          }}
          className="flex items-center gap-2 text-red-600 font-medium"
        >
          <LogOut size={20} />
          خروج
        </button>

        <button
          onClick={toggleTheme}
          className={`relative w-14 h-8 rounded-full p-1 transition-all duration-300 ${
            theme === "dark" ? "bg-[#8AA1C4]" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white flex items-center justify-center transform transition-transform duration-300 ${
              theme === "dark" ? "translate-x-6" : ""
            }`}
          >
            {theme === "dark" ? (
              <FiMoon size={16} className="text-[#8AA1C4]" />
            ) : (
              <FiSun size={16} className="text-yellow-500" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}