import { Package, CheckCircle } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const orderSteps = [
  { label: "در راه خشکشویی", emoji: "🚚" },
  { label: "در صف شستشو", emoji: "🫧" },
  { label: "آماده تحویل", emoji: "📦" },
  { label: "تحویل داده شد", emoji: "✅" },
];

export default function OrderTracking() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const orders = [
    { id: 2458, currentStep: 1 },
    { id: 2461, currentStep: 3 },
    { id: 2462, currentStep: 0 },
  ];

  return (
    <div dir="rtl" className="min-h-screen p-4 md:p-8">
      <div
        className="
          bg-sky-50 dark:bg-gradient-to-br dark:from-sky-800 dark:via-sky-900 dark:to-sky-950
          border border-sky-200 dark:border-sky-700
          rounded-2xl shadow p-4 md:max-w-3xl md:mx-auto md:mt-15 mb-20 md:mb-0
        "
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-500 flex items-center justify-center">
            <Package className="text-orange-600 dark:text-orange-200" size={22} />
          </div>

          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              پیگیری سفارش‌ها
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              وضعیت سفارش‌های شما
            </p>
          </div>

          {/* Back Button */}
          <button
            onClick={() => navigate("/customer-dashboard")}
            className="ms-auto w-10 h-10 rounded-full border shadow-sm hover:shadow-md cursor-pointer
              bg-white/80 hover:bg-gray-200 border-sky-300 shadow-sky-200
               dark:bg-purple-800 dark:hover:bg-purple-900 dark:border-indigo-500 dark:shadow-indigo-500 flex items-center justify-center transition"
          >
            <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="
                bg-sky-50 dark:bg-gradient-to-br dark:from-sky-800 dark:via-sky-900 dark:to-sky-950
                border border-sky-200 dark:border-sky-700
                rounded-2xl p-4
              "
            >
              <div className="flex justify-between items-center mb-4">
                <p className="font-medium text-gray-800 dark:text-gray-100">
                  سفارش #{order.id}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2">
                {orderSteps.map((step, idx) => {
                  const isCompleted = idx < order.currentStep;
                  const isCurrent = idx === order.currentStep;

                  return (
                    <div key={idx} className="flex-1 flex items-center">
                      {/* Circle */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg
                          ${
                            isCompleted
                              ? "bg-green-600 text-white"
                              : isCurrent
                              ? "border-2 border-green-600 text-green-600 animate-pulse"
                              : "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-300"
                          }`}
                      >
                        {isCompleted ? <CheckCircle size={18} /> : step.emoji}
                      </div>

                      {/* Line */}
                      {idx < orderSteps.length - 1 && (
                        <div
                          className={`flex-1 h-1 rounded ${
                            idx < order.currentStep
                              ? "bg-green-600"
                              : "bg-gray-300 dark:bg-gray-700"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step Labels */}
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-300">
                {orderSteps.map((step, idx) => (
                  <span key={idx} className="text-center flex-1">
                    {step.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
