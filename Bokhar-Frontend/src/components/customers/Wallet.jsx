import { Wallet, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const quickAmounts = [50000, 100000, 200000];

// تابع کمکی برای تبدیل اعداد فارسی به انگلیسی
function toEnglishNumber(str) {
  return str.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

export default function WalletPage() {
  const [amount, setAmount] = useState("");
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8">
      <div
        className="
          rounded-2xl shadow-md p-5 md:max-w-3xl md:mx-auto mt-5 md:mt-16 mb-20 md:mb-0
          bg-sky-50 dark:bg-gradient-to-br dark:from-[#1a1f2e] dark:via-[#1e2335] dark:to-[#262B40]
          border border-sky-200 dark:border-gray-700
          shadow-sky-200 dark:shadow-black/40
          transition
        "
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-[#262B40] flex items-center justify-center">
            <Wallet className="text-sky-600 dark:text-[#8AA1C4]" size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-200">
              کیف پول
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              افزایش موجودی کیف پول
            </p>
          </div>

          {/* Back Button - استایل مشابه دکمه ویرایش در داشبورد */}
          <button
            onClick={() => navigate("/customer-dashboard")}
            className="ms-auto w-10 h-10 rounded-full shadow-sm hover:shadow-md cursor-pointer
                          bg-white/80 hover:bg-gray-200 border-sky-300 shadow-sky-200
                           dark:bg-[#262B40] dark:hover:bg-[#2d3350] dark:border-gray-600 dark:shadow-black/40 flex items-center justify-center transition"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Balance - استایل مشابه کارت کیف پول در داشبورد */}
        <div
          className="
          bg-white dark:bg-[#262B40]/60 
          border border-sky-200 dark:border-gray-700 
          rounded-2xl p-4 mb-6 transition
        "
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300">
              <Wallet size={18} />
              <span className="text-sm">موجودی فعلی</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-200 mt-2 mr-1">
            125,000 تومان
          </p>
        </div>

        {/* Quick amounts */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-200">
            انتخاب سریع مبلغ
          </p>
          <div className="grid grid-cols-3 gap-3">
            {quickAmounts.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={`
                  rounded-xl p-3 text-sm font-medium border transition cursor-pointer
                  ${
                    Number(amount) === a
                      ? "bg-sky-600 text-white border-sky-600 dark:bg-[#8AA1C4] dark:border-[#8AA1C4]"
                      : "bg-white dark:bg-[#262B40]/60 text-gray-900 dark:text-gray-200 border-sky-200 dark:border-gray-600 hover:bg-sky-50 dark:hover:bg-[#2d3350]"
                  }
                `}
              >
                {a.toLocaleString()} تومان
              </button>
            ))}
          </div>
        </div>

        {/* Manual input */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-gray-200">
            مبلغ دلخواه
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              const englishValue = toEnglishNumber(e.target.value);
              if (/^\d*$/.test(englishValue)) {
                setAmount(englishValue);
              }
            }}
            placeholder="مثلاً 75000"
            className="
              w-full p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8AA1C4] transition
              bg-white dark:bg-[#262B40]/60 border-sky-200 dark:border-gray-600 
              text-gray-900 dark:text-gray-200
              placeholder:text-gray-400 dark:placeholder:text-gray-500
            "
          />
        </div>

        {/* Pay - استایل مشابه دکمه افزایش موجودی در داشبورد */}
        <button
          disabled={!amount}
          onClick={() => {
            // منطق پرداخت اینجا قرار می‌گیرد
            console.log("پرداخت:", amount);
          }}
          className={`
            w-full rounded-xl p-3 transition font-medium
            ${
              amount
                ? "bg-sky-600 hover:bg-sky-700 text-white dark:bg-[#8AA1C4] dark:hover:bg-[#7a93b8] cursor-pointer"
                : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-[#262B40] dark:text-gray-500"
            }
          `}
        >
          پرداخت و افزایش موجودی
        </button>
      </div>
    </div>
  );
}